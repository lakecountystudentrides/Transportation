// POST /api/cancel-subscription -- Body: { tripId }
// Cancels a parent's monthly plan at the end of the already-paid billing
// period (no further charges, but the current period isn't cut short).
// Requires a valid parent session cookie, and the trip must belong to that
// parent's email.

import { verifySessionCookie } from "../_lib/session.js";

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

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const tripId = String(body?.tripId || "");
  const raw = tripId ? await env.TRIPS_KV.get(`trip:${tripId}`) : null;
  if (!raw) {
    return json({ error: "Trip not found." }, 404);
  }

  const trip = JSON.parse(raw);
  if ((trip.parentEmail || "").toLowerCase() !== email) {
    return json({ error: "Not authorized." }, 403);
  }
  if (!trip.subscriptionId) {
    return json({ error: "This trip isn't a monthly plan." }, 400);
  }

  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return json({ error: "Online payment isn't active yet. Please contact us directly." }, 503);
  }

  let res;
  try {
    res = await fetch(`https://api.stripe.com/v1/subscriptions/${trip.subscriptionId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "cancel_at_period_end=true",
    });
  } catch {
    return json({ error: "Unable to reach the payment processor. Please try again." }, 502);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return json({ error: data.error?.message || "Unable to cancel the plan." }, 502);
  }

  trip.cancelPending = true;
  await env.TRIPS_KV.put(`trip:${tripId}`, JSON.stringify(trip));

  return json({ ok: true });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
