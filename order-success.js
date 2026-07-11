const order = JSON.parse(
    localStorage.getItem("lastOrder")
);

const orderDetails =
    document.getElementById("orderDetails");


if (!order) {

    orderDetails.innerHTML = `

        <div class="noOrder">

            <p>
                No recent order was found.
            </p>

            <a href="categories.html">
                Start Shopping
            </a>

        </div>

    `;

} else {

    let productsHTML = "";


    order.products.forEach(product => {

        const productTotal =
            product.price * product.quantity;


        productsHTML += `

            <div class="successProduct">

                <span>
                    ${product.name}
                    × ${product.quantity}
                </span>

                <strong>

                    UGX ${productTotal.toLocaleString()}

                </strong>

            </div>

        `;

    });


    orderDetails.innerHTML = `

        <div class="orderInfo">

            <h3>Order Details</h3>

            <p><strong>Order ID:</strong> ${order.id || "JDK Order"}</p>

            <p>
                <strong>Customer:</strong>
                ${order.customer.name}
            </p>

            <p>
                <strong>Phone:</strong>
                ${order.customer.phone}
            </p>

            <p>
                <strong>Delivery:</strong>
                ${order.customer.location}
            </p>

            <p>
                <strong>Payment:</strong>
                ${order.payment}
            </p>

            <p>
                <strong>Order Date:</strong>
                ${order.date}
            </p>

        </div>


        <div class="successProducts">

            <h3>Your Products</h3>

            ${productsHTML}

        </div>


        <div class="successTotal">

            Total: UGX ${order.total.toLocaleString()}

        </div>

    `;

}