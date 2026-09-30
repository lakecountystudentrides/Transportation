// POST /api/cancel-subscription -- Body: { tripId }
// Cancels a parent's monthly plan at the end of the already-paid billing
// period (no further charges, but the current period isn't cut short).
// Requires a valid parent session cookie, and the trip must belong to that
// parent's email.

import { verifySessionCookie } from "../_lib/session.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const isEs = body?.lang === "es";

  if (!env.PARENT_SESSION_SECRET) {
    return json({ error: isEs ? "El inicio de sesión aún no está configurado." : "Sign-in isn't configured yet." }, 503);
  }
  const email = await verifySessionCookie(request.headers.get("cookie"), env.PARENT_SESSION_SECRET);
  if (!email) {
    return json({ error: isEs ? "Por favor inicie sesión de nuevo." : "Please sign in again." }, 401);
  }
  if (!env.TRIPS_KV) {
    return json({ error: isEs ? "El almacenamiento de viajes no está configurado" : "Trip storage not configured" }, 503);
  }

  const tripId = String(body?.tripId || "");
  const raw = tripId ? await env.TRIPS_KV.get(`trip:${tripId}`) : null;
  if (!raw) {
    return json({ error: isEs ? "Viaje no encontrado." : "Trip not found." }, 404);
  }

  const trip = JSON.parse(raw);
  if ((trip.parentEmail || "").toLowerCase() !== email) {
    return json({ error: isEs ? "No autorizado." : "Not authorized." }, 403);
  }
  if (!trip.subscriptionId) {
    return json({ error: isEs ? "Este viaje no es un plan mensual." : "This trip isn't a monthly plan." }, 400);
  }

  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return json({ error: isEs ? "El pago en línea aún no está activo. Por favor contáctenos directamente." : "Online payment isn't active yet. Please contact us directly." }, 503);
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
    return json({ error: isEs ? "No se pudo conectar con el procesador de pagos. Por favor intente de nuevo." : "Unable to reach the payment processor. Please try again." }, 502);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return json({ error: data.error?.message || (isEs ? "No se pudo cancelar el plan." : "Unable to cancel the plan.") }, 502);
  }

  trip.cancelPending = true;
  await env.TRIPS_KV.put(`trip:${tripId}`, JSON.stringify(trip));

  return json({ ok: true });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
