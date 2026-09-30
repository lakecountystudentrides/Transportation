// POST /api/pay-past-due -- requires a valid parent session cookie.
// Body: { paymentMethod, lang } -- paymentMethod is "credit_card" (default),
// "debit_card", or "bank_transfer"; lang is "en" (default) or "es".
// Creates a Stripe Checkout Session for the parent's full past-due balance
// (from a previously failed bank transfer). Does not create a trip record --
// functions/api/webhook.js clears the balance on success instead, matched by
// metadata.type === "past_due_payoff".

import { verifySessionCookie } from "../_lib/session.js";
import { getPastDue } from "../_lib/pastDue.js";

// Must match functions/api/checkout.js -- only a credit card carries a 3%
// surcharge; debit card and bank transfer (ACH) do not (Florida law doesn't
// allow surcharging debit cards).
const CARD_SURCHARGE_RATE = 0.03;

export async function onRequestPost({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch {}
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

  const isBankTransfer = body?.paymentMethod === "bank_transfer";
  const isDebitCard = body?.paymentMethod === "debit_card";
  const isCard = !isBankTransfer; // covers credit_card, debit_card, and any missing/unrecognized value
  const isCreditCard = isCard && !isDebitCard; // surcharge applies unless explicitly debit or bank transfer

  const pastDue = await getPastDue(env, email);
  if (pastDue <= 0) {
    return json({ error: isEs ? "No tiene ningún saldo pendiente." : "You don't have a past due balance." }, 400);
  }
  const chargeAmount = isCreditCard ? round2(pastDue * (1 + CARD_SURCHARGE_RATE)) : pastDue;

  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return json({ error: isEs ? "El pago en línea aún no está activo. Por favor contáctenos directamente." : "Online payment isn't active yet. Please contact us directly." }, 503);
  }

  const siteUrl = env.SITE_URL || new URL(request.url).origin;
  const amountCents = Math.round(chargeAmount * 100);
  const lineItemName = isEs
    ? (isCreditCard
        ? "Lake County Student Rides — Saldo Pendiente (incluye 3% de cargo por procesamiento de tarjeta de crédito)"
        : "Lake County Student Rides — Saldo Pendiente")
    : (isCreditCard
        ? "Lake County Student Rides — Past Due Balance (includes 3% credit card processing fee)"
        : "Lake County Student Rides — Past Due Balance");

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("payment_method_types[0]", isCard ? "card" : "us_bank_account");
  params.append("success_url", `${siteUrl}/parent-portal.html`);
  params.append("cancel_url", `${siteUrl}/parent-portal.html`);
  params.append("customer_email", email);
  params.append("line_items[0][price_data][currency]", "usd");
  params.append("line_items[0][price_data][product_data][name]", lineItemName);
  params.append("line_items[0][price_data][unit_amount]", String(amountCents));
  params.append("line_items[0][quantity]", "1");
  params.append("metadata[type]", "past_due_payoff");
  params.append("metadata[email]", email);
  params.append("metadata[paymentMethod]", isBankTransfer ? "bank_transfer" : (isDebitCard ? "debit_card" : "credit_card"));

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
    return json({ error: isEs ? "No se pudo conectar con el procesador de pagos. Por favor intente de nuevo." : "Unable to reach the payment processor. Please try again." }, 502);
  }

  if (!res.ok) {
    return json({ error: session.error?.message || (isEs ? "No se pudo iniciar el pago." : "Unable to start checkout.") }, 502);
  }

  return json({ url: session.url });
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
