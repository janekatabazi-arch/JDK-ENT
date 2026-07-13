/* JDK Enterprises Spark-mode adapter — Auth + Firestore + Hosting only. */
(() => {
  const B = window.JDKBackend;
  if (!B) return;
  const ts = () => firebase.firestore.FieldValue.serverTimestamp();
  const money = n => Math.max(0, Math.round(Number(n || 0)));
  const deliveryOptions = {
    zones: [
      { id:"kampala-central", name:"Kampala Central", fee:5000, estimate:"Same day to 1 day" },
      { id:"greater-kampala", name:"Greater Kampala & Wakiso", fee:8000, estimate:"1–2 days" },
      { id:"entebbe", name:"Entebbe", fee:10000, estimate:"1–2 days" },
      { id:"other-uganda", name:"Other Uganda districts", fee:15000, estimate:"2–5 days" }
    ],
    pickupPoints: [{ id:"jdk-kampala-cbd", name:"JDK Kampala CBD pickup", fee:0, estimate:"Ready after confirmation" }]
  };

  B.storage = null;
  B.functions = null;
  B.sparkMode = true;
  B.isAdmin = async function() {
    const user = await this.getUser();
    if (!user || !this.db) return false;
    const snap = await this.db.collection("admins").doc(user.uid).get();
    return snap.exists && snap.data()?.active === true;
  };
  B.requireAdmin = async function() { if (!await this.isAdmin()) throw new Error("Administrator access required."); return this.auth.currentUser; };
  B.uploadProductImage = async function() { throw new Error("Free launch mode uses public HTTPS image URLs. Paste an image URL instead of uploading a file."); };
  B.getDeliveryOptions = async function() { return deliveryOptions; };

  B.saveOrder = async function(order) {
    const user = await this.getUser();
    if (!user || !this.db) throw new Error("Sign in before placing an order.");
    const cart = order.products || [];
    if (!cart.length) throw new Error("Your cart is empty.");
    let subtotal = 0; const products = []; const sellerIds = new Set();
    for (const item of cart) {
      const snap = await this.db.collection("products").doc(String(item.id)).get();
      const product = snap.exists ? snap.data() : JDKStore.items.find(p => String(p.id) === String(item.id));
      if (!product || product.active === false || (product.approvalStatus && product.approvalStatus !== "approved")) throw new Error(`${item.name || "A product"} is unavailable.`);
      const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
      const stock = Number(product.stock ?? 999999);
      if (quantity > stock) throw new Error(`Only ${stock} unit(s) of ${product.name} are available.`);
      const price = money(product.price); subtotal += price * quantity;
      if (product.sellerId) sellerIds.add(product.sellerId);
      products.push({ id:String(item.id), name:product.name, image:product.image || "", price, quantity, sellerId:product.sellerId || "", shopName:product.shopName || "JDK Enterprises", selectedSize:item.selectedSize || null, selectedColor:item.selectedColor || null });
    }
    const zone = deliveryOptions.zones.find(z => z.id === order.deliveryZoneId);
    const pickup = deliveryOptions.pickupPoints.find(p => p.id === order.pickupPointId);
    const deliveryFee = order.deliveryMethod === "pickup" ? money(pickup?.fee) : money(zone?.fee);
    if (order.deliveryMethod === "delivery" && !zone) throw new Error("Choose a valid delivery zone.");
    if (order.deliveryMethod === "pickup" && !pickup) throw new Error("Choose a valid pickup point.");
    const ref = this.db.collection("orders").doc();
    const payload = { userId:user.uid, customer:order.customer, products, sellerIds:[...sellerIds], subtotal, discount:0, deliveryFee, total:subtotal + deliveryFee, payment:order.payment, mobileMoneyProvider:order.mobileMoneyProvider || null, paymentStatus:"pending", paymentMode:"manual_confirmation", deliveryMethod:order.deliveryMethod, deliveryZoneId:order.deliveryZoneId || null, pickupPointId:order.pickupPointId || null, status:"placed", statusHistory:[{status:"placed", at:new Date().toISOString()}], date:new Date().toISOString(), createdAt:ts(), updatedAt:ts() };
    await ref.set(payload);
    const saved = { id:ref.id, ...payload }; JDKOrders.save(saved); return saved;
  };
  B.initiateMobileMoneyPayment = async function(orderId) { return { orderId, status:"pending", sandbox:false, manual:true, message:"Order created. JDK will confirm Mobile Money payment manually." }; };
  B.cancelOrder = async function(orderId) {
    const user = await this.getUser(); if (!user) throw new Error("Sign in first.");
    const ref = this.db.collection("orders").doc(orderId); const snap = await ref.get();
    if (!snap.exists || snap.data().userId !== user.uid) throw new Error("Order not found.");
    if (!["placed","confirmed"].includes(snap.data().status)) throw new Error("This order can no longer be cancelled online.");
    await ref.update({ status:"cancelled", updatedAt:ts(), statusHistory:firebase.firestore.FieldValue.arrayUnion({status:"cancelled", at:new Date().toISOString()}) });
    return { id:orderId, status:"cancelled" };
  };
  B.updateOrderStatus = async function(orderId, status) { await this.requireAdmin(); await this.db.collection("orders").doc(orderId).update({ status, updatedAt:ts(), statusHistory:firebase.firestore.FieldValue.arrayUnion({status, at:new Date().toISOString()}) }); return {id:orderId,status}; };
  B.recordDeliveryEvidence = async function(orderId, reference, note="") { await this.requireAdmin(); await this.db.collection("orders").doc(orderId).update({ deliveryEvidence:{reference:String(reference||"").slice(0,120),note:String(note||"").slice(0,500),recordedAt:new Date().toISOString()}, updatedAt:ts() }); return {id:orderId}; };
  B.settlePayment = async function(orderId, reference) { await this.requireAdmin(); await this.db.collection("orders").doc(orderId).update({ paymentStatus:"paid", paymentReference:String(reference||"").slice(0,120), paidAt:ts(), updatedAt:ts() }); return {id:orderId,paymentStatus:"paid"}; };
  B.reconcilePayment = async function(orderId) { await this.requireAdmin(); const snap=await this.db.collection("orders").doc(orderId).get(); return {id:orderId, ...(snap.data()||{})}; };
  B.getSellerEarnings = async function() { return []; };
  B.updateSellerFulfilment = async function(orderId, status, trackingNumber="", carrier="") { const user=await this.getUser(); if(!user) throw new Error("Seller sign-in required."); const ref=this.db.collection("orders").doc(orderId); const snap=await ref.get(); if(!snap.exists || !(snap.data().sellerIds||[]).includes(user.uid)) throw new Error("Seller order not found."); const current=snap.data().sellerFulfilments||{}; current[user.uid]={status,trackingNumber:String(trackingNumber).slice(0,120),carrier:String(carrier).slice(0,120),updatedAt:new Date().toISOString()}; await ref.update({sellerFulfilments:current,updatedAt:ts()}); return {id:orderId,status}; };

  B.createReview = async function({productId,rating,message}) { const user=await this.getUser(); if(!user) throw new Error("Sign in before reviewing."); const n=Math.floor(Number(rating)); const text=String(message||"").trim().slice(0,1000); if(n<1||n>5||!text) throw new Error("Add a 1–5 star rating and review."); const profile=JDKCustomer.get?.()||{}; const ref=this.db.collection("reviews").doc(`${user.uid}_${productId}`); await ref.set({userId:user.uid,productId:String(productId),customerName:profile.name||"Customer",rating:n,message:text,moderationStatus:"published",createdAt:ts(),updatedAt:ts()},{merge:true}); return {id:ref.id}; };
  B.moderateReview = async function(reviewId,status) { await this.requireAdmin(); await this.db.collection("reviews").doc(reviewId).update({moderationStatus:status,updatedAt:ts()}); return {id:reviewId,status}; };

  B.createConversation = async function({sellerId="",productId="",orderId="",type="buyer_seller"}={}) { const user=await this.getUser(); if(!user) throw new Error("Sign in to start a conversation."); let participants=[user.uid]; let title="JDK Support"; if(type==="support"){ const admins=await this.db.collection("admins").where("active","==",true).limit(1).get(); if(!admins.empty) participants.push(admins.docs[0].id); } else if(orderId){ const order=await this.db.collection("orders").doc(orderId).get(); if(!order.exists || !((order.data().sellerIds||[]).includes(user.uid)||order.data().userId===user.uid)) throw new Error("Order conversation unavailable."); participants=[order.data().userId,...(order.data().sellerIds||[])]; title=`Order ${orderId.slice(0,8)}`; } else { if(!sellerId) throw new Error("Seller unavailable."); participants.push(sellerId); title="Product conversation"; }
    participants=[...new Set(participants)]; const key=[...participants].sort().join("_")+`_${orderId||productId||type}`; const id=key.replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,500); const ref=this.db.collection("conversations").doc(id); await ref.set({participantIds:participants,title,type,productId:productId||null,orderId:orderId||null,supportStatus:"open",lastMessage:"Conversation started",lastMessageAt:ts(),createdAt:ts()},{merge:true}); return {id,title,type}; };
  B.sendMessage = async function(conversationId,text) { const user=await this.getUser(); const clean=String(text||"").trim().slice(0,2000); if(!user||!clean) throw new Error("Enter a message."); const ref=this.db.collection("conversations").doc(conversationId); const snap=await ref.get(); if(!snap.exists || !(snap.data().participantIds||[]).includes(user.uid)) throw new Error("Conversation unavailable."); await ref.collection("messages").add({senderId:user.uid,text:clean,createdAt:ts()}); await ref.update({lastMessage:clean.slice(0,160),lastMessageAt:ts()}); return true; };
  B.markConversationRead = async function(){ return true; };
  B.escalateConversation = async function(conversationId,reason="") { const user=await this.getUser(); if(!user) throw new Error("Sign in first."); await this.db.collection("conversations").doc(conversationId).update({supportStatus:"escalated",supportReason:String(reason).slice(0,500),updatedAt:ts()}); return true; };
  B.trackEvent = async function(){ return false; };
  B.registerPushNotifications = async function(){ throw new Error("Web push is disabled in the free launch build. In-app order and message data remain available."); };
  B.createPromotion = async function(){ throw new Error("Server-priced promotions are disabled in the free launch build."); };
  B.setPromotionStatus = B.createPromotion;
  B.createDispute = B.addCaseEvidence = B.resolveSupportCase = B.issueOrderRefund = async function(){ throw new Error("Automated disputes/refunds are disabled in free launch mode. Contact JDK Support for manual handling."); };
  B.getMarketplaceAnalytics = async function(){ throw new Error("Server analytics are disabled in free launch mode."); };
  B.getSellerAnalytics = B.getMarketplaceAnalytics;
})();
