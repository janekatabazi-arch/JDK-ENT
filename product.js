const productContainer = document.getElementById("productDetails");

let selectedProduct = null;
try { selectedProduct = JSON.parse(localStorage.getItem("selectedProduct")); } catch { selectedProduct = null; }

/* Refresh old saved records from the shared catalogue when possible. */
if (selectedProduct && window.JDKStore) {
    selectedProduct = JDKStore.findItem(selectedProduct.id || selectedProduct.name) || selectedProduct;
}

function displayDetails() {
    if (selectedProduct?.type === "product") { JDKDiscovery.recordView(selectedProduct); JDKBackend?.trackEvent?.("product_view", { productId:selectedProduct.id, sellerId:selectedProduct.sellerId || "", page:"product" }); }
    if (!productContainer) return;
    if (!selectedProduct) {
        productContainer.innerHTML = `<div class="emptyProducts"><h2>Item Not Found</h2><p>Please select an item first.</p><a href="categories.html">Back to Categories</a></div>`;
        return;
    }
    selectedProduct.type === "worker" ? displayWorker() : displayProduct();
}

function displayProduct() {
    const pricing = window.JDKDeals ? JDKDeals.price(selectedProduct) : { original:Number(selectedProduct.price||0), final:Number(selectedProduct.price||0), deal:null };
    productContainer.innerHTML = `
        <div class="productDetailsCard">
            <div class="detailsImageSection"><img src="${selectedProduct.image}" class="detailsImage" alt="${selectedProduct.name}"></div>
            <div class="detailsInfo">
                <span class="detailsBadge">${Number(selectedProduct.stock || 0) > 0 ? `${Number(selectedProduct.stock)} in stock` : "Out of stock"}</span>
                <h1>${selectedProduct.name}</h1>
                <div class="rating" id="productRating">${selectedProduct.ratingCount ? `★ ${Number(selectedProduct.averageRating || 0).toFixed(1)} · ${selectedProduct.ratingCount} verified review${selectedProduct.ratingCount === 1 ? "" : "s"}` : "No verified ratings yet"}</div>
                <h2 class="detailsPrice">${pricing.deal ? `<span class="saleBadge">${JDKUI.escapeHTML(JDKDeals.label(pricing.deal.promotion))}</span><del>${formatPrice(pricing.original)}</del> ` : ""}${formatPrice(pricing.final)}</h2>${pricing.deal ? `<p class="dealEnds">Deal ends in <strong data-deal-countdown="${JDKUI.escapeHTML(pricing.deal.promotion.endsAt)}">${JDKDeals.countdown(pricing.deal.promotion.endsAt)}</strong></p>` : ""}
                <p class="detailsDescription">${selectedProduct.description || "Quality product available from JDK ENT."}</p>${selectedProduct.variants?.sizes?.length ? `<p><strong>Sizes:</strong> ${selectedProduct.variants.sizes.join(", ")}</p>` : ""}${selectedProduct.variants?.colors?.length ? `<p><strong>Colors:</strong> ${selectedProduct.variants.colors.join(", ")}</p>` : ""}
                <button class="detailsWishBtn" id="wishProductBtn">${JDKDiscovery.isWishlisted(selectedProduct.id) ? "♥ Saved" : "♡ Save to Wishlist"}</button>
                <button class="detailsWishBtn" id="messageSellerBtn" ${selectedProduct.sellerId ? "" : "hidden"}>💬 Message Seller</button>
                <button class="detailsCartBtn" id="addProductBtn" ${Number(selectedProduct.stock || 0) <= 0 ? "disabled" : ""}>${Number(selectedProduct.stock || 0) > 0 ? "Add to Cart" : "Out of Stock"}</button>
                <button class="backCategoryBtn" id="backBtn">Back to Categories</button>
            </div>
        </div>`;
    document.getElementById("addProductBtn")?.addEventListener("click", addProductToCart);
    document.getElementById("messageSellerBtn")?.addEventListener("click", async () => { try { const row = await JDKBackend.createConversation({ sellerId:selectedProduct.sellerId, productId:selectedProduct.id }); localStorage.setItem("selectedConversation", JSON.stringify({id:row.id,title:selectedProduct.shopName || selectedProduct.name})); location.href=`chat.html?conversation=${encodeURIComponent(row.id)}`; } catch (error) { JDKUI.toast(error.message || "Sign in to message this seller", "error"); } });
    document.getElementById("wishProductBtn")?.addEventListener("click", () => { JDKDiscovery.toggleWishlist(selectedProduct); displayProduct(); });
    renderProductReviews();
    renderRecommendations();
    setupBackButton();
}

function displayWorker() {
    productContainer.innerHTML = `
        <div class="productDetailsCard workerProfile">
            <div class="detailsImageSection"><img src="${selectedProduct.image}" class="detailsImage" alt="${selectedProduct.name}"></div>
            <div class="detailsInfo">
                <span class="workerAvailable">Available for Work</span>
                <h1>${selectedProduct.name}</h1>
                <div class="rating">⭐⭐⭐⭐⭐</div>
                <h2 class="workerService">${selectedProduct.service}</h2>
                <p class="detailsDescription">${selectedProduct.description || "Professional service provider available through JDK ENT."}</p>
                <button class="contactProfileBtn" id="messageWorkerBtn">💬 Message Worker</button>
                <button class="contactProfileBtn secondaryContactBtn" id="contactWorkerBtn">📞 Call Worker</button>
                <button class="backCategoryBtn" id="backBtn">Back to Categories</button>
            </div>
        </div>`;

    document.getElementById("contactWorkerBtn")?.addEventListener("click", () => {
        if (!selectedProduct.phone) return JDKUI.notify("Worker phone number unavailable", "warning");
        window.location.href = "tel:" + selectedProduct.phone;
    });

    document.getElementById("messageWorkerBtn")?.addEventListener("click", () => {
        const chat = {
            id: selectedProduct.id,
            name: selectedProduct.name,
            image: selectedProduct.image,
            message: `Hello, I am ${selectedProduct.name}. How can I help with ${selectedProduct.service.toLowerCase()}?`,
            time: "Worker"
        };
        JDKMessages.openConversation(chat);
        window.location.href = "chat.html";
    });
    setupBackButton();
}

function addProductToCart() {
    if (window.JDKStore?.addToCart(selectedProduct)) JDKUI.notify(selectedProduct.name + " added to cart"); else JDKUI.notify("Stock limit reached for this product", "warning");
}

function setupBackButton() {
    document.getElementById("backBtn")?.addEventListener("click", () => {
        window.location.href = selectedProduct?.category ? `categories.html?category=${selectedProduct.category}` : "categories.html";
    });
}

displayDetails();

function renderRecommendations() {
    const card = document.querySelector(".productDetailsCard");
    if (!card || !selectedProduct || selectedProduct.type !== "product") return;
    const items = JDKDiscovery.recommendations(selectedProduct, 4);
    if (!items.length) return;
    const section = document.createElement("section"); section.className = "productRecommendations";
    section.innerHTML = `<h2>You may also like</h2><div class="recommendationGrid">${items.map(item => `<button class="recommendationCard" data-id="${item.id}"><img src="${item.image}" alt="${item.name}"><strong>${item.name}</strong><span>${formatPrice(item.price)}</span></button>`).join("")}</div>`;
    card.after(section);
    section.querySelectorAll(".recommendationCard").forEach(button => button.onclick = () => { const item = JDKStore.findItem(button.dataset.id); JDKStore.selectItem(item); JDKDiscovery.recordView(item); localStorage.setItem("selectedProduct", JSON.stringify(item)); location.reload(); });
}


async function renderProductReviews() {
    if (!selectedProduct?.id || !JDKBackend?.isConnected()) return;
    const card = document.querySelector(".productDetailsCard"); if (!card) return;
    const section = document.createElement("section"); section.className = "productReviewPanel"; section.innerHTML = `<div class="reviewPanelHead"><div><h2>Verified customer reviews</h2><p>Reviews can only be submitted after a delivered JDK order.</p></div></div><div id="productReviewList"><p>Loading reviews...</p></div><div class="inlineReviewForm"><h3>Review this product</h3><div id="inlineReviewStars" class="ratingStars">${[1,2,3,4,5].map(n => `<button type="button" data-star="${n}">☆</button>`).join("")}</div><textarea id="inlineReviewMessage" class="reviewMessage" placeholder="Share your experience with this product"></textarea><button id="inlineReviewSubmit" class="submitReviewBtn">Submit verified review</button><p id="inlineReviewError" class="authError"></p></div>`;
    card.after(section); let rating = 0;
    const paint = () => section.querySelectorAll("[data-star]").forEach(btn => btn.textContent = Number(btn.dataset.star) <= rating ? "★" : "☆");
    section.querySelectorAll("[data-star]").forEach(btn => btn.onclick = () => { rating = Number(btn.dataset.star); paint(); });
    const list = section.querySelector("#productReviewList");
    try { const reviews = await JDKBackend.getProductReviews(selectedProduct.id); list.innerHTML = reviews.length ? reviews.map(review => `<article class="customerReview"><div class="reviewHeader"><div><h3>${JDKUI.escapeHTML(review.customerName || "Verified customer")}</h3><span class="verifiedBadge">✓ Verified purchase</span></div><div class="reviewStars">${"★".repeat(review.rating)}${"☆".repeat(5-review.rating)}</div></div><p>${JDKUI.escapeHTML(review.message)}</p></article>`).join("") : `<p class="sellerEmpty">No verified reviews yet.</p>`; } catch (error) { list.innerHTML = `<p class="authError">${JDKUI.escapeHTML(error.message)}</p>`; }
    section.querySelector("#inlineReviewSubmit").onclick = async event => { const error = section.querySelector("#inlineReviewError"); error.textContent = ""; event.currentTarget.disabled = true; try { await JDKBackend.createReview({ productId:selectedProduct.id, rating, message:section.querySelector("#inlineReviewMessage").value }); JDKUI.toast("Verified review published"); location.reload(); } catch (e) { error.textContent = e.message || "Review submission failed."; event.currentTarget.disabled = false; } };
}

window.addEventListener("jdk:deals-ready", () => { if(selectedProduct?.type === "product") displayProduct(); });
