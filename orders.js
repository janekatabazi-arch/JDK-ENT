const ordersContainer = document.getElementById("ordersContainer");
const orderSearch = document.getElementById("getData");
let customerOrders = [];
function money(value) { return window.formatPrice ? formatPrice(value) : "UGX " + Number(value || 0).toLocaleString(); }
function safe(value) { const el=document.createElement("span"); el.textContent=String(value ?? ""); return el.innerHTML; }
function timeline(order) { const rows=[...(order.statusHistory || [])].sort((a,b)=>String(a.at||"").localeCompare(String(b.at||""))); return `<div class="orderTimeline">${rows.map((row,index)=>`<div class="timelineStep"><span>${index+1}</span><div><strong>${safe(String(row.status||"").replaceAll("_"," "))}</strong><small>${safe(row.at ? new Date(row.at).toLocaleString() : "")}</small></div></div>`).join("")}</div>`; }
function sellerTracking(order) { return Object.entries(order.sellerFulfilments || {}).filter(([,row])=>row.carrier || row.trackingNumber).map(([,row])=>`<p class="orderTracking">Dispatch: ${safe(row.carrier || "Carrier pending")} · ${safe(row.trackingNumber || "Reference pending")}</p>`).join(""); }
function renderOrders(list = customerOrders) {
  ordersContainer.innerHTML = "";
  if (!list.length) { ordersContainer.innerHTML = `<div class="emptyProducts"><h3>No orders yet</h3><p>Your completed orders will appear here.</p><a href="categories.html">Start Shopping</a></div>`; return; }
  list.forEach(order => { const card=document.createElement("article"); card.className="orderHistoryCard"; const count=(order.products||[]).reduce((sum,item)=>sum+Number(item.quantity||1),0); card.innerHTML=`<div class="orderHistoryTop"><div><strong>${safe(order.id || "JDK Order")}</strong><p>${safe(order.date || "")}</p></div><span class="orderStatus status-${safe(String(order.status || "placed").toLowerCase())}">${safe(String(order.status || "placed").replaceAll("_"," "))}</span></div><p>${count} item${count===1?"":"s"} · ${safe(order.payment || "Payment pending")}</p><h3>${money(order.total)}</h3><p class="orderLocation">Delivery: ${safe(order.customer?.location || "Not provided")}</p>${sellerTracking(order)}${order.deliveryEvidence ? `<p class="deliveryEvidence"><strong>Delivered</strong> · Reference ${safe(order.deliveryEvidence.reference)}</p>` : ""}${timeline(order)}`; ordersContainer.appendChild(card); });
}
orderSearch?.addEventListener("input",()=>{const q=orderSearch.value.trim().toLowerCase();renderOrders(customerOrders.filter(order=>`${order.id} ${order.customer?.name} ${order.customer?.location}`.toLowerCase().includes(q)));});
(async()=>{ if(window.JDKBackend){ await JDKBackend.waitForAuth(); customerOrders=await JDKBackend.getOrders().catch(()=>JDKOrders.getAll()); } else customerOrders=JDKOrders.getAll(); renderOrders(); })();
