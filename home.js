const contentDisplay = document.getElementById("contentDisplay");
const searchInput = document.getElementById("getData");
let activeCategory = "all";
const price = value => typeof formatPrice === "function" ? formatPrice(value) : "UGX " + Number(value).toLocaleString();
const escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

function card(item) {
  const worker = item.type === "worker", wished = !worker && JDKDiscovery.isWishlisted(item.id);
  const description = item.service || item.description || "Quality selection from JDK Enterprises.";
  const pricing = !worker && window.JDKDeals ? JDKDeals.price(item) : { original:Number(item.price||0), final:Number(item.price||0), deal:null };
  return `<article class="productCard${worker ? " workerCard" : ""}"><div class="imageContainer"><span class="productTag">${worker ? "Available" : Number(item.stock || 0) > 0 ? "In stock" : "Sold out"}</span>${worker ? "" : `<button class="wishBtn${wished ? " active" : ""}" data-id="${escapeHTML(item.id)}" aria-label="Save ${escapeHTML(item.name)}">${wished ? "♥" : "♡"}</button>`}<img src="${escapeHTML(item.image)}" class="productImage" alt="${escapeHTML(item.name)}" loading="lazy"></div><div class="productInfo"><p class="productCategory">${escapeHTML(item.category || "JDK Marketplace")}</p><h3 class="productName">${escapeHTML(item.name)}</h3><p class="description">${escapeHTML(description)}</p>${worker ? '<div class="rating">★ 5.0 · Professional</div>' : `<div class="priceSection">${pricing.deal ? `<span class="saleBadge">${escapeHTML(JDKDeals.label(pricing.deal.promotion))}</span><span class="oldPrice">${price(pricing.original)}</span>` : ""}<span class="newPrice">${price(pricing.final)}</span></div>`}<div class="cardActions"><button class="viewBtn" data-id="${escapeHTML(item.id)}">${worker ? "View Profile" : "View"}</button>${worker ? `<button class="contactWorkerBtn" data-phone="${escapeHTML(item.phone || "")}">Contact</button>` : `<button class="cartBtn" data-id="${escapeHTML(item.id)}" ${Number(item.stock || 0) <= 0 ? "disabled" : ""}>${Number(item.stock || 0) > 0 ? "Add to Cart" : "Out of Stock"}</button>`}</div></div></article>`;
}
function bindCards() {
  contentDisplay.querySelectorAll(".viewBtn").forEach(btn => btn.onclick = () => { const item = JDKStore.findItem(btn.dataset.id); JDKStore.selectItem(item); JDKDiscovery.recordView(item); location.href = "product.html"; });
  contentDisplay.querySelectorAll(".cartBtn").forEach(btn => btn.onclick = () => { const item = JDKStore.findItem(btn.dataset.id); if (JDKStore.addToCart(item)) { JDKBackend?.trackEvent?.("add_to_cart", { productId:item.id, sellerId:item.sellerId || "", page:"home" }); JDKUI.notify(`${item.name} added to cart`); } else JDKUI.notify("Stock limit reached", "warning"); });
  contentDisplay.querySelectorAll(".wishBtn").forEach(btn => btn.onclick = () => { const item = JDKStore.findItem(btn.dataset.id); const saved = JDKDiscovery.toggleWishlist(item); JDKUI.notify(saved ? "Saved to wishlist" : "Removed from wishlist"); refresh(); });
  contentDisplay.querySelectorAll(".contactWorkerBtn").forEach(btn => btn.onclick = () => btn.dataset.phone ? location.href = "tel:" + btn.dataset.phone : JDKUI.notify("Worker phone number unavailable", "warning"));
}
function section(title, items) { return items.length ? `<div class="catalogHeading discoveryHeading"><div><span>For you</span><h2>${title}</h2></div></div><section class="homeProductGrid compactDiscovery">${items.map(card).join("")}</section>` : ""; }
function refresh() {
  if (!contentDisplay) return;
  const text = (searchInput?.value || "").trim();
  let items = JDKStore.items.filter(item => activeCategory === "all" || item.category === activeCategory);
  items = JDKDiscovery.search(items, text);
  document.querySelectorAll(".semiNav .li").forEach(el => el.classList.toggle("activeCategory", el.id === activeCategory));
  const extras = !text && activeCategory === "all" ? section("Recently viewed", JDKDiscovery.recentlyViewed(4)) + section("Your wishlist", JDKDiscovery.wishlistItems().slice(0, 4)) : "";
  contentDisplay.innerHTML = `<section class="storeHero"><div><span class="heroEyebrow">JDK ENTERPRISES MARKETPLACE</span><h2>Shop products. Find skilled workers.</h2><p>Search across products, sellers and everyday services.</p></div><a href="categories.html" class="heroAction">Explore marketplace</a></section>${extras}<div class="catalogHeading"><div><span>Discover</span><h2>${activeCategory === "all" ? "Featured marketplace" : JDK_DATA.categories[activeCategory] || "Marketplace"}</h2></div><strong>${items.length} result${items.length === 1 ? "" : "s"}</strong></div><section class="homeProductGrid">${items.length ? items.map(card).join("") : '<div class="emptyProducts"><h3>No items found</h3><p>Try a product name, seller or category.</p></div>'}</section>`;
  bindCards();
}
let searchTimer; searchInput?.addEventListener("input", () => { refresh(); clearTimeout(searchTimer); const query=searchInput.value.trim(); if(query.length>=2) searchTimer=setTimeout(()=>JDKBackend?.trackEvent?.("search",{query,page:"home"}),700); }); document.getElementById("submitSearch")?.addEventListener("click", refresh);
Object.keys(JDK_DATA.categories).forEach(id => document.getElementById(id)?.addEventListener("click", () => { activeCategory = id; refresh(); }));
window.addEventListener("jdk:catalog-ready", refresh); window.addEventListener("jdk:deals-ready", refresh); window.addEventListener("jdk:wishlist-changed", refresh); refresh();
