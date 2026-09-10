// GET /api/owner-trips -- returns all trips for the owner's Today's Roster
// view on /manage-drivers.html. Requires a valid owner session cookie (see
// /api/owner-login) -- separate from the driver dashboard's token auth.

import { verifyOwnerSessionCookie } from "../_lib/ownerSession.js";

export async function onRequestGet({ request, env }) {
  if (!env.OWNER_SESSION_SECRET) {
    return json({ error: "Owner login isn't configured yet." }, 503);
  }
  const username = await verifyOwnerSessionCookie(request.headers.get("cookie"), env.OWNER_SESSION_SECRET);
  if (!username) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!env.TRIPS_KV) {
    return json({ error: "Trip storage not configured" }, 503);
  }

  const indexRaw = await env.TRIPS_KV.get("trip-index");
  const index = indexRaw ? JSON.parse(indexRaw) : [];

  const trips = [];
  for (const id of index.slice(0, 200)) {
    const raw = await env.TRIPS_KV.get(`trip:${id}`);
    if (raw) trips.push(JSON.parse(raw));
  }

  return json({ trips });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
