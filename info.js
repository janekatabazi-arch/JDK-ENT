const information = [

    {
        icon: "🛒",

        title: "Shopping",

        description:
            "Browse products from different categories and add items to your shopping cart."
    },

    {
        icon: "📦",

        title: "Orders",

        description:
            "Place orders and review your latest order information."
    },

    {
        icon: "💬",

        title: "Messaging",

        description:
            "Communicate with support teams, sellers and delivery services."
    },

    {
        icon: "🔧",

        title: "Services",

        description:
            "Explore services and find workers for different tasks."
    },

    {
        icon: "⭐",

        title: "Reviews",

        description:
            "Rate JDK Enterprises and share your shopping experience."
    },

    {
        icon: "⚙️",

        title: "Settings",

        description:
            "Manage application appearance, notifications and application data."
    }

];


const infoContainer =
    document.getElementById("infoContainer");

const searchInput =
    document.getElementById("getData");

const platformInfo =
    document.getElementById("platformInfo");


function displayInformation(
    list = information
) {

    infoContainer.innerHTML = "";


    if (list.length === 0) {

        infoContainer.innerHTML = `

            <div class="emptyInfo">

                <h3>
                    No information found
                </h3>

            </div>

        `;

        return;

    }


    list.forEach(info => {

        infoContainer.innerHTML += `

            <article class="infoCard">

                <div class="infoIcon">

                    ${info.icon}

                </div>

                <div>

                    <h2>
                        ${info.title}
                    </h2>

                    <p>
                        ${info.description}
                    </p>

                </div>

            </article>

        `;

    });

}


function detectPlatform() {

    const userAgent =
        navigator.userAgent.toLowerCase();


    if (
        userAgent.includes("android")
    ) {

        platformInfo.textContent =
            "Android Web";

        return;

    }


    if (
        userAgent.includes("iphone") ||
        userAgent.includes("ipad")
    ) {

        platformInfo.textContent =
            "iOS Web";

        return;

    }


    platformInfo.textContent =
        "Desktop Web";

}


searchInput.addEventListener(
    "input",
    () => {

        const searchText =
            searchInput.value
                .trim()
                .toLowerCase();


        const filteredInformation =
            information.filter(info => {

                return (

                    info.title
                        .toLowerCase()
                        .includes(searchText)

                    ||

                    info.description
                        .toLowerCase()
                        .includes(searchText)

                );

            });


        displayInformation(
            filteredInformation
        );

    }
);


detectPlatform();

displayInformation();