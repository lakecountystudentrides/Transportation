// POST /api/parent-signup -- Body: { email, password }
// Creates a parent account (stored in TRIPS_KV under "parent:<email>") and
// signs the caller in. A parent's trips are matched by email at read time
// (see /api/parent-trips) -- no separate linking step needed at booking time.

import { hashPassword } from "../_lib/password.js";
import { createSessionCookie } from "../_lib/session.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  if (!isValidEmail(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }
  if (password.length < 8) {
    return json({ error: "Password must be at least 8 characters." }, 400);
  }
  if (!env.TRIPS_KV || !env.PARENT_SESSION_SECRET) {
    return json({ error: "Account sign-up isn't configured yet." }, 503);
  }

  const key = `parent:${email}`;
  const existing = await env.TRIPS_KV.get(key);
  if (existing) {
    return json({ error: "An account with this email already exists. Please sign in instead." }, 409);
  }

  const passwordHash = await hashPassword(password);
  await env.TRIPS_KV.put(key, JSON.stringify({ email, passwordHash, createdAt: new Date().toISOString() }));

  const cookie = await createSessionCookie(email, env.PARENT_SESSION_SECRET);
  return json({ ok: true }, 200, cookie);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function json(obj, status = 200, cookie) {
  const headers = { "content-type": "application/json" };
  if (cookie) headers["set-cookie"] = cookie;
  return new Response(JSON.stringify(obj), { status, headers });
}
