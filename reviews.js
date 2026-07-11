const ratingStars =
    document.querySelectorAll(
        "#ratingStars span"
    );

const reviewName =
    document.getElementById("reviewName");

const reviewMessage =
    document.getElementById("reviewMessage");

const submitReview =
    document.getElementById("submitReview");

const reviewsContainer =
    document.getElementById("reviewsContainer");

const averageRating =
    document.getElementById("averageRating");

const summaryStars =
    document.getElementById("summaryStars");

const reviewCount =
    document.getElementById("reviewCount");


let selectedRating = 0;


let reviews = JSON.parse(
    localStorage.getItem("jdkReviews")
) || [];


ratingStars.forEach(star => {

    star.addEventListener("click", () => {

        selectedRating =
            Number(star.dataset.value);

        updateSelectedStars();

    });

});


function updateSelectedStars() {

    ratingStars.forEach(star => {

        const value =
            Number(star.dataset.value);

        if (value <= selectedRating) {

            star.textContent = "★";

        } else {

            star.textContent = "☆";

        }

    });

}


submitReview.addEventListener("click", () => {

    const name =
        reviewName.value.trim();

    const message =
        reviewMessage.value.trim();


    if (selectedRating === 0) {

        alert("Please select a rating.");

        return;

    }


    if (name === "") {

        alert("Please enter your name.");

        return;

    }


    if (message === "") {

        alert("Please write a review.");

        return;

    }


    const review = {

        id: Date.now(),

        name: name,

        rating: selectedRating,

        message: message,

        date: new Date().toLocaleDateString()

    };


    reviews.unshift(review);


    localStorage.setItem(
        "jdkReviews",
        JSON.stringify(reviews)
    );


    reviewName.value = "";

    reviewMessage.value = "";

    selectedRating = 0;


    updateSelectedStars();

    displayReviews();

});


function displayReviews() {

    reviewsContainer.innerHTML = "";


    if (reviews.length === 0) {

        reviewsContainer.innerHTML = `

            <div class="emptyReviews">

                <p>
                    No reviews yet.
                </p>

            </div>

        `;

        updateRatingSummary();

        return;

    }


    reviews.forEach(review => {

        const stars =
            "★".repeat(review.rating) +
            "☆".repeat(5 - review.rating);


        reviewsContainer.innerHTML += `

            <article class="customerReview">

                <div class="reviewHeader">

                    <div>

                        <h3>
                            ${review.name}
                        </h3>

                        <span>
                            ${review.date}
                        </span>

                    </div>

                    <div class="reviewStars">

                        ${stars}

                    </div>

                </div>

                <p>
                    ${review.message}
                </p>

            </article>

        `;

    });


    updateRatingSummary();

}


function updateRatingSummary() {

    if (reviews.length === 0) {

        averageRating.textContent = "0.0";

        summaryStars.textContent = "☆☆☆☆☆";

        reviewCount.textContent = "0 Reviews";

        return;

    }


    const totalRating =
        reviews.reduce(
            (total, review) =>
                total + review.rating,
            0
        );


    const average =
        totalRating / reviews.length;


    averageRating.textContent =
        average.toFixed(1);


    const roundedRating =
        Math.round(average);


    summaryStars.textContent =

        "★".repeat(roundedRating) +

        "☆".repeat(5 - roundedRating);


    reviewCount.textContent =

        reviews.length +

        (
            reviews.length === 1
                ? " Review"
                : " Reviews"
        );

}


displayReviews();