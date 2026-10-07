// GET /api/w4-status -- whether the driver has submitted their W-4 PDF.
// POST /api/w4-status -- Body: { lang }. Marks it submitted with a
// timestamp. Requires header: x-driver-token (see functions/_lib/driverAuth.js).
//
// Deliberately stores nothing about the W-4 itself -- no SSN, no filing
// status, no dependents, nothing from the form. The actual completed W-4
// PDF is generated entirely in the driver's browser (see
// assets/driver-w4.js) and never sent to this site; this endpoint only
// records that the step happened, so the manager page can show who has
// and hasn't turned one in.

import { getDriverIdentity } from "../_lib/driverAuth.js";

export async function onRequestGet({ request, env }) {
  const identity = await getDriverIdentity(env, request.headers.get("x-driver-token"));
  if (!identity) return json({ error: "Unauthorized" }, 401);
  if (!env.TRIPS_KV) return json({ error: "Trip storage not configured" }, 503);

  const record = await getDriver(env, identity.code);
  return json({ w4: record?.w4 || { submitted: false, submittedAt: null } });
}

export async function onRequestPost({ request, env }) {
  const identity = await getDriverIdentity(env, request.headers.get("x-driver-token"));
  if (!identity) return json({ error: "Unauthorized" }, 401);
  if (!env.TRIPS_KV) return json({ error: "Trip storage not configured" }, 503);

  const record = await getDriver(env, identity.code);
  if (!record) return json({ error: "Driver not found." }, 404);

  record.w4 = { submitted: true, submittedAt: new Date().toISOString() };
  await env.TRIPS_KV.put(`driver:${identity.code}`, JSON.stringify(record));

  return json({ ok: true, w4: record.w4 });
}

async function getDriver(env, code) {
  const raw = await env.TRIPS_KV.get(`driver:${code}`);
  return raw ? JSON.parse(raw) : null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
