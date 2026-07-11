const ordersContainer = document.getElementById("ordersContainer");
const orderSearch = document.getElementById("getData");

function getOrders() { return window.JDKOrders ? JDKOrders.getAll() : []; }
function money(value) { return window.formatPrice ? formatPrice(value) : "UGX " + Number(value || 0).toLocaleString(); }

function renderOrders(list = getOrders()) {
  ordersContainer.innerHTML = "";
  if (!list.length) {
    ordersContainer.innerHTML = `<div class="emptyProducts"><h3>No orders yet</h3><p>Your completed orders will appear here.</p><a href="categories.html">Start Shopping</a></div>`;
    return;
  }
  list.forEach(order => {
    const card = document.createElement("article");
    card.className = "orderHistoryCard";
    const count = (order.products || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    card.innerHTML = `<div class="orderHistoryTop"><div><strong>${order.id || "JDK Order"}</strong><p>${order.date || ""}</p></div><span class="orderStatus">Placed</span></div><p>${count} item${count === 1 ? "" : "s"} · ${order.payment || "Payment pending"}</p><h3>${money(order.total)}</h3><p class="orderLocation">Delivery: ${order.customer?.location || "Not provided"}</p>`;
    ordersContainer.appendChild(card);
  });
}

orderSearch?.addEventListener("input", () => {
  const q = orderSearch.value.trim().toLowerCase();
  renderOrders(getOrders().filter(order => `${order.id} ${order.customer?.name} ${order.customer?.location}`.toLowerCase().includes(q)));
});
renderOrders();