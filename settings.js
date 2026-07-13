const darkMode =
    document.getElementById("darkMode");

const orderNotifications =
    document.getElementById("orderNotifications");

const messageNotifications =
    document.getElementById("messageNotifications");

const currencySetting =
    document.getElementById("currencySetting");

const clearCartBtn =
    document.getElementById("clearCartBtn");

const clearMessagesBtn =
    document.getElementById("clearMessagesBtn");

const resetAppBtn =
    document.getElementById("resetAppBtn");




const defaultSettings = {

    darkMode: false,

    orderNotifications: true,

    messageNotifications: true,

    currency: "UGX"

};



let savedSettings;

try {

    savedSettings = JSON.parse(
        localStorage.getItem("jdkSettings")
    );

} catch (error) {

    savedSettings = null;

}


let settings = {

    ...defaultSettings,

    ...(savedSettings || {})

};




function loadSettings() {

    if (darkMode) {

        darkMode.checked =
            settings.darkMode;

    }


    if (orderNotifications) {

        orderNotifications.checked =
            settings.orderNotifications;

    }


    if (messageNotifications) {

        messageNotifications.checked =
            settings.messageNotifications;

    }


    if (currencySetting) {

        currencySetting.value =
            settings.currency;

    }


    applyDarkMode();

}




function saveSettings() {

    localStorage.setItem(
        "jdkSettings",
        JSON.stringify(settings)
    );

}




function applyDarkMode() {

    if (settings.darkMode) {

        document.body.classList.add(
            "darkMode"
        );

        localStorage.setItem(
            "jdkTheme",
            "dark"
        );

    } else {

        document.body.classList.remove(
            "darkMode"
        );

        localStorage.setItem(
            "jdkTheme",
            "light"
        );

    }

}




if (darkMode) {

    darkMode.addEventListener(
        "change",
        () => {

            settings.darkMode =
                darkMode.checked;

            saveSettings();

            applyDarkMode();

        }
    );

}




if (orderNotifications) {

    orderNotifications.addEventListener(
        "change",
        () => {

            settings.orderNotifications =
                orderNotifications.checked;

            saveSettings();

        }
    );

}




if (messageNotifications) {

    messageNotifications.addEventListener(
        "change",
        () => {

            settings.messageNotifications =
                messageNotifications.checked;

            saveSettings();

        }
    );

}


if (currencySetting) {

    currencySetting.addEventListener(
        "change",
        () => {

            settings.currency =
                currencySetting.value;

            saveSettings();

        }
    );

}




if (clearCartBtn) {

    clearCartBtn.addEventListener(
        "click",
        () => {

            const confirmClear = confirm(
                "Do you want to clear your cart?"
            );


            if (!confirmClear) {

                return;

            }


            localStorage.removeItem("cart");


            JDKUI.toast("Shopping cart cleared.");

        }
    );

}




if (clearMessagesBtn) {

    clearMessagesBtn.addEventListener(
        "click",
        () => {

            const confirmClear = confirm(
                "Do you want to clear saved messages?"
            );


            if (!confirmClear) {

                return;

            }


            Object.keys(localStorage)
                .forEach(key => {

                    if (
                        key.startsWith(
                            "chatMessages_"
                        )
                    ) {

                        localStorage.removeItem(
                            key
                        );

                    }

                });


            JDKUI.toast("Messages cleared.");

        }
    );

}




if (resetAppBtn) {

    resetAppBtn.addEventListener(
        "click",
        () => {

            const confirmReset = confirm(
                "Reset all JDK application data?"
            );


            if (!confirmReset) {

                return;

            }


            localStorage.clear();


            window.location.reload();

        }
    );

}




loadSettings();

const profileName = document.getElementById("profileName");
const profilePhone = document.getElementById("profilePhone");
const profileLocation = document.getElementById("profileLocation");
const saveProfileBtn = document.getElementById("saveProfileBtn");

if (window.JDKCustomer) {
    const customer = JDKCustomer.get();
    if (profileName) profileName.value = customer.name;
    if (profilePhone) profilePhone.value = customer.phone;
    if (profileLocation) profileLocation.value = customer.location;
}
saveProfileBtn?.addEventListener("click", () => {
    JDKCustomer.save({ name: profileName.value, phone: profilePhone.value, location: profileLocation.value });
    saveProfileBtn.textContent = "Profile Saved ✓";
    setTimeout(() => saveProfileBtn.textContent = "Save Profile", 1200);
});
