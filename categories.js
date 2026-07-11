const products = window.JDKStore.items;


/* =========================
   ELEMENTS
========================= */

const productsContainer =
    document.getElementById("products");

const title =
    document.getElementById("categoryTitle");

const sortBox =
    document.getElementById("sortProducts");

const searchInput =
    document.getElementById("getData");


let currentCategory = "all";


/* =========================
   FORMAT PRICE
========================= */

function formatProductPrice(price) {

    if (typeof formatPrice === "function") {

        return formatPrice(price);

    }

    return "UGX " +
        Number(price).toLocaleString();

}


/* =========================
   CREATE CARD
========================= */

function createProductCard(product) {

    if (product.type === "worker") {

        return `

            <div class="productCard workerCard">

                <div class="imageContainer">

                    <span class="discount">
                        Available
                    </span>

                    <img
                        src="${product.image}"
                        class="productImage"
                        alt="${product.name}"
                    >

                </div>


                <div class="productInfo">

                    <h3 class="productName">
                        ${product.name}
                    </h3>

                    <p class="description">
                        ${product.service}
                    </p>

                    <div class="rating">
                        ⭐⭐⭐⭐⭐
                    </div>

                    <button
                        class="viewBtn"
                        data-name="${product.name}"
                    >
                        View Profile
                    </button>

                    <button
                        class="contactWorkerBtn"
                        data-phone="${product.phone}"
                    >
                        Contact Worker
                    </button>

                </div>

            </div>

        `;

    }


    return `

        <div class="productCard">

            <div class="imageContainer">

                <span class="discount">
                    New
                </span>

                <img
                    src="${product.image}"
                    class="productImage"
                    alt="${product.name}"
                >

            </div>


            <div class="productInfo">

                <h3 class="productName">
                    ${product.name}
                </h3>

                <p class="description">
                    High quality product from JDK ENT.
                </p>


                <div class="priceSection">

                    <span class="newPrice">
                        ${formatProductPrice(product.price)}
                    </span>

                </div>


                <div class="rating">
                    ⭐⭐⭐⭐⭐
                </div>


                <button
                    class="viewBtn"
                    data-name="${product.name}"
                >
                    View Details
                </button>


                <button
                    class="cartBtn"
                    data-name="${product.name}"
                >
                    Add to Cart
                </button>

            </div>

        </div>

    `;

}


/* =========================
   DISPLAY PRODUCTS
========================= */

function displayProducts(
    category = currentCategory,
    sort = "popular",
    searchText = ""
) {

    if (!productsContainer) {

        return;

    }


    let list = [...products];


    if (category !== "all") {

        list = list.filter(product => {

            return product.category === category;

        });

    }


    if (searchText !== "") {

        const text =
            searchText.toLowerCase();


        list = list.filter(product => {

            const name =
                product.name.toLowerCase();

            const service =
                product.service
                    ? product.service.toLowerCase()
                    : "";


            return (
                name.includes(text) ||
                service.includes(text)
            );

        });

    }


    if (sort === "low") {

        list.sort((a, b) => {

            return (a.price || 0) -
                (b.price || 0);

        });

    }


    if (sort === "high") {

        list.sort((a, b) => {

            return (b.price || 0) -
                (a.price || 0);

        });

    }


    productsContainer.innerHTML = "";


    if (list.length === 0) {

        productsContainer.innerHTML = `

            <div class="emptyProducts">

                <h3>No items found</h3>

                <p>
                    Try another category or search.
                </p>

            </div>

        `;

        return;

    }


    list.forEach(product => {

        productsContainer.innerHTML +=
            createProductCard(product);

    });


    addCartEvents();

    addViewEvents();

    addWorkerEvents();

}


/* =========================
   ADD TO CART
========================= */

function addCartEvents() {
    document.querySelectorAll(".cartBtn").forEach(button => {
        button.addEventListener("click", () => {
            const product = window.JDKStore.findItem(button.dataset.name);
            if (window.JDKStore.addToCart(product)) alert(product.name + " added to cart.");
        });
    });
}


/* =========================
   VIEW DETAILS
========================= */

function addViewEvents() {

    const viewButtons =
        document.querySelectorAll(".viewBtn");


    viewButtons.forEach(button => {

        button.addEventListener("click", () => {

            const name =
                button.dataset.name;


            const selectedProduct =
                products.find(product => {

                    return product.name === name;

                });


            if (!selectedProduct) {

                return;

            }


            window.JDKStore.selectItem(selectedProduct);


            window.location.href =
                "product.html";

        });

    });

}


/* =========================
   CONTACT WORKER
========================= */

function addWorkerEvents() {

    const contactButtons =
        document.querySelectorAll(
            ".contactWorkerBtn"
        );


    contactButtons.forEach(button => {

        button.addEventListener("click", () => {

            const phone =
                button.dataset.phone;


            if (!phone) {

                alert(
                    "Phone number unavailable."
                );

                return;

            }


            window.location.href =
                "tel:" + phone;

        });

    });

}


/* =========================
   SELECT CATEGORY
========================= */

function selectCategory(
    category,
    categoryName
) {

    currentCategory = category;


    if (title) {

        title.textContent =
            categoryName;

    }


    updateActiveCategory(category);


    const sort =
        sortBox
            ? sortBox.value
            : "popular";


    const searchText =
        searchInput
            ? searchInput.value.trim()
            : "";


    displayProducts(
        currentCategory,
        sort,
        searchText
    );

}


/* =========================
   ACTIVE CATEGORY
========================= */

function updateActiveCategory(category) {

    const buttons =
        document.querySelectorAll(
            ".categoryBtn, .li"
        );


    buttons.forEach(button => {

        button.classList.remove("active");

    });


    const activeTopButton =
        document.getElementById(category);


    if (activeTopButton) {

        activeTopButton.classList.add("active");

    }


    const sideButton =
        document.querySelector(
            `.categoryBtn[data-category="${category}"]`
        );


    if (sideButton) {

        sideButton.classList.add("active");

    }

}


/* =========================
   TOP CATEGORY BUTTONS
========================= */

const categoryButtons = {

    all: "All Products",

    electronics: "Electronics",

    groceries: "Groceries",

    furniture: "Furniture",

    workers: "Manual Workers",

    building: "Building Materials"

};


Object.entries(categoryButtons)
    .forEach(([id, name]) => {

        const button =
            document.getElementById(id);


        if (!button) {

            return;

        }


        button.addEventListener("click", () => {

            selectCategory(id, name);

        });

    });


/* =========================
   SIDE CATEGORY BUTTONS
========================= */

const sideCategoryButtons =
    document.querySelectorAll(
        ".categoryBtn"
    );


sideCategoryButtons.forEach(button => {

    button.addEventListener("click", () => {

        const category =
            button.dataset.category;


        if (!category) {

            return;

        }


        const categoryName =
            categoryButtons[category] ||
            button.textContent.trim();


        selectCategory(
            category,
            categoryName
        );

    });

});


/* =========================
   SORT PRODUCTS
========================= */

if (sortBox) {

    sortBox.addEventListener("change", () => {

        const searchText =
            searchInput
                ? searchInput.value.trim()
                : "";


        displayProducts(
            currentCategory,
            sortBox.value,
            searchText
        );

    });

}


/* =========================
   SEARCH
========================= */

if (searchInput) {

    searchInput.addEventListener("input", () => {

        const sort =
            sortBox
                ? sortBox.value
                : "popular";


        displayProducts(
            currentCategory,
            sort,
            searchInput.value.trim()
        );

    });

}


/* =========================
   START CATEGORY PAGE
========================= */

const requestedCategory = new URLSearchParams(window.location.search).get("category");

if (requestedCategory && Object.prototype.hasOwnProperty.call(categoryButtons, requestedCategory)) {
    currentCategory = requestedCategory;
    if (title) title.textContent = categoryButtons[requestedCategory];
}

displayProducts(
    currentCategory,
    sortBox ? sortBox.value : "popular"
);

updateActiveCategory(currentCategory);