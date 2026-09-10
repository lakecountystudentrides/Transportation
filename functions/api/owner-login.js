// POST /api/owner-login -- Body: { username, password }
// Signs into /manage-drivers.html. Credentials are set directly in
// Cloudflare Pages as OWNER_USERNAME and OWNER_PASSWORD -- not stored in
// this repo, not a per-user account system (there's only one owner).

import { createOwnerSessionCookie } from "../_lib/ownerSession.js";

export async function onRequestPost({ request, env }) {
  if (!env.OWNER_USERNAME || !env.OWNER_PASSWORD || !env.OWNER_SESSION_SECRET) {
    return json({ error: "Owner login isn't configured yet." }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const username = String(body?.username || "");
  const password = String(body?.password || "");

  const usernameOk = timingSafeEqual(username, env.OWNER_USERNAME);
  const passwordOk = timingSafeEqual(password, env.OWNER_PASSWORD);
  if (!usernameOk || !passwordOk) {
    return json({ error: "Incorrect username or password." }, 401);
  }

  const cookie = await createOwnerSessionCookie(username, env.OWNER_SESSION_SECRET);
  return json({ ok: true }, 200, cookie);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function json(obj, status = 200, cookie) {
  const headers = { "content-type": "application/json" };
  if (cookie) headers["set-cookie"] = cookie;
  return new Response(JSON.stringify(obj), { status, headers });
}
