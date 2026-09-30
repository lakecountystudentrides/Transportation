// GET /api/booking-status -- public, unauthenticated. Lets the booking page
// know whether to let a parent complete checkout, without hardcoding the
// on/off switch separately in client JS (see functions/_lib/bookingGate.js).
import { BOOKINGS_OPEN } from "../_lib/bookingGate.js";

export async function onRequestGet() {
  return new Response(JSON.stringify({ open: BOOKINGS_OPEN }), {
    headers: { "content-type": "application/json" },
  });
}
