const stripe = Stripe(
  "pk_test_51PLS802MrGXUqKzirWWMnJ4RfvEGvMjuR7RoRzokM8ecIrNpgyNL3mXeDkfj7p9adyzyNP1MMNu5iYT80WMwZSPu00fn68QCTC",
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from api

    const session = await fetch(`/api/v1/bookings/checkout-session/${tourId}`).then(function (response) {
      return response.json();
    });
    /* console.log(session); */
    // 2) Create checkout form + charge credit card

    await stripe.redirectToCheckout({
      sessionId: session.session.id,
    });
  } catch (err) {
    /* console.log(err); */
    showAlert("error ", err);
  }
};
