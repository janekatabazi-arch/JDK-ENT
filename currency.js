

const currencyRates = {

    UGX: 1,

    USD: 0.00027,

    EUR: 0.00023,

    GBP: 0.00020

};


const currencySymbols = {

    UGX: "UGX",

    USD: "$",

    EUR: "€",

    GBP: "£"

};


/* =========================
   GET SETTINGS
========================= */

function getJDKSettings() {

    let savedSettings;

    try {

        savedSettings = JSON.parse(
            localStorage.getItem("jdkSettings")
        );

    } catch (error) {

        savedSettings = null;

    }


    return savedSettings || {

        currency: "UGX"

    };

}




function getCurrentCurrency() {

    const settings = getJDKSettings();

    return settings.currency || "UGX";

}




function formatPrice(priceUGX) {

    const currency =
        getCurrentCurrency();


    const rate =
        currencyRates[currency] || 1;


    const symbol =
        currencySymbols[currency] || "UGX";


    const convertedPrice =
        priceUGX * rate;


    if (currency === "UGX") {

        return (
            symbol +
            " " +
            Math.round(convertedPrice)
                .toLocaleString()
        );

    }


    return (
        symbol +
        " " +
        convertedPrice.toLocaleString(
            undefined,
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )
    );

}