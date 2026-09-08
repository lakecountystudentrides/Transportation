// GET /api/parent-trips -- returns the signed-in parent's trip history
// (dates, route, status, amount paid), matched by email against trip records
// saved by /api/webhook. Requires a valid parent session cookie.

import { verifySessionCookie } from "../_lib/session.js";

export async function onRequestGet({ request, env }) {
  if (!env.PARENT_SESSION_SECRET) {
    return json({ error: "Sign-in isn't configured yet." }, 503);
  }
  const email = await verifySessionCookie(request.headers.get("cookie"), env.PARENT_SESSION_SECRET);
  if (!email) {
    return json({ error: "Please sign in again." }, 401);
  }
  if (!env.TRIPS_KV) {
    return json({ error: "Trip storage not configured" }, 503);
  }

  const indexRaw = await env.TRIPS_KV.get("trip-index");
  const index = indexRaw ? JSON.parse(indexRaw) : [];

  const trips = [];
  for (const id of index) {
    const raw = await env.TRIPS_KV.get(`trip:${id}`);
    if (!raw) continue;
    const trip = JSON.parse(raw);
    if ((trip.parentEmail || "").toLowerCase() === email) trips.push(trip);
  }

  return json({ trips });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
