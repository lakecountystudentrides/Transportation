// POST /api/pay-past-due -- requires a valid parent session cookie.
// Creates a Stripe Checkout Session for the parent's full past-due balance
// (from a previously failed bank transfer). Does not create a trip record --
// functions/api/webhook.js clears the balance on success instead, matched by
// metadata.type === "past_due_payoff".

import { verifySessionCookie } from "../_lib/session.js";
import { getPastDue } from "../_lib/pastDue.js";

export async function onRequestPost({ request, env }) {
  if (!env.PARENT_SESSION_SECRET) {
    return json({ error: "Sign-in isn't configured yet." }, 503);
  }
  const email = await verifySessionCookie(request.headers.get("cookie"), env.PARENT_SESSION_SECRET);
  if (!email) {
    return json({ error: "Please sign in again." }, 401);
  }
  if (!env.TRIPS_KV) {
    return json({ error: "Trip storage not configured" }, 503);
  }

  const pastDue = await getPastDue(env, email);
  if (pastDue <= 0) {
    return json({ error: "You don't have a past due balance." }, 400);
  }

  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return json({ error: "Online payment isn't active yet. Please contact us directly." }, 503);
  }

  const siteUrl = env.SITE_URL || new URL(request.url).origin;
  const amountCents = Math.round(pastDue * 100);

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("payment_method_types[0]", "card");
  params.append("payment_method_types[1]", "us_bank_account");
  params.append("success_url", `${siteUrl}/parent-portal.html`);
  params.append("cancel_url", `${siteUrl}/parent-portal.html`);
  params.append("customer_email", email);
  params.append("line_items[0][price_data][currency]", "usd");
  params.append("line_items[0][price_data][product_data][name]", "Lake County Student Rides — Past Due Balance");
  params.append("line_items[0][price_data][unit_amount]", String(amountCents));
  params.append("line_items[0][quantity]", "1");
  params.append("metadata[type]", "past_due_payoff");
  params.append("metadata[email]", email);

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

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
