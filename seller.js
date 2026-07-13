const gate = document.getElementById("sellerGate");
const workspace = document.getElementById("sellerWorkspace");
const gateError = document.getElementById("sellerGateError");
const publishError = document.getElementById("publishError");
const productName = document.getElementById("productName");
const productPrice = document.getElementById("productPrice");
const productCategory = document.getElementById("productCategory");
const productImage = document.getElementById("productImage");
const productDescription = document.getElementById("productDescription");
const productImageFile = document.getElementById("productImageFile");
const productImagePreview = document.getElementById("productImagePreview");
const productStock = document.getElementById("productStock");
const productSizes = document.getElementById("productSizes");
const productColors = document.getElementById("productColors");
let productImagePath = "";
const productFormTitle = document.getElementById("productFormTitle");
const publishProduct = document.getElementById("publishProduct");
const cancelProductEdit = document.getElementById("cancelProductEdit");
const sellerPhone = document.getElementById("sellerPhone");
const sellerShopName = document.getElementById("sellerShopName");
const shopName = document.getElementById("shopName");
const activateSeller = document.getElementById("activateSeller");
const sellerProductsBox = document.getElementById("sellerProducts");
const refreshProducts = document.getElementById("refreshProducts");
const refreshSellerOrders = document.getElementById("refreshSellerOrders");
const refreshEarnings = document.getElementById("refreshEarnings");
let editingProductId = null;
let sellerProducts = [];

function safe(value) { const el = document.createElement("span"); el.textContent = String(value ?? ""); return el.innerHTML; }
function money(value) { return typeof window.formatCurrency === "function" ? formatCurrency(Number(value || 0)) : `UGX ${Number(value || 0).toLocaleString()}`; }
function csv(value) { return [...new Set(String(value || "").split(",").map(item => item.trim()).filter(Boolean))]; }
function productFormData() { return { name: productName.value, price: productPrice.value, category: productCategory.value, image: productImage.value, imagePath: productImagePath, stock: productStock.value, variants: { sizes: csv(productSizes.value), colors: csv(productColors.value) }, description: productDescription.value }; }
async function prepareProductImage() { const file = productImageFile.files?.[0]; if (!file) { if (productImage.value) return; throw new Error("Choose a product image."); } productImagePreview.textContent = "Uploading image..."; const uploaded = await JDKBackend.uploadProductImage(file); productImage.value = uploaded.url; productImagePath = uploaded.path; productImagePreview.innerHTML = `<img src="${safe(uploaded.url)}" alt="Product preview">`; }
productImageFile.addEventListener("change", () => { const file = productImageFile.files?.[0]; if (!file) return; const url = URL.createObjectURL(file); productImagePreview.innerHTML = `<img src="${url}" alt="Selected product preview">`; });
function resetProductForm() { editingProductId = null; productImagePath = ""; productImageFile.value = ""; productImagePreview.textContent = "No image selected"; ["productName","productPrice","productImage","productStock","productSizes","productColors","productDescription"].forEach(id => document.getElementById(id).value = ""); productCategory.value = ""; productFormTitle.textContent = "Publish a product"; publishProduct.textContent = "Submit Product for Review"; cancelProductEdit.hidden = true; }

async function loadSellerProducts() {
  const box = document.getElementById("sellerProducts"); box.innerHTML = '<p class="sellerEmpty">Loading products...</p>';
  try {
    sellerProducts = await JDKBackend.getSellerProducts();
    if (!sellerProducts.length) { box.innerHTML = '<p class="sellerEmpty">No products submitted yet.</p>'; return; }
    box.innerHTML = sellerProducts.map(product => `<article class="sellerProduct sellerProductEditable"><img src="${safe(product.image || "seller.png")}" alt="${safe(product.name)}" onerror="this.src='seller.png'"><div><strong>${safe(product.name)}</strong><span>${money(product.price)} · Stock ${Number(product.stock || 0)}</span><small class="statusPill ${safe(product.approvalStatus)}">${safe(product.approvalStatus || "pending")}</small></div><button class="sellerEditBtn" data-edit-product="${safe(product.id)}">Edit</button></article>`).join("");
  } catch (error) { box.innerHTML = `<p class="authError">${safe(error.message)}</p>`; }
}

async function loadSellerOrders() {
  const box = document.getElementById("sellerOrders"); box.innerHTML = '<p class="sellerEmpty">Loading orders...</p>';
  try {
    const orders = await JDKBackend.getSellerOrders();
    if (!orders.length) { box.innerHTML = '<p class="sellerEmpty">No customer orders for your shop yet.</p>'; return; }
    const user = await JDKBackend.getUser();
    box.innerHTML = orders.map(order => {
      const fulfilment = order.sellerFulfilments?.[user.uid] || { status:"awaiting_acceptance" };
      const next = { awaiting_acceptance:"accepted", accepted:"processing", processing:"ready_for_dispatch", ready_for_dispatch:"dispatched" }[fulfilment.status];
      const action = next ? `<div class="fulfilmentAction">${next === "dispatched" ? '<input class="sellerInput" data-carrier placeholder="Carrier / rider"><input class="sellerInput" data-tracking placeholder="Tracking or dispatch reference">' : ''}<button class="sellerPrimary" data-fulfilment="${safe(next)}" data-order="${safe(order.id)}">${safe(next.replaceAll("_"," "))}</button></div>` : '';
      return `<article class="sellerOrderCard"><div class="sellerPanelTop"><div><strong>${safe(order.id)}</strong><span>${safe(order.customer?.name || "Customer")}</span></div><small class="statusPill ${safe(fulfilment.status)}">${safe(fulfilment.status.replaceAll("_"," "))}</small></div><p>${(order.products || []).map(item => `${safe(item.name)} × ${Number(item.quantity || 1)}`).join(" · ")}</p><strong>${money((order.products || []).reduce((sum,item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0))}</strong><small>Delivery: ${safe(order.customer?.location || "Not provided")}</small>${fulfilment.carrier ? `<small>Dispatch: ${safe(fulfilment.carrier)} · ${safe(fulfilment.trackingNumber)}</small>` : ""}${action}<button class="detailsWishBtn" data-message-buyer data-order="${safe(order.id)}">💬 Message buyer</button></article>`;
    }).join("");
  } catch (error) { box.innerHTML = `<p class="authError">${safe(error.message)}</p>`; }
}


async function loadSellerEarnings() {
  const box = document.getElementById("sellerEarnings"); if (!box) return;
  box.innerHTML = '<p class="sellerEmpty">Loading earnings...</p>';
  try {
    const rows = await JDKBackend.getSellerEarnings();
    const gross = rows.reduce((sum,row) => sum + Number(row.gross || 0), 0);
    const commission = rows.reduce((sum,row) => sum + Number(row.commission || 0), 0);
    const net = rows.reduce((sum,row) => sum + Number(row.net || 0), 0);
    box.innerHTML = `<article class="financeCard"><strong>${money(gross)}</strong><span>Paid sales</span></article><article class="financeCard"><strong>${money(commission)}</strong><span>JDK commission</span></article><article class="financeCard"><strong>${money(net)}</strong><span>Your earned balance</span></article>`;
  } catch (error) { box.innerHTML = `<p class="authError">${safe(error.message)}</p>`; }
}

async function initializeSeller() {
  if (!JDKBackend.isConnected()) { gateError.textContent = "Configure Firebase before using Seller Center."; return; }
  const user = await JDKBackend.getUser(); if (!user) { location.href = "auth.html"; return; }
  sellerPhone.value = JDKCustomer.get().phone || "";
  const seller = await JDKBackend.getSellerProfile(); if (!seller) return;
  gate.hidden = true; workspace.hidden = false; sellerShopName.textContent = seller.shopName || "Your shop";
  await Promise.all([loadSellerProducts(), loadSellerOrders(), loadSellerEarnings()]);
}

activateSeller.addEventListener("click", async () => { gateError.textContent = ""; activateSeller.disabled = true; try { await JDKBackend.registerSeller({ shopName: shopName.value, phone: sellerPhone.value }); JDKUI.toast("Seller account activated"); await initializeSeller(); } catch (error) { gateError.textContent = error.message || "Could not activate seller account."; } finally { activateSeller.disabled = false; } });

publishProduct.addEventListener("click", async () => { publishError.textContent = ""; publishProduct.disabled = true; try { await prepareProductImage(); if (editingProductId) { await JDKBackend.updateSellerProduct(editingProductId, productFormData()); JDKUI.toast("Product updated and returned to review"); } else { await JDKBackend.publishProduct(productFormData()); JDKUI.toast("Product submitted for review"); } resetProductForm(); await loadSellerProducts(); } catch (error) { publishError.textContent = error.message || "Product submission failed."; } finally { publishProduct.disabled = false; } });

sellerProductsBox.addEventListener("click", event => { const button = event.target.closest("[data-edit-product]"); if (!button) return; const product = sellerProducts.find(item => item.id === button.dataset.editProduct); if (!product) return; editingProductId = product.id; productName.value = product.name || ""; productPrice.value = product.price || ""; productCategory.value = product.category || ""; productImage.value = product.image || ""; productImagePath = product.imagePath || ""; productStock.value = Number(product.stock || 0); productSizes.value = (product.variants?.sizes || []).join(", "); productColors.value = (product.variants?.colors || []).join(", "); productImagePreview.innerHTML = product.image ? `<img src="${safe(product.image)}" alt="Product preview">` : "No image selected"; productDescription.value = product.description || ""; productFormTitle.textContent = "Edit product"; publishProduct.textContent = "Save Changes & Resubmit"; cancelProductEdit.hidden = false; window.scrollTo({ top: 0, behavior: "smooth" }); });
cancelProductEdit.addEventListener("click", resetProductForm);
refreshProducts.addEventListener("click", loadSellerProducts);
refreshSellerOrders.addEventListener("click", loadSellerOrders);
refreshEarnings?.addEventListener("click", loadSellerEarnings);
initializeSeller().catch(error => gateError.textContent = error.message || "Seller Center failed to load.");


document.getElementById("sellerOrders")?.addEventListener("click", async event => {
  const button = event.target.closest("[data-fulfilment]"); if (!button) return;
  const card = button.closest(".sellerOrderCard"); button.disabled = true;
  try { await JDKBackend.updateSellerFulfilment(button.dataset.order, button.dataset.fulfilment, card.querySelector("[data-tracking]")?.value || "", card.querySelector("[data-carrier]")?.value || ""); JDKUI.toast("Fulfilment updated"); await loadSellerOrders(); }
  catch (error) { JDKUI.toast(error.message || "Fulfilment update failed"); button.disabled = false; }
});


document.getElementById("sellerOrders")?.addEventListener("click", async event => {
  const button = event.target.closest("[data-message-buyer]"); if (!button) return;
  try { const row = await JDKBackend.createConversation({ orderId:button.dataset.order }); localStorage.setItem("selectedConversation", JSON.stringify({id:row.id,title:`Order ${button.dataset.order.slice(0,8)}`})); location.href=`chat.html?conversation=${encodeURIComponent(row.id)}`; } catch (error) { JDKUI.toast(error.message || "Could not open buyer conversation", "error"); }
});
