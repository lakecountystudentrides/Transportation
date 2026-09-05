// POST /api/checkout
// Body: { amount: number (dollars), description: string, customerEmail?: string }
// Creates a Stripe Checkout Session and returns its hosted URL. Amount is computed
// server-side by /api/price beforehand -- the client only ever passes back a value
// it already saw and confirmed, never something it invents.

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const { amount, description, customerEmail } = body || {};
  const amountNum = Number(amount);
  if (!amountNum || amountNum <= 0 || amountNum > 5000) {
    return json({ error: "Invalid amount." }, 400);
  }

  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return json({ error: "Online payment isn't active yet. Please contact us to complete your booking." }, 503);
  }

  const siteUrl = env.SITE_URL || new URL(request.url).origin;
  const amountCents = Math.round(amountNum * 100);

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("success_url", `${siteUrl}/booking-success.html?session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${siteUrl}/book.html`);
  params.append("line_items[0][price_data][currency]", "usd");
  params.append("line_items[0][price_data][product_data][name]", description || "Lake County Student Rides — Booking");
  params.append("line_items[0][price_data][unit_amount]", String(amountCents));
  params.append("line_items[0][quantity]", "1");
  if (customerEmail) params.append("customer_email", customerEmail);

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
