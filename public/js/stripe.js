// import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51LxdKHJQ17Kvc3Fl7CrDdhnJdzvHtr0cBuS8zkDePzRJXOqJbewGVMPZaFigWXWId6aOQHMbwwCceeNJc2a3R11S00PrLF3n9p'
);
export const bookTour = async tourId => {
  try {
    // 1) Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    // 2) Create checkout form + charge credit card
    // const sessionId = session.data.session.id;
    // await stripe.redirectToCheckout({
    //   sessionId,
    // });
    window.location.replace(session.data.session.url);
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
