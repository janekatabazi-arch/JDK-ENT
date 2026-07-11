const products = window.JDKStore.items;
const contentDisplay = document.getElementById("contentDisplay");
const searchInput = document.getElementById("getData");
let activeCategory = "all";
const price = value => typeof formatPrice === "function" ? formatPrice(value) : "UGX " + Number(value).toLocaleString();
function displayProducts(items) {
  if (!contentDisplay) return;
  contentDisplay.innerHTML = items.length ? "" : '<div class="emptyProducts"><h3>No items found</h3><p>Try another search or category.</p></div>';
  items.forEach(item => contentDisplay.insertAdjacentHTML("beforeend", `<div class="productCard"><div class="imageContainer"><img src="${item.image}" class="productImage" alt="${item.name}"></div><div class="productInfo"><h3 class="productName">${item.name}</h3><p class="description">${item.service || item.description}</p>${item.type === "product" ? `<div class="priceSection"><span class="newPrice">${price(item.price)}</span></div>` : ""}<button class="viewBtn" data-id="${item.id}">${item.type === "worker" ? "View Profile" : "View Details"}</button>${item.type === "worker" ? `<button class="contactWorkerBtn" data-phone="${item.phone}">Contact Worker</button>` : `<button class="cartBtn" data-id="${item.id}">Add to Cart</button>`}</div></div>`));
  document.querySelectorAll(".viewBtn").forEach(btn => btn.onclick = () => { window.JDKStore.selectItem(window.JDKStore.findItem(btn.dataset.id)); location.href="product.html"; });
  document.querySelectorAll(".cartBtn").forEach(btn => btn.onclick = () => { const item=window.JDKStore.findItem(btn.dataset.id); if (window.JDKStore.addToCart(item)) alert(item.name + " added to cart."); });
  document.querySelectorAll(".contactWorkerBtn").forEach(btn => btn.onclick = () => { if(btn.dataset.phone) location.href="tel:"+btn.dataset.phone; });
}
function refresh() { const text=(searchInput?.value || "").trim().toLowerCase(); displayProducts(products.filter(item => (activeCategory === "all" || item.category === activeCategory) && [item.name,item.service,item.description].filter(Boolean).some(value => value.toLowerCase().includes(text)))); }
searchInput?.addEventListener("input", refresh);
Object.keys(window.JDK_DATA.categories).forEach(id => document.getElementById(id)?.addEventListener("click", () => { activeCategory=id; refresh(); }));
refresh();
