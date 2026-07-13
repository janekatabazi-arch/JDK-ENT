const services = [

    {
        icon: "🛒",
        name: "Online Shopping",
        description:
            "Shop electronics, groceries, furniture and building materials.",
        page: "categories.html"
    },

    {
        icon: "🔧",
        name: "Manual Workers",
        description:
            "Find skilled workers for different jobs and services.",
        page: "categories.html?category=workers"
    },

    {
        icon: "🚚",
        name: "Delivery Services",
        description:
            "Get your purchased products delivered to your location.",
        page: "support.html"
    },

    {
        icon: "💬",
        name: "Customer Support",
        description:
            "Contact our support team when you need assistance.",
        page: "messages.html"
    },

    {
        icon: "🏗️",
        name: "Building Materials",
        description:
            "Find cement and other construction materials.",
        page: "categories.html?category=building"
    },

    {
        icon: "⭐",
        name: "Ratings & Reviews",
        description:
            "Share your experience and rate JDK Enterprises.",
        page: "reviews.html"
    }

];


const servicesContainer =
    document.getElementById("servicesContainer");

const searchInput =
    document.getElementById("getData");


function displayServices(list = services) {

    servicesContainer.innerHTML = "";


    if (list.length === 0) {

        servicesContainer.innerHTML = `

            <div class="emptyServices">

                <h3>No services found</h3>

            </div>

        `;

        return;

    }


    list.forEach(service => {

        servicesContainer.innerHTML += `

            <article class="serviceCard">

                <div class="serviceIcon">

                    ${service.icon}

                </div>

                <h2>
                    ${service.name}
                </h2>

                <p>
                    ${service.description}
                </p>

                <button
                    class="serviceBtn"
                    data-page="${service.page}"
                >

                    Explore Service

                </button>

            </article>

        `;

    });


    addServiceEvents();

}


function addServiceEvents() {

    const serviceButtons =
        document.querySelectorAll(".serviceBtn");


    serviceButtons.forEach(button => {

        button.addEventListener("click", () => {

            window.location.href =
                button.dataset.page;

        });

    });

}


searchInput.addEventListener("input", () => {

    const searchText =
        searchInput.value
            .trim()
            .toLowerCase();


    const filteredServices =
        services.filter(service => {

            return (

                service.name
                    .toLowerCase()
                    .includes(searchText)

                ||

                service.description
                    .toLowerCase()
                    .includes(searchText)

            );

        });


    displayServices(filteredServices);

});


displayServices();