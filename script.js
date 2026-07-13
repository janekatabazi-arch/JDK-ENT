const menuBtn = document.getElementById("menu");

const displayMenu =
    document.getElementById("menuSelect");

const layout1 =
    document.getElementById("layout1") ||
    document.querySelector(".layout1");




if (menuBtn && displayMenu && layout1) {

    menuBtn.addEventListener("click", openMenu);

}


function openMenu() {

    layout1.style.display = "none";


    displayMenu.innerHTML = `

        <div class="menubar" id="menuBar">

            <div class="menuList" id="close">
                Back
            </div>

            <div
                class="menuList"
                data-page="about.html"
            >
                About
            </div>

            <div
                class="menuList"
                data-page="services.html"
            >
                Services
            </div>

            <div
                class="menuList"
                data-page="info.html"
            >
                Info
            </div>

            <div
                class="menuList"
                data-page="settings.html"
            >
                Settings
            </div>

            <div
                class="menuList"
                data-page="reviews.html"
            >
                Ratings
            </div>

            <div
                class="menuList"
                data-page="reviews.html"
            >
                Review
            </div>

            <div
                class="menuList"
                data-page="apps.html"
            >
                More Apps
            </div>

            <div
                class="menuList"
                data-page="callcenter.html"
            >
                Call Center
            </div>

        </div>

    `;


    setupMenuEvents();

}




function setupMenuEvents() {

    const closeBtn =
        document.getElementById("close");


    if (closeBtn) {

        closeBtn.addEventListener(
            "click",
            closeMenu
        );

    }


    const pageLinks =
        document.querySelectorAll(
            ".menuList[data-page]"
        );


    pageLinks.forEach(link => {

        link.addEventListener(
            "click",
            () => {

                const page =
                    link.dataset.page;


                if (page) {

                    window.location.href = page;

                }

            }
        );

    });

}



function closeMenu() {

    layout1.style.display = "block";

    displayMenu.innerHTML = "";

}




function loadTheme() {

    const savedTheme =
        localStorage.getItem("jdkTheme");


    if (savedTheme === "dark") {

        document.body.classList.add(
            "darkMode"
        );

    } else {

        document.body.classList.remove(
            "darkMode"
        );

    }

}


function updateCartCounter() {

    let cart;

    try {

        cart = JSON.parse(
            localStorage.getItem("cart")
        ) || [];

    } catch (error) {

        cart = [];

    }


    const totalItems = cart.reduce(
        (total, item) => {

            return total +
                Number(item.quantity || 0);

        },
        0
    );


    const cartLinks =
        document.querySelectorAll(
            'a[href="cart.html"]'
        );


    cartLinks.forEach(cartLink => {

        let badge =
            cartLink.querySelector(
                ".cartBadge"
            );


        if (!badge) {

            badge =
                document.createElement("span");

            badge.className = "cartBadge";

            cartLink.appendChild(badge);

        }


        badge.textContent = totalItems;


        if (totalItems === 0) {

            badge.style.display = "none";

        } else {

            badge.style.display = "flex";

        }

    });

}


updateCartCounter();


window.addEventListener(
    "storage",
    updateCartCounter
);


window.updateCartCounter =
    updateCartCounter;

loadTheme();

/* Active footer navigation */
(function markActiveFooterPage() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".footerTabs a").forEach(link => {
        const href = link.getAttribute("href");
        link.classList.toggle("activeFooterLink", href === page);
    });
})();
