const apps = [

    {
        icon: "🛒",
        name: "JDK Market",
        description:
            "Shop products from different categories.",
        status: "Available",
        page: "index.html"
    },

    {
        icon: "🔧",
        name: "JDK Workers",
        description:
            "Find skilled manual workers near you.",
        status: "Available",
        page: "categories.html?category=workers"
    },

    {
        icon: "🚚",
        name: "JDK Delivery",
        description:
            "Delivery services for JDK customers.",
        status: "Coming Soon",
        page: ""
    },

    {
        icon: "🏠",
        name: "JDK Homes",
        description:
            "Discover furniture and home products.",
        status: "Available",
        page: "categories.html?category=furniture"
    },

    {
        icon: "🏗️",
        name: "JDK Build",
        description:
            "Building materials and construction services.",
        status: "Available",
        page: "categories.html?category=building"
    },

    {
        icon: "💳",
        name: "JDK Pay",
        description:
            "A simple payment service for JDK customers.",
        status: "Coming Soon",
        page: ""
    }

];


const appsContainer =
    document.getElementById("appsContainer");

const searchInput =
    document.getElementById("getData");


function displayApps(list = apps) {

    appsContainer.innerHTML = "";


    if (list.length === 0) {

        appsContainer.innerHTML = `

            <div class="emptyApps">

                <h3>No apps found</h3>

            </div>

        `;

        return;

    }


    list.forEach(app => {

        const isAvailable =
            app.status === "Available";


        appsContainer.innerHTML += `

            <article class="appCard">

                <div class="appIcon">

                    ${app.icon}

                </div>


                <div class="appDetails">

                    <h2>
                        ${app.name}
                    </h2>

                    <p>
                        ${app.description}
                    </p>

                    <span class="
                        appStatusBadge
                        ${isAvailable
                            ? "availableApp"
                            : "comingApp"}
                    ">

                        ${app.status}

                    </span>

                </div>


                <button
                    class="openAppBtn"
                    data-page="${app.page}"
                    ${!isAvailable ? "disabled" : ""}
                >

                    ${isAvailable
                        ? "Open"
                        : "Coming Soon"}

                </button>

            </article>

        `;

    });


    addAppEvents();

}


function addAppEvents() {

    const buttons =
        document.querySelectorAll(".openAppBtn");


    buttons.forEach(button => {

        button.addEventListener("click", () => {

            const page =
                button.dataset.page;


            if (page !== "") {

                window.location.href = page;

            }

        });

    });

}


searchInput.addEventListener("input", () => {

    const searchText =
        searchInput.value
            .trim()
            .toLowerCase();


    const filteredApps =
        apps.filter(app => {

            return (

                app.name
                    .toLowerCase()
                    .includes(searchText)

                ||

                app.description
                    .toLowerCase()
                    .includes(searchText)

            );

        });


    displayApps(filteredApps);

});


displayApps();