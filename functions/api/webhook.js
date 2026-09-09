// POST /api/webhook -- Stripe webhook endpoint.
// Configure this URL in the Stripe Dashboard (Developers -> Webhooks), listening
// for "checkout.session.completed", "checkout.session.async_payment_succeeded",
// and "checkout.session.async_payment_failed". On a completed, paid booking,
// saves a trip record to KV (env.TRIPS_KV) for the driver dashboard to see.
//
// Card payments settle instantly, so checkout.session.completed already has
// payment_status "paid". Bank transfer (ACH) payments settle a few business
// days later -- completed fires with payment_status "unpaid", and the trip
// isn't created until the matching async_payment_succeeded event arrives (or
// never, if async_payment_failed arrives instead).

import { verifyStripeSignature } from "../_lib/stripeVerify.js";

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
    // Cards: payment_status is already "paid" here -- create the trip now.
    // Bank transfers: payment_status is "unpaid" until the debit clears, a few
    // business days later -- wait for async_payment_succeeded instead.
    if (session.payment_status === "paid") {
      await createTrip(session, env);
    }
  } else if (event.type === "checkout.session.async_payment_succeeded") {
    await createTrip(event.data.object, env);
  }
  // checkout.session.async_payment_failed: no trip created -- nothing to do.
  // The failed charge is visible in the Stripe Dashboard.

  return new Response("ok", { status: 200 });
}

async function createTrip(session, env) {
  const md = session.metadata || {};

  const tripId = crypto.randomUUID();
  const trip = {
    id: tripId,
    createdAt: new Date().toISOString(),
    status: "scheduled",
    category: md.category || "",
    childName: md.childName || "",
    parentName: md.parentName || "",
    parentEmail: session.customer_details?.email || md.parentEmail || "",
    parentPhone: md.parentPhone || "",
    pickupAddress: md.pickupAddress || "",
    dropoffAddress: md.dropoffAddress || "",
    instructions: md.instructions || "",
    total: session.amount_total ? session.amount_total / 100 : null,
  };

  await env.TRIPS_KV.put(`trip:${tripId}`, JSON.stringify(trip));

  const indexRaw = await env.TRIPS_KV.get("trip-index");
  const index = indexRaw ? JSON.parse(indexRaw) : [];
  index.unshift(tripId);
  await env.TRIPS_KV.put("trip-index", JSON.stringify(index.slice(0, 200)));
}
