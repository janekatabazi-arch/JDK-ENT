let cart = JSON.parse(
    localStorage.getItem("cart")
) || [];


const container =
    document.getElementById("cartContainer");

const total =
    document.getElementById("totalPrice");


/* =========================
   DISPLAY CART
========================= */

function displayCart() {

    container.innerHTML = "";

    let grandTotal = 0;


    if (cart.length === 0) {

        container.innerHTML = `

            <div class="emptyCart">

                <h2>Your cart is empty</h2>

                <p>
                    Add products to start shopping.
                </p>

                <a href="categories.html">
                    Browse Products
                </a>

            </div>

        `;


        total.textContent =
            "Grand Total: " +
            formatPrice(0);


        return;

    }


    cart.forEach(product => {

        const itemTotal =
            product.price *
            product.quantity;


        grandTotal += itemTotal;


        container.innerHTML += `

            <div class="cartItem">

                <div class="cartInfo">

                    <h3>
                        ${product.name}
                    </h3>

                    <p>
                        ${formatPrice(product.price)}
                    </p>

                    <div class="quantity">

                        <button
                            class="decreaseBtn"
                            data-name="${product.name}"
                        >
                            -
                        </button>

                        <span>
                            ${product.quantity}
                        </span>

                        <button
                            class="increaseBtn"
                            data-name="${product.name}"
                        >
                            +
                        </button>

                    </div>

                    <h4>

                        Total:
                        ${formatPrice(itemTotal)}

                    </h4>

                    <button
                        class="removeBtn"
                        data-name="${product.name}"
                    >

                        Remove

                    </button>

                </div>

            </div>

        `;

    });


    total.textContent =
        "Grand Total: " +
        formatPrice(grandTotal);


    addCartEvents();

}


/* =========================
   CART EVENTS
========================= */

function addCartEvents() {

    const increaseButtons =
        document.querySelectorAll(
            ".increaseBtn"
        );


    const decreaseButtons =
        document.querySelectorAll(
            ".decreaseBtn"
        );


    const removeButtons =
        document.querySelectorAll(
            ".removeBtn"
        );


    increaseButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const product =
                    cart.find(
                        item =>
                            item.name ===
                            button.dataset.name
                    );


                if (product) {

                    product.quantity++;

                    saveCart();

                }

            }
        );

    });


    decreaseButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const product =
                    cart.find(
                        item =>
                            item.name ===
                            button.dataset.name
                    );


                if (!product) {

                    return;

                }


                product.quantity--;


                if (product.quantity <= 0) {

                    cart = cart.filter(
                        item =>
                            item.name !==
                            product.name
                    );

                }


                saveCart();

            }
        );

    });


    removeButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                cart = cart.filter(
                    item =>
                        item.name !==
                        button.dataset.name
                );


                saveCart();

            }
        );

    });

}


/* =========================
   SAVE CART
========================= */

function saveCart() {

    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );


    displayCart();

}


/* =========================
   START CART
========================= */

displayCart();
const checkoutBtn = document.getElementById("checkoutBtn");
if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
        if (cart.length === 0) {
            alert("Your cart is empty.");
            return;
        }
        window.location.href = "checkout.html";
    });
}
