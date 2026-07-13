const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const crypto = require("node:crypto");
const { COMMISSION_RATE, promotionIsLive, promotionDiscount, sellerBreakdown, normalisePhone, mapProviderStatus } = require("./lib/commerce");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();
const ORDER_STATUSES = ["placed", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const PAYMENT_METHODS = ["cash", "mobile-money"];
const MOMO_PROVIDERS = ["mtn", "airtel"];
const PAYMENT_MODE = defineString("PAYMENT_MODE", { default: "sandbox" });
const PAYMENT_BASE_URL = defineString("PAYMENT_BASE_URL", { default: "" });
const PAYMENT_CALLBACK_BASE_URL = defineString("PAYMENT_CALLBACK_BASE_URL", { default: "" });
const MTN_API_KEY = defineSecret("MTN_API_KEY");
const AIRTEL_API_KEY = defineSecret("AIRTEL_API_KEY");
const MTN_WEBHOOK_SECRET = defineSecret("MTN_WEBHOOK_SECRET");
const AIRTEL_WEBHOOK_SECRET = defineSecret("AIRTEL_WEBHOOK_SECRET");
const PAYMENT_SECRETS = [MTN_API_KEY, AIRTEL_API_KEY, MTN_WEBHOOK_SECRET, AIRTEL_WEBHOOK_SECRET];
const SELLER_FULFILMENT_STATUSES = ["awaiting_acceptance", "accepted", "processing", "ready_for_dispatch", "dispatched"];
const DELIVERY_ZONES = {
  kampala_central: { id:"kampala_central", name:"Kampala Central", fee:5000, estimate:"Same day or next day", active:true },
  greater_kampala: { id:"greater_kampala", name:"Greater Kampala & Wakiso", fee:8000, estimate:"1–2 business days", active:true },
  entebbe: { id:"entebbe", name:"Entebbe", fee:10000, estimate:"1–2 business days", active:true },
  uganda_upcountry: { id:"uganda_upcountry", name:"Other Uganda districts", fee:15000, estimate:"2–5 business days", active:true }
};
const PICKUP_POINTS = {
  jdk_kampala_cbd: { id:"jdk_kampala_cbd", name:"JDK Kampala CBD Pickup", address:"Kampala CBD, Uganda", fee:0, estimate:"Ready after fulfilment confirmation", active:true }
};

function requireAuth(request) { if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to continue."); }
function requireAdmin(request) { requireAuth(request); if (request.auth.token.admin !== true) throw new HttpsError("permission-denied", "Administrator access required."); }

function cleanCustomer(value = {}) {
  const customer = { name: String(value.name || "").trim().slice(0,100), phone: String(value.phone || "").trim().slice(0,40), location: String(value.location || "").trim().slice(0,250), note: String(value.note || "").trim().slice(0,500) };
  if (!customer.name || !customer.phone || !customer.location) throw new HttpsError("invalid-argument", "Name, phone and delivery location are required.");
  return customer;
}
async function settleOrderPayment(tx, orderRef, order, actor, providerReference = "") {
  if (order.paymentStatus === "paid") return false;
  const paidAt = new Date().toISOString();
  tx.update(orderRef, { paymentStatus: "paid", paidAt, paymentReference: providerReference || order.paymentReference || "", updatedAt: FieldValue.serverTimestamp() });
  for (const row of order.sellerBreakdown || sellerBreakdown(order.products || [])) {
    const ledgerRef = db.collection("sellerLedger").doc(`${orderRef.id}_${row.sellerId}`);
    tx.set(ledgerRef, { orderId: orderRef.id, sellerId: row.sellerId, gross: row.gross, commission: row.commission, net: row.net, currency: order.currency || "UGX", type: "sale", status: "earned", paymentMethod: order.payment, paymentReference: providerReference || "", createdAt: FieldValue.serverTimestamp(), createdBy: actor });
  }
  const financeRef = db.collection("financeLedger").doc(`commission_${orderRef.id}`);
  tx.set(financeRef, { orderId: orderRef.id, type: "commission", amount: Number(order.platformCommission || 0), currency: order.currency || "UGX", status: "earned", paymentMethod: order.payment, createdAt: FieldValue.serverTimestamp(), createdBy: actor });
  return true;
}



// v23 — payment-provider boundary. Provider credentials remain in Functions secrets.
function paymentSecret(provider) { return provider === "mtn" ? MTN_API_KEY.value() : AIRTEL_API_KEY.value(); }
function webhookSecret(provider) { return provider === "mtn" ? MTN_WEBHOOK_SECRET.value() : AIRTEL_WEBHOOK_SECRET.value(); }
function secureEqual(a, b) { const aa=Buffer.from(String(a||"")); const bb=Buffer.from(String(b||"")); return aa.length===bb.length && crypto.timingSafeEqual(aa,bb); }
function verifyWebhookSignature(provider, rawBody, signature) {
  const secret=webhookSecret(provider); if(!secret) return false;
  const expected=crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return secureEqual(expected, String(signature||"").replace(/^sha256=/i,""));
}
async function startProviderCollection(provider, intentId, intent) {
  const mode=PAYMENT_MODE.value();
  if(mode === "sandbox") return { providerReference:`SANDBOX-${provider.toUpperCase()}-${intentId.slice(0,12)}`, status:"pending", sandbox:true };
  const base=PAYMENT_BASE_URL.value().replace(/\/$/,""); const apiKey=paymentSecret(provider);
  if(!base || !apiKey) throw new HttpsError("failed-precondition", `${provider.toUpperCase()} payment credentials are not configured.`);
  const callbackBase=PAYMENT_CALLBACK_BASE_URL.value().replace(/\/$/,"");
  const response=await fetch(`${base}/${provider}/collections`, { method:"POST", headers:{"content-type":"application/json","authorization":`Bearer ${apiKey}`,"idempotency-key":intentId}, body:JSON.stringify({reference:intentId,amount:intent.amount,currency:intent.currency,phone:normalisePhone(intent.phone),callbackUrl:callbackBase?`${callbackBase}/paymentWebhook?provider=${provider}`:undefined}) });
  const body=await response.json().catch(()=>({})); if(!response.ok) throw new HttpsError("unavailable", `Payment provider rejected the collection request (${response.status}).`);
  return { providerReference:String(body.reference||body.transactionId||intentId).slice(0,160), status:mapProviderStatus(body.status), sandbox:false };
}
async function applyProviderPayment(provider, eventId, providerReference, status, payloadDigest) {
  const eventRef=db.collection("paymentWebhookEvents").doc(`${provider}_${eventId}`);
  return db.runTransaction(async tx=>{
    const eventSnap=await tx.get(eventRef); if(eventSnap.exists) return {duplicate:true};
    const query=await db.collection("paymentIntents").where("providerReference","==",providerReference).limit(1).get();
    if(query.empty) throw new Error("Payment intent not found for provider reference.");
    const intentRef=query.docs[0].ref; const intent=query.docs[0].data(); const orderRef=db.collection("orders").doc(intent.orderId); const orderSnap=await tx.get(orderRef);
    if(!orderSnap.exists) throw new Error("Order not found."); const order=orderSnap.data();
    tx.create(eventRef,{provider,eventId,providerReference,status,payloadDigest,createdAt:FieldValue.serverTimestamp()});
    tx.update(intentRef,{status:status==="paid"?"paid":status==="failed"?"failed":"awaiting_provider",providerStatus:status,lastWebhookEventId:eventId,updatedAt:FieldValue.serverTimestamp()});
    if(status==="paid") await settleOrderPayment(tx,orderRef,order,`webhook:${provider}`,providerReference);
    return {duplicate:false,orderId:intent.orderId,userId:order.userId,status};
  });
}
exports.getDeliveryOptions = onCall(async () => ({
  zones: Object.values(DELIVERY_ZONES).filter(x => x.active),
  pickupPoints: Object.values(PICKUP_POINTS).filter(x => x.active),
  currency: "UGX"
}));

exports.createOrder = onCall(async request => {
  await enforceRateLimit(request, "create_order", 8, 300);
  requireAuth(request);
  const requested = Array.isArray(request.data?.products) ? request.data.products : [];
  if (!requested.length || requested.length > 100) throw new HttpsError("invalid-argument", "Your cart is empty or too large.");
  const customer = cleanCustomer(request.data.customer);
  const payment = String(request.data?.payment || "");
  const mobileMoneyProvider = String(request.data?.mobileMoneyProvider || "");
  const couponCode = String(request.data?.couponCode || "").trim().toUpperCase().slice(0,40);
  const deliveryMethod = String(request.data?.deliveryMethod || "delivery");
  const deliveryZoneId = String(request.data?.deliveryZoneId || "");
  const pickupPointId = String(request.data?.pickupPointId || "");
  if (!["delivery","pickup"].includes(deliveryMethod)) throw new HttpsError("invalid-argument", "Choose delivery or pickup.");
  const logistics = deliveryMethod === "pickup" ? PICKUP_POINTS[pickupPointId] : DELIVERY_ZONES[deliveryZoneId];
  if (!logistics || logistics.active !== true) throw new HttpsError("invalid-argument", "Choose a valid delivery zone or pickup point.");
  const deliveryFee = Number(logistics.fee || 0);
  if (!PAYMENT_METHODS.includes(payment)) throw new HttpsError("invalid-argument", "Unsupported payment method.");
  if (payment === "mobile-money" && !MOMO_PROVIDERS.includes(mobileMoneyProvider)) throw new HttpsError("invalid-argument", "Choose MTN MoMo or Airtel Money.");
  const promoSnap = await db.collection("promotions").where("status", "==", "active").get();
  const livePromos = promoSnap.docs.map(doc => ({ id:doc.id, ref:doc.ref, ...doc.data() })).filter(promotionIsLive);
  const orderRef = db.collection("orders").doc();
  const order = await db.runTransaction(async tx => {
    const lines = [];
    for (const line of requested) {
      const id=String(line.id||""); const quantity=Number(line.quantity);
      if(!id||!Number.isInteger(quantity)||quantity<1||quantity>99) throw new HttpsError("invalid-argument","Invalid cart quantity.");
      const ref=db.collection("products").doc(id); const snap=await tx.get(ref);
      if(!snap.exists) throw new HttpsError("not-found","A product in your cart is no longer available.");
      const product=snap.data(); const stock=Number(product.stock||0); const price=Number(product.price);
      if(product.active!==true||product.approvalStatus!=="approved") throw new HttpsError("failed-precondition",`${product.name||"Product"} is not available.`);
      if(quantity>stock) throw new HttpsError("failed-precondition",`Only ${stock} unit(s) of ${product.name||"this product"} remain.`);
      if(!Number.isFinite(price)||price<=0) throw new HttpsError("data-loss","Invalid catalog price.");
      lines.push({ref,id,quantity,product,price,selectedSize:line.selectedSize||null,selectedColor:line.selectedColor||null});
    }
    const products=lines.map(({id,quantity,product,price,selectedSize,selectedColor})=>({id,quantity,name:product.name,price,image:product.image||"",sellerId:product.sellerId||null,shopName:product.shopName||"",selectedSize,selectedColor}));
    const subtotal=products.reduce((sum,item)=>sum+item.price*item.quantity,0);
    const automatic = livePromos.filter(p=>p.mode==="automatic" && (!p.sellerId || products.some(i=>i.sellerId===p.sellerId))).sort((a,b)=>Number(b.discountValue||0)-Number(a.discountValue||0))[0];
    let coupon = couponCode ? livePromos.find(p=>p.mode==="coupon" && String(p.code||"").toUpperCase()===couponCode) : null;
    if(couponCode && !coupon) throw new HttpsError("failed-precondition","Coupon is invalid or outside its campaign dates.");
    if(coupon && Number(coupon.usageLimit||0)>0 && Number(coupon.redemptions||0)>=Number(coupon.usageLimit)) throw new HttpsError("resource-exhausted","This coupon has reached its redemption limit.");
    const candidates=[automatic,coupon].filter(Boolean).map(p=>({promo:p,discount:promotionDiscount(p, p.sellerId ? products.filter(i=>i.sellerId===p.sellerId).reduce((a,i)=>a+i.price*i.quantity,0) : subtotal)}));
    const applied=candidates.sort((a,b)=>b.discount-a.discount)[0]||null;
    const discount=applied?.discount||0; const merchandiseTotal=subtotal-discount; const total=merchandiseTotal+deliveryFee;
    if(applied?.promo.mode==="coupon") { const fresh=await tx.get(applied.promo.ref); const d=fresh.data(); if(Number(d.usageLimit||0)>0&&Number(d.redemptions||0)>=Number(d.usageLimit)) throw new HttpsError("resource-exhausted","This coupon has reached its redemption limit."); tx.update(applied.promo.ref,{redemptions:FieldValue.increment(1),updatedAt:FieldValue.serverTimestamp()}); }
    const platformCommission=Math.round(merchandiseTotal*COMMISSION_RATE); const breakdown=sellerBreakdown(products); const sellerIds=breakdown.map(r=>r.sellerId); const now=new Date().toISOString();
    const sellerFulfilments=Object.fromEntries(breakdown.map(row=>[row.sellerId,{status:"awaiting_acceptance",trackingNumber:"",carrier:"",updatedAt:now,history:[{status:"awaiting_acceptance",at:now,by:"system"}]}]));
    const promotion=applied?{id:applied.promo.id,name:applied.promo.name||"Promotion",code:applied.promo.code||null,mode:applied.promo.mode,discount}:null;
    const payload={userId:request.auth.uid,customer,deliveryMethod,deliveryZoneId:deliveryMethod==="delivery"?deliveryZoneId:null,pickupPointId:deliveryMethod==="pickup"?pickupPointId:null,deliveryFee,deliveryEstimate:logistics.estimate,deliveryLabel:logistics.name,pickupAddress:deliveryMethod==="pickup"?logistics.address:null,payment,mobileMoneyProvider:payment==="mobile-money"?mobileMoneyProvider:null,paymentStatus:payment==="cash"?"pending":"awaiting_payment",products,subtotal,discount,total,promotion,currency:"UGX",commissionRate:COMMISSION_RATE,platformCommission,sellerProceeds:merchandiseTotal-platformCommission,sellerBreakdown:breakdown,sellerIds,sellerFulfilments,deliveryEvidence:null,status:"placed",statusHistory:[{status:"placed",at:now,by:request.auth.uid}],date:now,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()};
    for(const line of lines) tx.update(line.ref,{stock:FieldValue.increment(-line.quantity),updatedAt:FieldValue.serverTimestamp()});
    tx.create(orderRef,payload);
    if(payment==="mobile-money") tx.create(db.collection("paymentIntents").doc(orderRef.id),{orderId:orderRef.id,userId:request.auth.uid,provider:mobileMoneyProvider,phone:customer.phone,amount:total,currency:"UGX",status:"awaiting_provider",providerReference:null,providerStatus:"not_started",attempts:0,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
    return{id:orderRef.id,...payload};
  });
  return{order,paymentAction:payment==="mobile-money"?{required:true,status:"awaiting_provider",message:"Order reserved. Connect a licensed payment provider before accepting live Mobile Money payments."}:{required:false}};
});

exports.initiateMobileMoneyPayment = onCall({ secrets: PAYMENT_SECRETS }, async request => {
  await enforceRateLimit(request, "payment_initiate", 6, 300); requireAuth(request);
  const orderId=String(request.data?.orderId||"").trim(); const intentRef=db.collection("paymentIntents").doc(orderId); const intentSnap=await intentRef.get();
  if(!intentSnap.exists) throw new HttpsError("not-found","Payment intent not found."); const intent=intentSnap.data();
  if(intent.userId!==request.auth.uid) throw new HttpsError("permission-denied","Payment intent access denied.");
  if(intent.status==="paid") return {orderId,status:"paid",providerReference:intent.providerReference};
  const result=await startProviderCollection(intent.provider, intentRef.id, intent);
  await intentRef.update({providerReference:result.providerReference,providerStatus:result.status,status:result.status==="paid"?"paid":"awaiting_provider",attempts:FieldValue.increment(1),lastInitiatedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
  if(result.status==="paid") { const orderRef=db.collection("orders").doc(orderId); await db.runTransaction(async tx=>{const snap=await tx.get(orderRef);if(!snap.exists)throw new HttpsError("not-found","Order not found.");await settleOrderPayment(tx,orderRef,snap.data(),`provider:${intent.provider}`,result.providerReference);}); }
  return {orderId,provider:intent.provider,providerReference:result.providerReference,status:result.status,sandbox:result.sandbox};
});

exports.paymentWebhook = onRequest({ secrets: PAYMENT_SECRETS }, async (req,res) => {
  try {
    if(req.method!=="POST") return res.status(405).send("Method Not Allowed");
    const provider=String(req.query.provider||"").toLowerCase(); if(!MOMO_PROVIDERS.includes(provider)) return res.status(400).send("Unknown provider");
    const raw=req.rawBody || Buffer.from(JSON.stringify(req.body||{})); const signature=req.get("x-jdk-signature") || req.get("x-signature") || "";
    if(!verifyWebhookSignature(provider,raw,signature)) return res.status(401).send("Invalid signature");
    const body=req.body||{}; const eventId=String(body.eventId||body.id||"").slice(0,160); const providerReference=String(body.reference||body.transactionId||"").slice(0,160); const status=mapProviderStatus(body.status);
    if(!eventId||!providerReference) return res.status(400).send("Missing event identity");
    const digest=crypto.createHash("sha256").update(raw).digest("hex"); const result=await applyProviderPayment(provider,eventId,providerReference,status,digest);
    if(result.userId && status==="paid" && !result.duplicate) await createNotification(result.userId,{title:"Payment confirmed",message:`Mobile Money payment for order ${result.orderId.slice(0,8)} was verified.`,type:"payment",link:`orders.html?order=${result.orderId}`,entityId:result.orderId});
    return res.status(200).json({received:true,duplicate:!!result.duplicate});
  } catch(error) { console.error("paymentWebhook",error); return res.status(500).send("Webhook processing failed"); }
});

exports.reconcilePayment = onCall({ secrets: PAYMENT_SECRETS }, async request => {
  requireAdmin(request); const orderId=String(request.data?.orderId||"").trim(); const ref=db.collection("paymentIntents").doc(orderId); const snap=await ref.get();
  if(!snap.exists) throw new HttpsError("not-found","Payment intent not found."); const intent=snap.data();
  return {orderId,provider:intent.provider,status:intent.status,providerStatus:intent.providerStatus||null,providerReference:intent.providerReference||null,attempts:Number(intent.attempts||0),updatedAt:intent.updatedAt||null};
});

exports.createPromotion = onCall(async request => {
  requireAdmin(request); const d=request.data||{}; const name=String(d.name||"").trim().slice(0,100); const mode=String(d.mode||""); const discountType=String(d.discountType||""); const discountValue=Number(d.discountValue); const code=String(d.code||"").trim().toUpperCase().slice(0,40); const startsAt=String(d.startsAt||""); const endsAt=String(d.endsAt||"");
  if(!name||!["automatic","coupon"].includes(mode)||!["percent","fixed"].includes(discountType)||!Number.isFinite(discountValue)||discountValue<=0) throw new HttpsError("invalid-argument","Complete the promotion fields correctly.");
  if(discountType==="percent"&&discountValue>90) throw new HttpsError("invalid-argument","Percentage discounts cannot exceed 90%."); if(mode==="coupon"&&!code) throw new HttpsError("invalid-argument","Coupon code is required."); if(!Number.isFinite(Date.parse(startsAt))||!Number.isFinite(Date.parse(endsAt))||Date.parse(endsAt)<=Date.parse(startsAt)) throw new HttpsError("invalid-argument","Campaign dates are invalid.");
  const ref=db.collection("promotions").doc(); await ref.set({name,mode,code:mode==="coupon"?code:null,discountType,discountValue,minimumSpend:Math.max(0,Number(d.minimumSpend||0)),usageLimit:Math.max(0,Math.floor(Number(d.usageLimit||0))),redemptions:0,sellerId:String(d.sellerId||"").trim()||null,startsAt,endsAt,status:"active",createdBy:request.auth.uid,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()}); return{id:ref.id};
});
exports.setPromotionStatus = onCall(async request => { requireAdmin(request); const id=String(request.data?.promotionId||""); const status=String(request.data?.status||""); if(!["active","paused","ended"].includes(status)) throw new HttpsError("invalid-argument","Invalid promotion status."); await db.collection("promotions").doc(id).update({status,updatedAt:FieldValue.serverTimestamp()}); return{id,status}; });

exports.cancelOrder = onCall(async request => {
  requireAuth(request); const orderId = String(request.data?.orderId || ""); const ref = db.collection("orders").doc(orderId);
  return db.runTransaction(async tx => { const snap = await tx.get(ref); if (!snap.exists) throw new HttpsError("not-found", "Order not found."); const order=snap.data(); if(order.userId!==request.auth.uid) throw new HttpsError("permission-denied","You cannot cancel this order."); if(!["placed","confirmed"].includes(order.status)) throw new HttpsError("failed-precondition","This order can no longer be cancelled by the customer."); if(order.paymentStatus==="paid") throw new HttpsError("failed-precondition","Paid orders require an administrator refund workflow."); for(const item of order.products||[]) if(item.id) tx.update(db.collection("products").doc(item.id),{stock:FieldValue.increment(Number(item.quantity||0)),updatedAt:FieldValue.serverTimestamp()}); tx.update(ref,{status:"cancelled",statusHistory:FieldValue.arrayUnion({status:"cancelled",at:new Date().toISOString(),by:request.auth.uid}),updatedAt:FieldValue.serverTimestamp()}); return {id:orderId,status:"cancelled"}; });
});

exports.updateOrderStatus = onCall(async request => {
  requireAdmin(request); const orderId=String(request.data?.orderId||""); const status=String(request.data?.status||""); if(!ORDER_STATUSES.includes(status)) throw new HttpsError("invalid-argument","Invalid order status."); const ref=db.collection("orders").doc(orderId);
  await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)throw new HttpsError("not-found","Order not found.");const current=snap.data();if(current.status==="cancelled"&&status!=="cancelled")throw new HttpsError("failed-precondition","Cancelled orders cannot be reopened.");if(status==="delivered"&&current.payment==="cash"&&current.paymentStatus!=="paid") await settleOrderPayment(tx,ref,current,request.auth.uid,"COD");tx.update(ref,{status,statusHistory:FieldValue.arrayUnion({status,at:new Date().toISOString(),by:request.auth.uid}),updatedAt:FieldValue.serverTimestamp()});}); return{id:orderId,status};
});

exports.settlePayment = onCall(async request => {
  requireAdmin(request); const orderId=String(request.data?.orderId||""); const reference=String(request.data?.reference||"").trim().slice(0,120); if(!orderId) throw new HttpsError("invalid-argument","Order ID is required."); const ref=db.collection("orders").doc(orderId);
  const settled=await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)throw new HttpsError("not-found","Order not found.");const order=snap.data();if(order.status==="cancelled")throw new HttpsError("failed-precondition","Cancelled orders cannot be settled.");return settleOrderPayment(tx,ref,order,request.auth.uid,reference||"ADMIN-VERIFIED");}); return{id:orderId,paymentStatus:"paid",settled};
});



exports.updateSellerFulfilment = onCall(async request => {
  requireAuth(request);
  const orderId = String(request.data?.orderId || "");
  const status = String(request.data?.status || "");
  const trackingNumber = String(request.data?.trackingNumber || "").trim().slice(0, 120);
  const carrier = String(request.data?.carrier || "").trim().slice(0, 100);
  if (!orderId || !SELLER_FULFILMENT_STATUSES.includes(status)) throw new HttpsError("invalid-argument", "Invalid fulfilment update.");
  if (status === "dispatched" && (!trackingNumber || !carrier)) throw new HttpsError("invalid-argument", "Carrier and tracking/reference number are required for dispatch.");
  const ref = db.collection("orders").doc(orderId);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref); if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
    const order = snap.data(); if (!(order.sellerIds || []).includes(request.auth.uid)) throw new HttpsError("permission-denied", "This order does not belong to your shop.");
    if (["cancelled", "delivered"].includes(order.status)) throw new HttpsError("failed-precondition", "This order can no longer be updated by the seller.");
    const current = order.sellerFulfilments?.[request.auth.uid] || { status:"awaiting_acceptance", history:[] };
    const allowed = { awaiting_acceptance:["accepted"], accepted:["processing"], processing:["ready_for_dispatch"], ready_for_dispatch:["dispatched"], dispatched:[] };
    if (status !== current.status && !(allowed[current.status] || []).includes(status)) throw new HttpsError("failed-precondition", `Move fulfilment forward from ${current.status || "awaiting_acceptance"}.`);
    const now = new Date().toISOString();
    const next = { ...current, status, trackingNumber: trackingNumber || current.trackingNumber || "", carrier: carrier || current.carrier || "", updatedAt:now, history:[...(current.history || []), {status,at:now,by:request.auth.uid}] };
    const fulfilments = Object.fromEntries((order.sellerIds || []).map(id => [id, order.sellerFulfilments?.[id] || { status:"awaiting_acceptance", trackingNumber:"", carrier:"", updatedAt:order.date || now, history:[{status:"awaiting_acceptance",at:order.date || now,by:"system"}] }]));
    fulfilments[request.auth.uid] = next;
    const states = Object.values(fulfilments).map(row => row.status);
    let orderStatus = order.status;
    if (states.length && states.every(value => value === "dispatched")) orderStatus = "shipped";
    else if (states.some(value => ["processing","ready_for_dispatch","dispatched"].includes(value))) orderStatus = "processing";
    else if (states.every(value => ["accepted","processing","ready_for_dispatch","dispatched"].includes(value))) orderStatus = "confirmed";
    const update = { sellerFulfilments:fulfilments, updatedAt:FieldValue.serverTimestamp() };
    if (orderStatus !== order.status) { update.status = orderStatus; update.statusHistory = FieldValue.arrayUnion({status:orderStatus,at:now,by:"seller-fulfilment"}); }
    tx.update(ref, update);
  });
  return { id:orderId, status };
});

exports.recordDeliveryEvidence = onCall(async request => {
  requireAdmin(request);
  const orderId = String(request.data?.orderId || "");
  const reference = String(request.data?.reference || "").trim().slice(0, 120);
  const note = String(request.data?.note || "").trim().slice(0, 500);
  if (!orderId || !reference) throw new HttpsError("invalid-argument", "Order ID and delivery reference are required.");
  const ref = db.collection("orders").doc(orderId);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref); if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
    const order = snap.data(); if (order.status === "cancelled") throw new HttpsError("failed-precondition", "Cancelled orders cannot be delivered.");
    const now = new Date().toISOString();
    if (order.payment === "cash" && order.paymentStatus !== "paid") await settleOrderPayment(tx, ref, order, request.auth.uid, "COD");
    tx.update(ref, { status:"delivered", deliveryEvidence:{reference,note,recordedBy:request.auth.uid,recordedAt:now}, statusHistory:FieldValue.arrayUnion({status:"delivered",at:now,by:request.auth.uid}), updatedAt:FieldValue.serverTimestamp() });
  });
  return { id:orderId, status:"delivered" };
});

exports.createReview = onCall(async request => {
  requireAuth(request);
  const productId = String(request.data?.productId || "").trim();
  const rating = Number(request.data?.rating);
  const message = String(request.data?.message || "").trim().slice(0, 1000);
  if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5 || message.length < 3)
    throw new HttpsError("invalid-argument", "Choose 1-5 stars and write a review of at least 3 characters.");
  const reviewRef = db.collection("reviews").doc(`${request.auth.uid}_${productId}`);
  const productRef = db.collection("products").doc(productId);
  const delivered = await db.collection("orders").where("userId", "==", request.auth.uid).where("status", "==", "delivered").get();
  const order = delivered.docs.find(doc => (doc.data().products || []).some(item => item.id === productId));
  if (!order) throw new HttpsError("failed-precondition", "Only customers with a delivered purchase can review this product.");
  await db.runTransaction(async tx => {
    const [existing, productSnap] = await Promise.all([tx.get(reviewRef), tx.get(productRef)]);
    if (existing.exists) throw new HttpsError("already-exists", "You have already reviewed this product.");
    if (!productSnap.exists) throw new HttpsError("not-found", "Product not found.");
    const product = productSnap.data();
    const count = Number(product.ratingCount || 0); const total = Number(product.ratingTotal || 0) + rating; const nextCount = count + 1;
    tx.create(reviewRef, { productId, userId: request.auth.uid, orderId: order.id, sellerId: product.sellerId || null, shopName: product.shopName || "", customerName: String(request.auth.token.name || request.auth.token.email || "Verified customer").slice(0,100), rating, message, verifiedPurchase: true, moderationStatus: "published", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    tx.update(productRef, { ratingTotal: total, ratingCount: nextCount, averageRating: Math.round((total / nextCount) * 10) / 10, updatedAt: FieldValue.serverTimestamp() });
  });
  return { id: reviewRef.id, productId, rating, verifiedPurchase: true };
});

exports.moderateReview = onCall(async request => {
  requireAdmin(request);
  const reviewId = String(request.data?.reviewId || ""); const status = String(request.data?.status || "");
  if (!reviewId || !["published", "hidden"].includes(status)) throw new HttpsError("invalid-argument", "Invalid review moderation action.");
  const reviewRef = db.collection("reviews").doc(reviewId);
  await db.runTransaction(async tx => {
    const reviewSnap = await tx.get(reviewRef); if (!reviewSnap.exists) throw new HttpsError("not-found", "Review not found.");
    const review = reviewSnap.data(); if (review.moderationStatus === status) return;
    const productRef = db.collection("products").doc(review.productId); const productSnap = await tx.get(productRef);
    if (productSnap.exists) {
      const product = productSnap.data(); let total = Number(product.ratingTotal || 0); let count = Number(product.ratingCount || 0);
      if (status === "hidden") { total = Math.max(0, total - Number(review.rating || 0)); count = Math.max(0, count - 1); }
      else { total += Number(review.rating || 0); count += 1; }
      tx.update(productRef, { ratingTotal: total, ratingCount: count, averageRating: count ? Math.round((total / count) * 10) / 10 : 0, updatedAt: FieldValue.serverTimestamp() });
    }
    tx.update(reviewRef, { moderationStatus: status, moderatedBy: request.auth.uid, moderatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  });
  return { id: reviewId, status };
});

// v15 — notification fan-out and optional Firebase Cloud Messaging delivery.
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { getMessaging } = require("firebase-admin/messaging");

async function createNotification(userId, payload) {
  if (!userId) return;
  const ref = db.collection("notifications").doc();
  await ref.set({ userId, title:String(payload.title||"JDK Enterprises").slice(0,120), message:String(payload.message||"").slice(0,500), type:String(payload.type||"general"), link:String(payload.link||"notifications.html").slice(0,300), entityId:String(payload.entityId||""), read:false, createdAt:FieldValue.serverTimestamp() });
  const tokenSnap = await db.collection("users").doc(userId).collection("fcmTokens").get();
  const tokens = tokenSnap.docs.map(doc => doc.data().token).filter(Boolean);
  if (!tokens.length) return;
  try {
    const result = await getMessaging().sendEachForMulticast({ tokens, notification:{ title:payload.title||"JDK Enterprises", body:payload.message||"" }, webpush:{ fcmOptions:{ link:payload.link||"notifications.html" } }, data:{ type:String(payload.type||"general"), entityId:String(payload.entityId||"") } });
    const invalid=[]; result.responses.forEach((response,index)=>{ if(!response.success && ["messaging/registration-token-not-registered","messaging/invalid-registration-token"].includes(response.error?.code)) invalid.push(tokenSnap.docs[index].ref); });
    await Promise.all(invalid.map(ref=>ref.delete()));
  } catch (error) { console.error("Push delivery failed", error); }
}

exports.notifyOrderCreated = onDocumentCreated("orders/{orderId}", async event => {
  const order=event.data?.data(); if(!order) return; const id=event.params.orderId;
  const jobs=[createNotification(order.userId,{title:"Order placed",message:`Your order ${id.slice(0,8)} has been received.`,type:"order",link:`orders.html?order=${id}`,entityId:id})];
  for(const sellerId of order.sellerIds||[]) jobs.push(createNotification(sellerId,{title:"New seller order",message:`A new order contains products from your shop.`,type:"seller_order",link:"seller.html",entityId:id}));
  await Promise.all(jobs);
});

exports.notifyOrderUpdated = onDocumentUpdated("orders/{orderId}", async event => {
  const before=event.data?.before.data(), after=event.data?.after.data(); if(!before||!after) return; const id=event.params.orderId; const jobs=[];
  if(before.status!==after.status) jobs.push(createNotification(after.userId,{title:"Order update",message:`Order ${id.slice(0,8)} is now ${String(after.status).replaceAll("_"," ")}.`,type:"order",link:`orders.html?order=${id}`,entityId:id}));
  if(before.paymentStatus!==after.paymentStatus && after.paymentStatus==="paid") jobs.push(createNotification(after.userId,{title:"Payment confirmed",message:`Payment for order ${id.slice(0,8)} has been confirmed.`,type:"payment",link:`orders.html?order=${id}`,entityId:id}));
  const beforeF=before.sellerFulfilments||{}, afterF=after.sellerFulfilments||{};
  for(const sellerId of after.sellerIds||[]) if(beforeF[sellerId]?.status!==afterF[sellerId]?.status) jobs.push(createNotification(after.userId,{title:"Fulfilment update",message:`A seller on order ${id.slice(0,8)} updated fulfilment to ${String(afterF[sellerId]?.status||"").replaceAll("_"," ")}.`,type:"fulfilment",link:`orders.html?order=${id}`,entityId:id}));
  await Promise.all(jobs);
});

exports.notifyProductReview = onDocumentUpdated("products/{productId}", async event => {
  const before=event.data?.before.data(), after=event.data?.after.data(); if(!before||!after||before.approvalStatus===after.approvalStatus) return;
  await createNotification(after.sellerId,{title:`Product ${after.approvalStatus}`,message:`${after.name||"Your product"} was ${after.approvalStatus}.`,type:"product_review",link:"seller.html",entityId:event.params.productId});
});

exports.notifyReviewCreated = onDocumentCreated("reviews/{reviewId}", async event => {
  const review=event.data?.data(); if(!review?.sellerId) return;
  await createNotification(review.sellerId,{title:"New verified review",message:`A verified customer left a ${review.rating}-star review.`,type:"review",link:"seller.html",entityId:review.productId});
});


// v16 — secure real-time buyer/seller conversations and support escalation.
function conversationUnreadField(uid) { return `unreadCounts.${uid}`; }

exports.createConversation = onCall(async request => {
  requireAuth(request);
  const sellerId = String(request.data?.sellerId || "").trim();
  const productId = String(request.data?.productId || "").trim();
  const orderId = String(request.data?.orderId || "").trim();
  const type = String(request.data?.type || "buyer_seller");
  const caller = request.auth.uid;
  let participants = [caller], buyerId = caller, resolvedSellerId = sellerId, title = "Marketplace conversation", context = {};

  if (type === "support") {
    title = "JDK Support";
  } else if (orderId) {
    const orderSnap = await db.collection("orders").doc(orderId).get();
    if (!orderSnap.exists) throw new HttpsError("not-found", "Order not found.");
    const order = orderSnap.data();
    const callerIsBuyer = order.userId === caller, callerIsSeller = (order.sellerIds || []).includes(caller);
    if (!callerIsBuyer && !callerIsSeller && request.auth.token.admin !== true) throw new HttpsError("permission-denied", "You are not part of this order.");
    buyerId = order.userId;
    resolvedSellerId = callerIsSeller ? caller : sellerId;
    if (!resolvedSellerId || !(order.sellerIds || []).includes(resolvedSellerId)) {
      if ((order.sellerIds || []).length === 1) resolvedSellerId = order.sellerIds[0];
      else throw new HttpsError("invalid-argument", "Choose the seller for this order conversation.");
    }
    participants = [buyerId, resolvedSellerId]; title = `Order ${orderId.slice(0,8)}`; context = { orderId };
  } else {
    if (!resolvedSellerId || resolvedSellerId === caller) throw new HttpsError("invalid-argument", "A valid seller is required.");
    const sellerSnap = await db.collection("sellers").doc(resolvedSellerId).get();
    if (!sellerSnap.exists || sellerSnap.data().status !== "active") throw new HttpsError("failed-precondition", "This seller is unavailable.");
    if (productId) {
      const productSnap = await db.collection("products").doc(productId).get();
      if (!productSnap.exists || productSnap.data().sellerId !== resolvedSellerId) throw new HttpsError("invalid-argument", "Product and seller do not match.");
      title = productSnap.data().shopName || productSnap.data().name || "Seller conversation"; context.productId = productId;
    }
    participants = [caller, resolvedSellerId];
  }
  participants = [...new Set(participants)];
  const key = type === "support" ? `support_${caller}` : orderId ? `order_${orderId}_${resolvedSellerId}` : `seller_${caller}_${resolvedSellerId}_${productId || "general"}`;
  const ref = db.collection("conversations").doc(key);
  await ref.set({ type, participantIds:participants, buyerId, sellerId:resolvedSellerId || null, title, context, supportStatus:type === "support" ? "open" : "none", lastMessage:"", lastMessageAt:FieldValue.serverTimestamp(), unreadCounts:Object.fromEntries(participants.map(id=>[id,0])), createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() }, { merge:true });
  return { id:ref.id };
});

exports.sendConversationMessage = onCall(async request => {
  await enforceRateLimit(request, "send_message", 40, 60);
  requireAuth(request);
  const conversationId = String(request.data?.conversationId || "").trim();
  const text = String(request.data?.text || "").trim().slice(0,2000);
  if (!conversationId || !text) throw new HttpsError("invalid-argument", "Write a message before sending.");
  const ref = db.collection("conversations").doc(conversationId);
  const messageRef = ref.collection("messages").doc();
  let recipients = [];
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref); if (!snap.exists) throw new HttpsError("not-found", "Conversation not found.");
    const conversation = snap.data(); if (!(conversation.participantIds || []).includes(request.auth.uid) && request.auth.token.admin !== true) throw new HttpsError("permission-denied", "You are not part of this conversation.");
    recipients = (conversation.participantIds || []).filter(id => id !== request.auth.uid);
    const unread = { ...(conversation.unreadCounts || {}) }; recipients.forEach(id => unread[id] = Number(unread[id] || 0) + 1); unread[request.auth.uid] = 0;
    tx.create(messageRef, { senderId:request.auth.uid, text, createdAt:FieldValue.serverTimestamp(), type:"text" });
    tx.update(ref, { lastMessage:text.slice(0,250), lastMessageAt:FieldValue.serverTimestamp(), lastSenderId:request.auth.uid, unreadCounts:unread, updatedAt:FieldValue.serverTimestamp() });
  });
  await Promise.all(recipients.map(uid => createNotification(uid,{ title:"New message", message:text.slice(0,120), type:"message", link:`chat.html?conversation=${conversationId}`, entityId:conversationId })));
  return { id:messageRef.id };
});

exports.markConversationRead = onCall(async request => {
  requireAuth(request); const conversationId = String(request.data?.conversationId || ""); const ref = db.collection("conversations").doc(conversationId);
  await db.runTransaction(async tx => { const snap=await tx.get(ref); if(!snap.exists) throw new HttpsError("not-found","Conversation not found."); const row=snap.data(); if(!(row.participantIds||[]).includes(request.auth.uid) && request.auth.token.admin !== true) throw new HttpsError("permission-denied","Conversation access denied."); const unread={...(row.unreadCounts||{}),[request.auth.uid]:0}; tx.update(ref,{unreadCounts:unread,updatedAt:FieldValue.serverTimestamp()}); });
  return { id:conversationId, read:true };
});

exports.escalateConversation = onCall(async request => {
  requireAuth(request); const conversationId=String(request.data?.conversationId||""); const reason=String(request.data?.reason||"").trim().slice(0,500); const ref=db.collection("conversations").doc(conversationId);
  await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)throw new HttpsError("not-found","Conversation not found.");const row=snap.data();if(!(row.participantIds||[]).includes(request.auth.uid))throw new HttpsError("permission-denied","Conversation access denied.");tx.update(ref,{supportStatus:"escalated",escalationReason:reason,escalatedBy:request.auth.uid,escalatedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});});
  const admins=await db.collection("users").where("admin","==",true).get(); await Promise.all(admins.docs.map(doc=>createNotification(doc.id,{title:"Support escalation",message:`A marketplace conversation needs admin support. ${reason}`.slice(0,500),type:"support",link:`chat.html?conversation=${conversationId}`,entityId:conversationId})));
  return { id:conversationId, supportStatus:"escalated" };
});

// v17 — trust operations: disputes, case evidence, admin support handling and refunds.
const CASE_STATUSES = ["open", "investigating", "resolved", "closed"];
const CASE_RESOLUTIONS = ["none", "customer_supported", "seller_supported", "mutual_resolution", "refund_issued", "no_action"];

exports.createDispute = onCall(async request => {
  requireAuth(request);
  const orderId = String(request.data?.orderId || "").trim();
  const conversationId = String(request.data?.conversationId || "").trim();
  const reason = String(request.data?.reason || "").trim().slice(0, 1000);
  if (!orderId || !reason) throw new HttpsError("invalid-argument", "Order and dispute reason are required.");
  const orderSnap = await db.collection("orders").doc(orderId).get();
  if (!orderSnap.exists) throw new HttpsError("not-found", "Order not found.");
  const order = orderSnap.data();
  if (order.userId !== request.auth.uid && !(order.sellerIds || []).includes(request.auth.uid)) throw new HttpsError("permission-denied", "You are not part of this order.");
  const caseRef = db.collection("supportCases").doc(`order_${orderId}`);
  await db.runTransaction(async tx => {
    const existing = await tx.get(caseRef);
    if (existing.exists && !["resolved", "closed"].includes(existing.data().status)) throw new HttpsError("already-exists", "An active case already exists for this order.");
    tx.set(caseRef, { orderId, conversationId: conversationId || null, openedBy:request.auth.uid, customerId:order.userId, sellerIds:order.sellerIds || [], participantIds:[...new Set([order.userId, ...(order.sellerIds || [])])], reason, status:"open", priority:"normal", resolution:"none", refundStatus:"none", assignedAdminId:null, createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() });
    if (conversationId) tx.set(db.collection("conversations").doc(conversationId), { supportStatus:"escalated", caseId:caseRef.id, updatedAt:FieldValue.serverTimestamp() }, { merge:true });
  });
  const admins = await db.collection("users").where("admin", "==", true).get();
  await Promise.all(admins.docs.map(doc => createNotification(doc.id,{title:"New marketplace dispute",message:`Order ${orderId.slice(0,8)} requires trust review.`,type:"dispute",link:"admin.html",entityId:caseRef.id})));
  return { id:caseRef.id, status:"open" };
});

exports.addCaseEvidence = onCall(async request => {
  requireAuth(request);
  const caseId=String(request.data?.caseId||"").trim(); const note=String(request.data?.note||"").trim().slice(0,2000); const url=String(request.data?.url||"").trim().slice(0,1000);
  if(!caseId || (!note && !url)) throw new HttpsError("invalid-argument","Add a note or evidence URL.");
  if(url && !/^https:\/\//i.test(url)) throw new HttpsError("invalid-argument","Evidence links must use HTTPS.");
  const caseRef=db.collection("supportCases").doc(caseId), evidenceRef=caseRef.collection("evidence").doc();
  await db.runTransaction(async tx=>{const snap=await tx.get(caseRef);if(!snap.exists)throw new HttpsError("not-found","Support case not found.");const row=snap.data();if(!(row.participantIds||[]).includes(request.auth.uid)&&request.auth.token.admin!==true)throw new HttpsError("permission-denied","Case access denied.");if(row.status==="closed")throw new HttpsError("failed-precondition","This case is closed.");tx.create(evidenceRef,{submittedBy:request.auth.uid,note,url:url||null,createdAt:FieldValue.serverTimestamp()});tx.update(caseRef,{updatedAt:FieldValue.serverTimestamp()});});
  return { id:evidenceRef.id };
});

exports.resolveSupportCase = onCall(async request => {
  requireAdmin(request);
  const caseId=String(request.data?.caseId||"").trim(); const status=String(request.data?.status||""); const resolution=String(request.data?.resolution||"none"); const adminNote=String(request.data?.adminNote||"").trim().slice(0,2000);
  if(!CASE_STATUSES.includes(status)||!CASE_RESOLUTIONS.includes(resolution))throw new HttpsError("invalid-argument","Invalid case decision.");
  const ref=db.collection("supportCases").doc(caseId); const snap=await ref.get(); if(!snap.exists)throw new HttpsError("not-found","Support case not found."); const row=snap.data();
  await ref.update({status,resolution,adminNote,assignedAdminId:request.auth.uid,resolvedAt:["resolved","closed"].includes(status)?FieldValue.serverTimestamp():null,updatedAt:FieldValue.serverTimestamp()});
  await Promise.all((row.participantIds||[]).map(uid=>createNotification(uid,{title:"Support case update",message:`Case ${caseId.slice(0,12)} is now ${status.replaceAll("_"," ")}.`,type:"dispute",link:"support.html",entityId:caseId})));
  return {id:caseId,status,resolution};
});

exports.issueOrderRefund = onCall(async request => {
  requireAdmin(request);
  const caseId=String(request.data?.caseId||"").trim(); const reference=String(request.data?.reference||"").trim().slice(0,120); const note=String(request.data?.note||"").trim().slice(0,1000);
  if(!caseId||!reference)throw new HttpsError("invalid-argument","Case and refund reference are required.");
  const caseRef=db.collection("supportCases").doc(caseId);
  const result=await db.runTransaction(async tx=>{const caseSnap=await tx.get(caseRef);if(!caseSnap.exists)throw new HttpsError("not-found","Support case not found.");const supportCase=caseSnap.data();const orderRef=db.collection("orders").doc(supportCase.orderId);const orderSnap=await tx.get(orderRef);if(!orderSnap.exists)throw new HttpsError("not-found","Order not found.");const order=orderSnap.data();if(order.paymentStatus!=="paid")throw new HttpsError("failed-precondition","Only paid orders can be refunded.");if(order.refundStatus==="refunded")throw new HttpsError("already-exists","This order was already refunded.");
    for(const row of order.sellerBreakdown||sellerBreakdown(order.products||[])){tx.set(db.collection("sellerLedger").doc(`refund_${orderRef.id}_${row.sellerId}`),{orderId:orderRef.id,caseId,sellerId:row.sellerId,gross:-row.gross,commission:-row.commission,net:-row.net,currency:order.currency||"UGX",type:"refund",status:"posted",reference,createdAt:FieldValue.serverTimestamp(),createdBy:request.auth.uid});}
    tx.set(db.collection("financeLedger").doc(`refund_commission_${orderRef.id}`),{orderId:orderRef.id,caseId,type:"commission_refund",amount:-Number(order.platformCommission||0),currency:order.currency||"UGX",status:"posted",reference,createdAt:FieldValue.serverTimestamp(),createdBy:request.auth.uid});
    tx.update(orderRef,{paymentStatus:"refunded",refundStatus:"refunded",refundReference:reference,refundNote:note,refundedAt:FieldValue.serverTimestamp(),refundedBy:request.auth.uid,updatedAt:FieldValue.serverTimestamp()});
    tx.update(caseRef,{status:"resolved",resolution:"refund_issued",refundStatus:"refunded",refundReference:reference,adminNote:note,assignedAdminId:request.auth.uid,resolvedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()}); return {orderId:orderRef.id,userId:order.userId};});
  await createNotification(result.userId,{title:"Refund recorded",message:`A refund was recorded for order ${result.orderId.slice(0,8)}. Reference: ${reference}`,type:"refund",link:`orders.html?order=${result.orderId}`,entityId:result.orderId});
  return {id:result.orderId,paymentStatus:"refunded",caseId};
});

// v18 — privacy-conscious marketplace analytics and growth reporting.
const ANALYTICS_EVENTS = ["page_view", "product_view", "search", "add_to_cart", "wishlist", "checkout_started"];
exports.trackMarketplaceEvent = onCall(async request => {
  await enforceRateLimit(request, "analytics", 120, 60);
  const type = String(request.data?.type || "").trim();
  if (!ANALYTICS_EVENTS.includes(type)) throw new HttpsError("invalid-argument", "Unsupported analytics event.");
  const productId = String(request.data?.productId || "").trim().slice(0, 120) || null;
  const sellerId = String(request.data?.sellerId || "").trim().slice(0, 128) || null;
  const query = String(request.data?.query || "").trim().toLowerCase().slice(0, 120) || null;
  const page = String(request.data?.page || "").trim().slice(0, 120) || null;
  const sessionId = String(request.data?.sessionId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || null;
  await db.collection("analyticsEvents").add({ type, productId, sellerId, query, page, sessionId, userId:request.auth?.uid || null, createdAt:FieldValue.serverTimestamp() });
  return { recorded:true };
});

function analyticsSummary(events, orders, products, sellerId = null) {
  const relevantOrders = sellerId ? orders.filter(o => (o.sellerIds || []).includes(sellerId)) : orders;
  const relevantProducts = sellerId ? products.filter(p => p.sellerId === sellerId) : products;
  const relevantEvents = sellerId ? events.filter(e => e.sellerId === sellerId || relevantProducts.some(p => p.id === e.productId)) : events;
  const count = type => relevantEvents.filter(e => e.type === type).length;
  const productViews = new Map(); relevantEvents.filter(e=>e.type === "product_view" && e.productId).forEach(e=>productViews.set(e.productId,(productViews.get(e.productId)||0)+1));
  const productSales = new Map(); relevantOrders.filter(o=>!["cancelled"].includes(o.status)).forEach(o=>(o.products||[]).forEach(p=>{ if(!sellerId || p.sellerId===sellerId) productSales.set(p.id || p.productId,(productSales.get(p.id || p.productId)||0)+Number(p.quantity||1)); }));
  const topProducts = relevantProducts.map(p=>({ id:p.id,name:p.name||"Product",views:productViews.get(p.id)||0,unitsSold:productSales.get(p.id)||0,stock:Number(p.stock||0) })).sort((a,b)=>(b.unitsSold-a.unitsSold)||(b.views-a.views)).slice(0,10);
  const searches = new Map(); relevantEvents.filter(e=>e.type==="search"&&e.query).forEach(e=>searches.set(e.query,(searches.get(e.query)||0)+1));
  const gross = relevantOrders.filter(o=>o.paymentStatus==="paid").reduce((s,o)=>s+Number(o.total||0),0);
  const views=count("product_view"), carts=count("add_to_cart");
  return { metrics:{ productViews:views, addToCarts:carts, checkoutStarts:count("checkout_started"), orders:relevantOrders.length, paidGross:gross, viewToCartRate:views ? Number((carts/views*100).toFixed(1)) : 0 }, topProducts, topSearches:[...searches.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([query,count])=>({query,count})) };
}

exports.getMarketplaceAnalytics = onCall(async request => {
  requireAdmin(request);
  const [eventsSnap, ordersSnap, productsSnap] = await Promise.all([db.collection("analyticsEvents").orderBy("createdAt","desc").limit(10000).get(), db.collection("orders").get(), db.collection("products").get()]);
  return analyticsSummary(eventsSnap.docs.map(d=>({id:d.id,...d.data()})), ordersSnap.docs.map(d=>({id:d.id,...d.data()})), productsSnap.docs.map(d=>({id:d.id,...d.data()})));
});
exports.getSellerAnalytics = onCall(async request => {
  requireAuth(request);
  const sellerSnap = await db.collection("sellers").doc(request.auth.uid).get(); if(!sellerSnap.exists) throw new HttpsError("permission-denied","Seller account required.");
  const [eventsSnap, ordersSnap, productsSnap] = await Promise.all([db.collection("analyticsEvents").where("sellerId","==",request.auth.uid).limit(5000).get(), db.collection("orders").where("sellerIds","array-contains",request.auth.uid).get(), db.collection("products").where("sellerId","==",request.auth.uid).get()]);
  return analyticsSummary(eventsSnap.docs.map(d=>({id:d.id,...d.data()})), ordersSnap.docs.map(d=>({id:d.id,...d.data()})), productsSnap.docs.map(d=>({id:d.id,...d.data()})), request.auth.uid);
});


// v22 — privacy-bounded client diagnostics. No stack traces, form values or customer data are accepted.
exports.reportClientError = onCall(async request => {
  await enforceRateLimit(request, "client_error", 12, 300);
  const type = String(request.data?.type || "client_error").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50);
  const message = String(request.data?.message || "Unknown client error").slice(0, 500);
  const page = String(request.data?.page || "").slice(0, 120);
  await db.collection("clientErrors").add({ type, message, page, userId: request.auth?.uid || null, createdAt: FieldValue.serverTimestamp() });
  return { recorded: true };
});
