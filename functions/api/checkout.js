// POST /api/checkout
// Body: { amount, description, customerEmail, category, childName, parentName,
//         parentPhone, pickupAddress, dropoffAddress, startDate, pickupTime,
//         dropoffTime, instructions, autoPay, paymentMethod }
// autoPay only matters for a monthly category -- true creates a real Stripe
// subscription (auto-billed every month); false/omitted is a one-time
// payment for just that month, same as any other category.
// paymentMethod is "card" (default) or "bank_transfer" -- card adds the 3%
// surcharge below and restricts the Stripe session to card only, so the
// parent is never offered a different payment method than the one their
// quoted total (with or without the surcharge) actually reflects.
// Creates a Stripe Checkout Session and returns its hosted URL. Amount is computed
// server-side by /api/price beforehand -- the client only ever passes back a value
// it already saw and confirmed, never something it invents; the card surcharge is
// then applied here, server-side, never trusted from the client. The booking details
// are carried as Stripe metadata so /api/webhook can turn a completed payment into a
// trip record for the driver dashboard (see docs/04-website-booking-system.md).

import { getPastDue } from "../_lib/pastDue.js";

// Card payments carry a 3% surcharge to cover processing cost; bank transfer
// (ACH) does not. Applied here, server-side, rather than trusting a client-
// computed total -- the client only ever sends the base /api/price amount.
const CARD_SURCHARGE_RATE = 0.03;

const METADATA_FIELDS = [
  "category", "childName", "childAge", "childGrade", "parentName", "parentPhone",
  "pickupAddress", "dropoffAddress", "activityAddress", "startDate", "pickupTime", "dropoffTime", "instructions",
];

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const { amount, description, customerEmail, category, autoPay, paymentMethod } = body || {};
  const amountNum = Number(amount);
  if (!amountNum || amountNum <= 0 || amountNum > 5000) {
    return json({ error: "Invalid amount." }, 400);
  }

  const wantsCard = paymentMethod !== "bank_transfer";
  const chargeAmount = wantsCard ? round2(amountNum * (1 + CARD_SURCHARGE_RATE)) : amountNum;

  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return json({ error: "Online payment isn't active yet. Please contact us to complete your booking." }, 503);
  }

  if (customerEmail && env.TRIPS_KV) {
    const pastDue = await getPastDue(env, customerEmail);
    if (pastDue > 0) {
      return json({
        error: `Your account has a past due balance of $${pastDue.toFixed(2)} from a failed bank transfer. Please pay this from the parent portal before booking another trip.`,
      }, 402);
    }
  }

  const siteUrl = env.SITE_URL || new URL(request.url).origin;
  const amountCents = Math.round(chargeAmount * 100);
  // Monthly plans can auto-renew as a true Stripe subscription (billed on
  // the same calendar date every month), but only if the parent explicitly
  // checked the auto-pay box on the booking form -- left unchecked, even a
  // monthly-category booking is just a single one-time payment for that
  // month, same as one-way/round-trip/weekly.
  const isMonthly = String(category || "").toLowerCase().startsWith("monthly");
  const useSubscription = isMonthly && autoPay === true;

  const lineItemName = wantsCard
    ? `${description || "Lake County Student Rides — Booking"} (includes 3% card processing fee)`
    : (description || "Lake County Student Rides — Booking");

  const params = new URLSearchParams();
  params.append("mode", useSubscription ? "subscription" : "payment");
  // Only the payment method the parent actually chose (and was quoted a price
  // for) is offered here -- bank transfer (ACH) costs 0.8% capped at $5 with
  // no surcharge, vs. cards which carry the 3% surcharge above to cover the
  // ~2.9% + $0.30 processing cost. ACH settles in a few business days rather
  // than instantly, which is why webhook.js has to also watch for
  // checkout.session.async_payment_succeeded/failed instead of trusting
  // checkout.session.completed alone.
  params.append("payment_method_types[0]", wantsCard ? "card" : "us_bank_account");
  params.append("success_url", `${siteUrl}/booking-success.html?session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${siteUrl}/book.html`);
  params.append("line_items[0][price_data][currency]", "usd");
  params.append("line_items[0][price_data][product_data][name]", lineItemName);
  params.append("line_items[0][price_data][unit_amount]", String(amountCents));
  if (useSubscription) params.append("line_items[0][price_data][recurring][interval]", "month");
  params.append("line_items[0][quantity]", "1");
  if (customerEmail) params.append("customer_email", customerEmail);

  params.append("metadata[paymentMethod]", wantsCard ? "card" : "bank_transfer");
  if (wantsCard) params.append("metadata[cardSurchargeAmount]", String(round2(chargeAmount - amountNum)));

  for (const field of METADATA_FIELDS) {
    const value = body?.[field];
    if (value) params.append(`metadata[${field}]`, String(value).slice(0, 480));
  }

  let res, session;
  try {
    res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    session = await res.json();
  } catch {
    return json({ error: "Unable to reach the payment processor. Please try again." }, 502);
  }

  if (!res.ok) {
    return json({ error: session.error?.message || "Unable to start checkout." }, 502);
  }

  return json({ url: session.url });
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
