const adminGate = document.getElementById("adminGate");
const adminWorkspace = document.getElementById("adminWorkspace");
const adminError = document.getElementById("adminError");
let adminData = null;

function adminSafe(value) { const el = document.createElement("span"); el.textContent = String(value ?? ""); return el.innerHTML; }
function adminMoney(value) { return typeof window.formatCurrency === "function" ? formatCurrency(Number(value || 0)) : `UGX ${Number(value || 0).toLocaleString()}`; }

function renderAdmin(data) {
  adminData = data;
  document.getElementById("pendingCount").textContent = data.stats.pending;
  document.getElementById("approvedCount").textContent = data.stats.approved;
  document.getElementById("sellerCount").textContent = data.stats.sellers;
  document.getElementById("orderCount").textContent = data.stats.orders;
  document.getElementById("revenueTotal").textContent = adminMoney(data.stats.revenue);
  document.getElementById("paidVolume").textContent = adminMoney(data.stats.paidVolume);
  document.getElementById("commissionEarned").textContent = adminMoney(data.stats.commissionEarned);
  document.getElementById("awaitingPayments").textContent = data.orders.filter(order => order.paymentStatus === "awaiting_payment").length;
  document.getElementById("openCaseCount").textContent = data.cases.filter(row => ["open","investigating"].includes(row.status)).length;
  document.getElementById("escalationCount").textContent = data.escalations.length;
  document.getElementById("refundCount").textContent = data.cases.filter(row => row.refundStatus === "refunded").length;
  document.getElementById("promotionList").innerHTML = data.promotions?.length ? data.promotions.map(p => `<article class="adminOrderCard"><div><strong>${adminSafe(p.name)}</strong><span>${adminSafe(p.mode)} · ${p.discountType === "percent" ? adminSafe(p.discountValue)+"%" : adminMoney(p.discountValue)} ${p.code ? "· "+adminSafe(p.code) : ""}</span><small>${adminSafe(p.startsAt)} → ${adminSafe(p.endsAt)} · ${adminSafe(p.redemptions||0)} redemptions</small></div><select data-promo-status="${adminSafe(p.id)}"><option value="active">Active</option><option value="paused">Paused</option><option value="ended">Ended</option></select></article>`).join("") : '<p class="sellerEmpty">No campaigns yet.</p>';
  document.querySelectorAll("[data-promo-status]").forEach(el => el.value = data.promotions.find(p => p.id === el.dataset.promoStatus)?.status || "active");
  document.getElementById("adminCases").innerHTML = data.cases.length ? data.cases.map(row => `<article class="adminOrderCard"><div><strong>Case ${adminSafe(row.id)}</strong><span>Order ${adminSafe(row.orderId || "Unknown")} · ${adminSafe(row.status || "open")}</span><small>${adminSafe(row.reason || "No reason supplied")}</small>${row.adminNote ? `<small>Admin note: ${adminSafe(row.adminNote)}</small>` : ""}</div><div><select data-case-status="${adminSafe(row.id)}"><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select><select data-case-resolution="${adminSafe(row.id)}"><option value="none">No resolution</option><option value="customer_supported">Customer supported</option><option value="seller_supported">Seller supported</option><option value="mutual_resolution">Mutual resolution</option><option value="no_action">No action</option></select><button class="sellerSecondary" data-save-case="${adminSafe(row.id)}">Save case decision</button>${row.refundStatus !== "refunded" ? `<button class="adminReject" data-refund-case="${adminSafe(row.id)}">Record refund</button>` : `<small>Refunded · ${adminSafe(row.refundReference || "")}</small>`}${row.conversationId ? `<a class="sellerSecondary" href="chat.html?conversation=${encodeURIComponent(row.conversationId)}">Open chat</a>` : ""}</div></article>`).join("") : '<p class="sellerEmpty">No support cases found.</p>';
  data.cases.forEach(row => { const st=document.querySelector(`[data-case-status="${CSS.escape(row.id)}"]`); const rs=document.querySelector(`[data-case-resolution="${CSS.escape(row.id)}"]`); if(st)st.value=row.status||"open"; if(rs)rs.value=row.resolution||"none"; });
  const pending = data.products.filter(product => product.approvalStatus === "pending");
  document.getElementById("reviewQueue").innerHTML = pending.length ? pending.map(product => `<article class="adminReviewCard"><img src="${adminSafe(product.image || "seller.png")}" alt="${adminSafe(product.name)}" onerror="this.src='seller.png'"><div class="adminReviewInfo"><span>${adminSafe(product.category || "Product")}</span><h4>${adminSafe(product.name)}</h4><strong>${adminMoney(product.price)}</strong><p>${adminSafe(product.description || "No description")}</p><small>Seller: ${adminSafe(product.shopName || product.sellerId || "Unknown")}</small></div><div class="adminReviewActions"><button class="adminApprove" data-review="approved" data-id="${adminSafe(product.id)}">Approve</button><button class="adminReject" data-review="rejected" data-id="${adminSafe(product.id)}">Reject</button></div></article>`).join("") : '<p class="sellerEmpty">The review queue is clear.</p>';
  document.getElementById("adminOrders").innerHTML = data.orders.length ? data.orders.map(order => `<article class="adminOrderCard"><div><strong>${adminSafe(order.id)}</strong><span>${adminSafe(order.customer?.name || "Customer")} · ${adminMoney(order.total)}</span><small>${adminSafe(order.customer?.location || "No delivery location")}</small></div><div><select class="adminStatusSelect" data-order-status="${adminSafe(order.id)}"><option value="placed">Placed</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select><small class="paymentBadge">Payment: ${adminSafe(order.paymentStatus || "pending")} · ${adminSafe(order.mobileMoneyProvider || order.payment || "")}</small>${order.paymentStatus !== "paid" && order.status !== "cancelled" ? `<div class="adminPaymentActions"><input data-payment-ref="${adminSafe(order.id)}" placeholder="Provider reference"><button class="adminSettleBtn" data-settle-payment="${adminSafe(order.id)}">Mark paid</button></div>` : ""}${order.status === "shipped" ? `<button class="sellerSecondary adminDeliveryBtn" data-deliver-order="${adminSafe(order.id)}">Record delivery evidence</button>` : ""}</div></article>`).join("") : '<p class="sellerEmpty">No orders found.</p>';
  document.querySelectorAll("[data-order-status]").forEach(select => select.value = data.orders.find(order => order.id === select.dataset.orderStatus)?.status || "placed");
  document.getElementById("adminReviews").innerHTML = data.reviews.length ? data.reviews.map(review => `<article class="adminOrderCard"><div><strong>${adminSafe(review.customerName || "Verified customer")}</strong><span>${"★".repeat(Number(review.rating || 0))} · ${adminSafe(review.shopName || review.productId)}</span><small>${adminSafe(review.message)}</small></div><button class="sellerSecondary" data-moderate-review="${adminSafe(review.id)}" data-review-status="${review.moderationStatus === "hidden" ? "published" : "hidden"}">${review.moderationStatus === "hidden" ? "Restore" : "Hide"}</button></article>`).join("") : '<p class="sellerEmpty">No reviews found.</p>';
  document.getElementById("sellerDirectory").innerHTML = data.sellers.length ? data.sellers.map(seller => `<article class="adminSeller"><div><strong>${adminSafe(seller.shopName || "Unnamed shop")}</strong><span>${adminSafe(seller.phone || "No phone")}</span></div><small class="statusPill ${adminSafe(seller.status)}">${adminSafe(seller.status || "unknown")}</small></article>`).join("") : '<p class="sellerEmpty">No seller accounts found.</p>';
}

async function loadAdmin() {
  adminError.textContent = "";
  if (!JDKBackend.isConnected()) throw new Error("Configure Firebase before using Admin Control Center.");
  const user = await JDKBackend.getUser();
  if (!user) { location.href = "auth.html"; return; }
  if (!await JDKBackend.isAdmin(true)) throw new Error("This account does not have the Firebase admin claim.");
  const data = await JDKBackend.getAdminDashboard();
  adminGate.hidden = true; adminWorkspace.hidden = false; renderAdmin(data);
}

document.getElementById("reviewQueue").addEventListener("click", async event => {
  const button = event.target.closest("[data-review]"); if (!button) return;
  button.disabled = true; adminError.textContent = "";
  try { await JDKBackend.reviewProduct(button.dataset.id, button.dataset.review); JDKUI.toast(`Product ${button.dataset.review}`); renderAdmin(await JDKBackend.getAdminDashboard()); }
  catch (error) { adminError.textContent = error.message || "Product review failed."; button.disabled = false; }
});
document.getElementById("adminOrders").addEventListener("change", async event => {
  const select = event.target.closest("[data-order-status]"); if (!select) return;
  select.disabled = true; adminError.textContent = "";
  try { await JDKBackend.updateOrderStatus(select.dataset.orderStatus, select.value); JDKUI.toast(`Order moved to ${select.value}`); renderAdmin(await JDKBackend.getAdminDashboard()); }
  catch (error) { adminError.textContent = error.message || "Order status update failed."; select.disabled = false; }
});

document.getElementById("adminOrders").addEventListener("click", async event => {
  const button = event.target.closest("[data-settle-payment]"); if (!button) return;
  const orderId = button.dataset.settlePayment;
  const reference = document.querySelector(`[data-payment-ref="${CSS.escape(orderId)}"]`)?.value || "";
  button.disabled = true; adminError.textContent = "";
  try { await JDKBackend.settlePayment(orderId, reference); JDKUI.toast("Payment settled and seller ledger posted"); renderAdmin(await JDKBackend.getAdminDashboard()); }
  catch (error) { adminError.textContent = error.message || "Payment settlement failed."; button.disabled = false; }
});

document.getElementById("refreshAdmin").addEventListener("click", () => loadAdmin().catch(error => { adminError.textContent = error.message; }));
loadAdmin().catch(error => { document.getElementById("adminGateMessage").textContent = "Administrator access unavailable."; adminError.textContent = error.message || "Admin Control Center failed to load."; });


document.getElementById("adminReviews").addEventListener("click", async event => {
  const button = event.target.closest("[data-moderate-review]"); if (!button) return; button.disabled = true; adminError.textContent = "";
  try { await JDKBackend.moderateReview(button.dataset.moderateReview, button.dataset.reviewStatus); JDKUI.toast(`Review ${button.dataset.reviewStatus}`); renderAdmin(await JDKBackend.getAdminDashboard()); }
  catch (error) { adminError.textContent = error.message || "Review moderation failed."; button.disabled = false; }
});


document.getElementById("adminOrders")?.addEventListener("click", async event => {
  const button = event.target.closest("[data-deliver-order]"); if (!button) return;
  const reference = prompt("Delivery reference / proof number:"); if (!reference) return;
  const note = prompt("Delivery note (optional):") || ""; button.disabled = true;
  try { await JDKBackend.recordDeliveryEvidence(button.dataset.deliverOrder, reference, note); JDKUI.toast("Delivery recorded"); await loadAdmin(); }
  catch (error) { JDKUI.toast(error.message || "Could not record delivery"); button.disabled = false; }
});


document.getElementById("adminCases")?.addEventListener("click", async event => {
  const save=event.target.closest("[data-save-case]"); const refund=event.target.closest("[data-refund-case]"); if(!save&&!refund)return;
  try {
    if(save){const id=save.dataset.saveCase;const status=document.querySelector(`[data-case-status="${CSS.escape(id)}"]`).value;const resolution=document.querySelector(`[data-case-resolution="${CSS.escape(id)}"]`).value;const note=prompt("Admin case note (optional):")||"";await JDKBackend.resolveSupportCase(id,status,resolution,note);JDKUI.toast("Case decision saved");}
    if(refund){const reference=prompt("Refund provider/reference number:");if(!reference)return;const note=prompt("Refund note (optional):")||"";await JDKBackend.issueOrderRefund(refund.dataset.refundCase,reference,note);JDKUI.toast("Refund recorded and ledgers reversed");}
    await loadAdmin();
  } catch(error){adminError.textContent=error.message||"Trust operation failed.";}
});


document.getElementById("promotionForm")?.addEventListener("submit", async event => { event.preventDefault(); try { await JDKBackend.createPromotion({ name:promoName.value, mode:promoMode.value, code:promoCode.value, discountType:promoDiscountType.value, discountValue:Number(promoDiscountValue.value), minimumSpend:Number(promoMinimumSpend.value||0), usageLimit:Number(promoUsageLimit.value||0), startsAt:new Date(promoStartsAt.value).toISOString(), endsAt:new Date(promoEndsAt.value).toISOString() }); event.target.reset(); JDKUI.toast("Campaign created"); await loadAdmin(); } catch(error) { adminError.textContent=error.message||"Could not create campaign."; } });
document.getElementById("promotionList")?.addEventListener("change", async event => { const el=event.target.closest("[data-promo-status]"); if(!el)return; try { await JDKBackend.setPromotionStatus(el.dataset.promoStatus,el.value); JDKUI.toast("Campaign status updated"); await loadAdmin(); } catch(error){adminError.textContent=error.message||"Could not update campaign.";} });
