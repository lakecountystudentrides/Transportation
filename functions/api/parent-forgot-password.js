// POST /api/parent-forgot-password -- Body: { email }
// Always responds with the same generic success message, whether or not an
// account exists for that email, so this endpoint can't be used to discover
// which emails have accounts. If the account exists, emails a reset link.

import { createResetToken } from "../_lib/resetToken.js";
import { sendEmail, escapeHtml } from "../_lib/email.js";

const GENERIC_MESSAGE = "If an account exists for that email, we've sent a link to reset your password.";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const email = String(body?.email || "").trim().toLowerCase();
  if (!email) {
    return json({ message: GENERIC_MESSAGE });
  }
  if (!env.TRIPS_KV || !env.PARENT_SESSION_SECRET) {
    return json({ error: "Password reset isn't configured yet." }, 503);
  }

  const raw = await env.TRIPS_KV.get(`parent:${email}`);
  if (raw) {
    const token = await createResetToken(email, env.PARENT_SESSION_SECRET);
    const siteUrl = env.SITE_URL || new URL(request.url).origin;
    const resetLink = `${siteUrl}/reset-password.html?token=${encodeURIComponent(token)}`;

    await sendEmail(env, {
      to: email,
      subject: "Reset your Lake County Student Rides password",
      html: `
        <p>We received a request to reset the password for your Lake County Student Rides parent account.</p>
        <p><a href="${escapeHtml(resetLink)}">Click here to choose a new password</a></p>
        <p>This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  }

  return json({ message: GENERIC_MESSAGE });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
