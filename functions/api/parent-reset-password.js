// POST /api/parent-reset-password -- Body: { token, password }
// Completes a password reset started by /api/parent-forgot-password.

import { verifyResetToken } from "../_lib/resetToken.js";
import { hashPassword } from "../_lib/password.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const token = String(body?.token || "");
  const password = String(body?.password || "");

  if (password.length < 8) {
    return json({ error: "Password must be at least 8 characters." }, 400);
  }
  if (!env.TRIPS_KV || !env.PARENT_SESSION_SECRET) {
    return json({ error: "Password reset isn't configured yet." }, 503);
  }

  const email = await verifyResetToken(token, env.PARENT_SESSION_SECRET);
  if (!email) {
    return json({ error: "This reset link is invalid or has expired. Please request a new one." }, 400);
  }

  const key = `parent:${email}`;
  const raw = await env.TRIPS_KV.get(key);
  if (!raw) {
    return json({ error: "This reset link is invalid or has expired. Please request a new one." }, 400);
  }

  const account = JSON.parse(raw);
  account.passwordHash = await hashPassword(password);
  await env.TRIPS_KV.put(key, JSON.stringify(account));

  return json({ ok: true });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
