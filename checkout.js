let cart = [];
try {
    cart = JSON.parse(localStorage.getItem("cart")) || [];
} catch (error) {
    cart = [];
}

const checkoutProducts =
    document.getElementById("checkoutProducts");

const checkoutTotal =
    document.getElementById("checkoutTotal");

JDKBackend?.trackEvent?.("checkout_started", { page:"checkout" });
const checkoutForm =
    document.getElementById("checkoutForm");


let grandTotal = 0;
let deliveryOptions = { zones: [], pickupPoints: [] };
let selectedDeliveryFee = 0;

function loadSavedCustomer() {
    if (!window.JDKCustomer) return;
    const customer = JDKCustomer.get();
    const fields = { customerName: customer.name, customerPhone: customer.phone, customerLocation: customer.location };
    Object.entries(fields).forEach(([id, value]) => { const field = document.getElementById(id); if (field && !field.value) field.value = value || ""; });
}


function displayCheckoutProducts() {
    const savedCoupon = localStorage.getItem("jdkPendingCoupon"); const couponInput = document.getElementById("couponCode"); if(savedCoupon && couponInput && !couponInput.value) couponInput.value = savedCoupon;

    checkoutProducts.innerHTML = "";

    grandTotal = 0;


    if (cart.length === 0) {

        checkoutProducts.innerHTML = `

            <div class="emptyCheckout">

                <p>
                    Your cart is empty.
                </p>

                <a href="categories.html">
                    Start Shopping
                </a>

            </div>

        `;

        checkoutTotal.textContent =
            "Total: UGX 0";

        return;

    }


    cart.forEach(product => {

        const itemTotal =
            product.price * product.quantity;

        grandTotal += itemTotal;


        checkoutProducts.innerHTML += `

            <div class="checkoutProduct">

                <img
                    src="${product.image || "shopping-cart.png"}"
                    alt="${product.name}"
                >

                <div>

                    <h4>
                        ${product.name}
                    </h4>

                    <p>
                        ${product.quantity}
                        ×
                        UGX ${product.price.toLocaleString()}
                    </p>

                    <strong>

                        UGX ${itemTotal.toLocaleString()}

                    </strong>

                </div>

            </div>

        `;

    });


    checkoutTotal.textContent = "Items: UGX " + grandTotal.toLocaleString() + (selectedDeliveryFee ? " · Delivery: UGX " + selectedDeliveryFee.toLocaleString() : "") + " · Estimated total: UGX " + (grandTotal + selectedDeliveryFee).toLocaleString();

}


if (checkoutForm) checkoutForm.addEventListener("submit", async event => {

    event.preventDefault();


    if (cart.length === 0) {

        JDKUI.toast("Your cart is empty.", "warning");

        return;

    }


    const name =
        document.getElementById("customerName").value;

    const phone =
        document.getElementById("customerPhone").value;

    const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked')?.value || "delivery";
    const deliveryZoneId = deliveryMethod === "delivery" ? document.getElementById("deliveryZone")?.value : null;
    const pickupPointId = deliveryMethod === "pickup" ? document.getElementById("pickupPoint")?.value : null;
    const location = deliveryMethod === "pickup" ? (deliveryOptions.pickupPoints.find(p => p.id === pickupPointId)?.address || "Pickup") : document.getElementById("customerLocation").value;
    if (deliveryMethod === "delivery" && (!location || !deliveryZoneId)) { JDKUI?.notify("Enter your delivery address and choose a delivery zone.", "warning"); return; }
    if (deliveryMethod === "pickup" && !pickupPointId) { JDKUI?.notify("Choose a pickup point.", "warning"); return; }

    const note =
        document.getElementById("customerNote").value;

    const payment =
        document.querySelector(
            'input[name="payment"]:checked'
        )?.value;

    if (!payment) {
        JDKUI.toast("Please select a payment method.", "warning");
        return;
    }


    const mobileMoneyProvider = payment === "mobile-money" ? document.getElementById("mobileMoneyProvider")?.value : null;
    if (payment === "mobile-money" && !mobileMoneyProvider) {
        JDKUI?.notify("Choose MTN MoMo or Airtel Money.", "warning");
        return;
    }

    const order = {

        id: "JDK-" + Date.now().toString().slice(-8),

        customer: {
            name,
            phone,
            location,
            note
        },

        payment,
        mobileMoneyProvider,
        couponCode: document.getElementById("couponCode")?.value?.trim() || "",
        deliveryMethod,
        deliveryZoneId,
        pickupPointId,

        products: cart,

        total: grandTotal,

        status: "placed",

        statusHistory: [{ status: "placed", at: new Date().toISOString() }],

        sellerIds: [...new Set(cart.map(item => item.sellerId).filter(Boolean))],

        date: new Date().toLocaleString()

    };


    if (window.JDKCustomer) JDKCustomer.save(order.customer);
    if (deliveryMethod === "delivery" && document.getElementById("saveAddress")?.checked) {
        try { await JDKBackend.saveAddress({ label: document.getElementById("addressLabel")?.value || "Saved address", location, zoneId: deliveryZoneId }); } catch (error) { JDKUI?.notify(error.message, "warning"); }
    }
    if (window.JDKBackend) { try {
        const savedOrder = await JDKBackend.saveOrder(order);
        if (payment === "mobile-money") {
            const paymentResult = await JDKBackend.initiateMobileMoneyPayment(savedOrder.id);
            localStorage.setItem("jdkLastPayment", JSON.stringify(paymentResult));
            JDKUI?.notify(paymentResult.sandbox ? "Sandbox Mobile Money request created." : "Mobile Money request sent. Approve it on your phone.", "success");
        }
    } catch (error) { JDKUI?.notify(error.message || "Could not create the order or payment request.", "warning"); return; } }
    else if (window.JDKOrders) JDKOrders.save(order);
    else localStorage.setItem("lastOrder", JSON.stringify(order));


    localStorage.removeItem("cart");
    localStorage.removeItem("jdkPendingCoupon");


    window.location.href =
        "order-success.html";

});


document.querySelectorAll('input[name="payment"]').forEach(input => input.addEventListener("change", () => {
    const box = document.getElementById("mobileMoneyOptions");
    if (box) box.hidden = input.value !== "mobile-money" || !input.checked;
}));

loadSavedCustomer();
displayCheckoutProducts();
window.addEventListener("jdk:deals-ready", () => {
 const box=document.getElementById("couponCode")?.closest(".sellerPanel"); if(!box||!window.JDKDeals)return; const coupons=JDKDeals.coupons(); if(!coupons.length)return; const shelf=document.createElement("div"); shelf.className="couponShelf"; shelf.innerHTML=`<strong>Available coupons</strong>${coupons.slice(0,4).map(p=>`<button type="button" data-use-coupon="${JDKUI.escapeHTML(p.code)}"><b>${JDKUI.escapeHTML(p.code)}</b><span>${JDKUI.escapeHTML(JDKDeals.label(p))}${p.minimumSpend?` · min ${formatPrice(p.minimumSpend)}`:""}</span></button>`).join("")}`; box.appendChild(shelf); shelf.querySelectorAll("[data-use-coupon]").forEach(btn=>btn.onclick=()=>{document.getElementById("couponCode").value=btn.dataset.useCoupon; localStorage.setItem("jdkPendingCoupon",btn.dataset.useCoupon); JDKUI.toast("Coupon selected. Final discount is validated securely when you place the order.");});
});


async function loadLogistics() {
    try {
        deliveryOptions = await JDKBackend.getDeliveryOptions();
        const zone = document.getElementById("deliveryZone");
        const pickup = document.getElementById("pickupPoint");
        zone.innerHTML = `<option value="">Choose delivery zone</option>${deliveryOptions.zones.map(z => `<option value="${JDKUI.escapeHTML(z.id)}">${JDKUI.escapeHTML(z.name)} — UGX ${Number(z.fee).toLocaleString()}</option>`).join("")}`;
        pickup.innerHTML = `<option value="">Choose pickup point</option>${deliveryOptions.pickupPoints.map(x => `<option value="${JDKUI.escapeHTML(x.id)}">${JDKUI.escapeHTML(x.name)} — Free</option>`).join("")}`;
        const addresses = await JDKBackend.getAddresses();
        const saved = document.getElementById("savedAddress");
        saved.innerHTML = `<option value="">Enter a new address</option>${addresses.map(a => `<option value="${JDKUI.escapeHTML(a.id)}" data-location="${JDKUI.escapeHTML(a.location)}" data-zone="${JDKUI.escapeHTML(a.zoneId)}">${JDKUI.escapeHTML(a.label)} — ${JDKUI.escapeHTML(a.location)}</option>`).join("")}`;
        saved.onchange = () => { const o=saved.selectedOptions[0]; if(!o?.value)return; document.getElementById("customerLocation").value=o.dataset.location||""; zone.value=o.dataset.zone||""; updateDeliveryPreview(); };
        zone.onchange = updateDeliveryPreview; pickup.onchange = updatePickupPreview;
        document.querySelectorAll('input[name="deliveryMethod"]').forEach(r => r.onchange = toggleDeliveryMethod);
        document.getElementById("saveAddress").onchange = e => document.getElementById("addressLabel").hidden = !e.target.checked;
        updateDeliveryPreview();
    } catch (error) { JDKUI?.notify(error.message || "Could not load delivery options.", "warning"); }
}
function updateDeliveryPreview(){ const z=deliveryOptions.zones.find(x=>x.id===document.getElementById("deliveryZone")?.value); selectedDeliveryFee=Number(z?.fee||0); document.getElementById("deliveryEstimate").textContent=z?`${z.estimate} · Delivery fee UGX ${selectedDeliveryFee.toLocaleString()}`:"Choose a zone to calculate delivery"; displayCheckoutProducts(); }
function updatePickupPreview(){ const x=deliveryOptions.pickupPoints.find(p=>p.id===document.getElementById("pickupPoint")?.value); selectedDeliveryFee=0; document.getElementById("pickupEstimate").textContent=x?`${x.address} · ${x.estimate}`:"Choose a pickup point"; displayCheckoutProducts(); }
function toggleDeliveryMethod(){ const method=document.querySelector('input[name="deliveryMethod"]:checked')?.value; document.getElementById("deliveryFields").hidden=method!=="delivery"; document.getElementById("pickupFields").hidden=method!=="pickup"; document.getElementById("customerLocation").required=method==="delivery"; document.getElementById("deliveryZone").required=method==="delivery"; document.getElementById("pickupPoint").required=method==="pickup"; if(method==="pickup") updatePickupPreview(); else updateDeliveryPreview(); }
loadLogistics();
