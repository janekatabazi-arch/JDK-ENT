const productContainer = document.getElementById("productDetails");

let selectedProduct = null;
try { selectedProduct = JSON.parse(localStorage.getItem("selectedProduct")); } catch { selectedProduct = null; }

/* Refresh old saved records from the shared catalogue when possible. */
if (selectedProduct && window.JDKStore) {
    selectedProduct = JDKStore.findItem(selectedProduct.id || selectedProduct.name) || selectedProduct;
}

function displayDetails() {
    if (!productContainer) return;
    if (!selectedProduct) {
        productContainer.innerHTML = `<div class="emptyProducts"><h2>Item Not Found</h2><p>Please select an item first.</p><a href="categories.html">Back to Categories</a></div>`;
        return;
    }
    selectedProduct.type === "worker" ? displayWorker() : displayProduct();
}

function displayProduct() {
    productContainer.innerHTML = `
        <div class="productDetailsCard">
            <div class="detailsImageSection"><img src="${selectedProduct.image}" class="detailsImage" alt="${selectedProduct.name}"></div>
            <div class="detailsInfo">
                <span class="detailsBadge">Available</span>
                <h1>${selectedProduct.name}</h1>
                <div class="rating">⭐⭐⭐⭐⭐</div>
                <h2 class="detailsPrice">${formatPrice(selectedProduct.price)}</h2>
                <p class="detailsDescription">${selectedProduct.description || "Quality product available from JDK ENT."}</p>
                <button class="detailsCartBtn" id="addProductBtn">Add to Cart</button>
                <button class="backCategoryBtn" id="backBtn">Back to Categories</button>
            </div>
        </div>`;
    document.getElementById("addProductBtn")?.addEventListener("click", addProductToCart);
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
        if (!selectedProduct.phone) return alert("Worker phone number unavailable.");
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
    if (window.JDKStore?.addToCart(selectedProduct)) alert(selectedProduct.name + " added to cart.");
}

function setupBackButton() {
    document.getElementById("backBtn")?.addEventListener("click", () => {
        window.location.href = selectedProduct?.category ? `categories.html?category=${selectedProduct.category}` : "categories.html";
    });
}

displayDetails();
