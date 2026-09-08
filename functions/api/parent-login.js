// POST /api/parent-login -- Body: { email, password }

import { verifyPassword } from "../_lib/password.js";
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
  if (!email || !password) {
    return json({ error: "Incorrect email or password." }, 401);
  }
  if (!env.TRIPS_KV || !env.PARENT_SESSION_SECRET) {
    return json({ error: "Sign-in isn't configured yet." }, 503);
  }

  const raw = await env.TRIPS_KV.get(`parent:${email}`);
  if (!raw) {
    return json({ error: "Incorrect email or password." }, 401);
  }

  const account = JSON.parse(raw);
  const valid = await verifyPassword(password, account.passwordHash);
  if (!valid) {
    return json({ error: "Incorrect email or password." }, 401);
  }

  const cookie = await createSessionCookie(email, env.PARENT_SESSION_SECRET);
  return json({ ok: true }, 200, cookie);
}

function json(obj, status = 200, cookie) {
  const headers = { "content-type": "application/json" };
  if (cookie) headers["set-cookie"] = cookie;
  return new Response(JSON.stringify(obj), { status, headers });
}
