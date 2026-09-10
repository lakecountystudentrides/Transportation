// POST /api/owner-logout -- clears the owner session cookie.

import { clearOwnerSessionCookie } from "../_lib/ownerSession.js";

export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json", "set-cookie": clearOwnerSessionCookie() },
  });
}
