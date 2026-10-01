// GET /api/time-log -- every driver's clock status and daily hours, for the
// owner's Time Clock section on /manage-drivers.html. Requires a valid
// owner session cookie (see /api/owner-login) -- separate from the driver
// dashboard's token auth.

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

  const list = await env.TRIPS_KV.list({ prefix: "timeclock:" });
  const drivers = [];
  for (const key of list.keys) {
    const raw = await env.TRIPS_KV.get(key.name);
    if (!raw) continue;
    const record = JSON.parse(raw);
    drivers.push({
      code: key.name.slice("timeclock:".length),
      name: record.name || "Driver",
      status: record.status,
      currentShiftStart: record.currentShiftStart,
      days: record.days || {},
    });
  }
  drivers.sort((a, b) => a.name.localeCompare(b.name));

  return json({ drivers });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
