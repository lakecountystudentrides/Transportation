// GET /api/driver-profile -- the driver's own personal info, view-only, for
// the Personal Information page at /driver-profile.html. Requires header:
// x-driver-token (see functions/_lib/driverAuth.js). The owner is the only
// one who can edit this (see /api/manage-driver-profile).

import { getDriverIdentity } from "../_lib/driverAuth.js";

export async function onRequestGet({ request, env }) {
  const identity = await getDriverIdentity(env, request.headers.get("x-driver-token"));
  if (!identity) return json({ error: "Unauthorized" }, 401);
  if (!env.TRIPS_KV) return json({ error: "Trip storage not configured" }, 503);

  const raw = await env.TRIPS_KV.get(`driver:${identity.code}`);
  const record = raw ? JSON.parse(raw) : null;

  return json({ name: identity.name, profile: record?.profile || {} });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
