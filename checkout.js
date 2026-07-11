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

const checkoutForm =
    document.getElementById("checkoutForm");


let grandTotal = 0;

function loadSavedCustomer() {
    if (!window.JDKCustomer) return;
    const customer = JDKCustomer.get();
    const fields = { customerName: customer.name, customerPhone: customer.phone, customerLocation: customer.location };
    Object.entries(fields).forEach(([id, value]) => { const field = document.getElementById(id); if (field && !field.value) field.value = value || ""; });
}


function displayCheckoutProducts() {

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


    checkoutTotal.textContent =

        "Total: UGX " +
        grandTotal.toLocaleString();

}


if (checkoutForm) checkoutForm.addEventListener("submit", event => {

    event.preventDefault();


    if (cart.length === 0) {

        alert("Your cart is empty.");

        return;

    }


    const name =
        document.getElementById("customerName").value;

    const phone =
        document.getElementById("customerPhone").value;

    const location =
        document.getElementById("customerLocation").value;

    const note =
        document.getElementById("customerNote").value;

    const payment =
        document.querySelector(
            'input[name="payment"]:checked'
        )?.value;

    if (!payment) {
        alert("Please select a payment method.");
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

        products: cart,

        total: grandTotal,

        date: new Date().toLocaleString()

    };


    if (window.JDKCustomer) JDKCustomer.save(order.customer);
    if (window.JDKOrders) JDKOrders.save(order);
    else localStorage.setItem("lastOrder", JSON.stringify(order));


    localStorage.removeItem("cart");


    window.location.href =
        "order-success.html";

});


loadSavedCustomer();
displayCheckoutProducts();