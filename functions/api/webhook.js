// POST /api/webhook -- Stripe webhook endpoint.
// Configure this URL in the Stripe Dashboard (Developers -> Webhooks), listening
// for "checkout.session.completed", "checkout.session.async_payment_succeeded",
// and "checkout.session.async_payment_failed". Saves a trip record to KV
// (env.TRIPS_KV) as soon as checkout completes, so the ride can be dispatched
// right away -- the driver shouldn't wait days for a bank transfer to clear
// before showing up to drive.
//
// Card payments settle instantly, so the trip starts out with paymentStatus
// "paid". Bank transfer (ACH) payments settle a few business days later, so
// the trip starts out "pending" and gets updated to "paid" or "failed" once
// the matching async_payment_succeeded/failed event arrives. A failed bank
// transfer adds the trip's amount to the parent's past-due balance
// (functions/_lib/pastDue.js) -- functions/api/checkout.js blocks new
// bookings for that email until it's paid off via functions/api/pay-past-due.js.

import { verifyStripeSignature } from "../_lib/stripeVerify.js";
import { addPastDue, clearPastDue } from "../_lib/pastDue.js";

export async function onRequestPost({ request, env }) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Webhook not configured", { status: 503 });
  }
  const valid = await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    return new Response("Invalid signature", { status: 400 });
  }
  if (!env.TRIPS_KV) {
    return new Response("Trip storage not configured", { status: 503 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.metadata?.type === "past_due_payoff") {
      if (session.payment_status === "paid") await clearPastDue(env, session.metadata.email);
      // else (bank transfer, still pending): wait for async_payment_succeeded below.
    } else {
      await createTrip(session, env);
    }
  } else if (event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    if (session.metadata?.type === "past_due_payoff") {
      await clearPastDue(env, session.metadata.email);
    } else {
      await setPaymentStatus(session.id, "paid", env);
    }
  } else if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object;
    if (session.metadata?.type !== "past_due_payoff") {
      const trip = await setPaymentStatus(session.id, "failed", env);
      if (trip?.parentEmail && trip.total) {
        await addPastDue(env, trip.parentEmail, trip.total);
      }
    }
    // Past-due payoff itself failing: balance is simply still there -- nothing to add.
  }

  return new Response("ok", { status: 200 });
}

async function createTrip(session, env) {
  const md = session.metadata || {};

  const tripId = crypto.randomUUID();
  const trip = {
    id: tripId,
    createdAt: new Date().toISOString(),
    status: "scheduled",
    paymentStatus: session.payment_status === "paid" ? "paid" : "pending",
    stripeSessionId: session.id,
    category: md.category || "",
    childName: md.childName || "",
    parentName: md.parentName || "",
    parentEmail: session.customer_details?.email || md.parentEmail || "",
    parentPhone: md.parentPhone || "",
    pickupAddress: md.pickupAddress || "",
    dropoffAddress: md.dropoffAddress || "",
    startDate: md.startDate || "",
    pickupTime: md.pickupTime || "",
    dropoffTime: md.dropoffTime || "",
    instructions: md.instructions || "",
    total: session.amount_total ? session.amount_total / 100 : null,
  };

  await env.TRIPS_KV.put(`trip:${tripId}`, JSON.stringify(trip));

  const indexRaw = await env.TRIPS_KV.get("trip-index");
  const index = indexRaw ? JSON.parse(indexRaw) : [];
  index.unshift(tripId);
  await env.TRIPS_KV.put("trip-index", JSON.stringify(index.slice(0, 200)));
}

// Bank transfers clear days after the trip record is created, so find it by
// the Stripe session ID stashed on it and update its payment status in place
// rather than creating a second trip record. Returns the updated trip so the
// caller can act on it (e.g. adding to the parent's past-due balance).
async function setPaymentStatus(stripeSessionId, paymentStatus, env) {
  const indexRaw = await env.TRIPS_KV.get("trip-index");
  const index = indexRaw ? JSON.parse(indexRaw) : [];

  for (const id of index) {
    const raw = await env.TRIPS_KV.get(`trip:${id}`);
    if (!raw) continue;
    const trip = JSON.parse(raw);
    if (trip.stripeSessionId === stripeSessionId) {
      trip.paymentStatus = paymentStatus;
      await env.TRIPS_KV.put(`trip:${id}`, JSON.stringify(trip));
      return trip;
    }
  }
  return null;
}
