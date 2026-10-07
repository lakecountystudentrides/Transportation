// GET /api/driver-profile -- the driver's own personal info, for the
// Personal Information page at /driver-profile.html.
// POST /api/driver-profile -- Body: { lang, phone, email, address,
//   emergencyContactName, emergencyContactPhone, emergencyContactRelationship }
// Drivers can self-edit their own contact info and emergency contact right
// from this page; license, vehicle, hire date, and photo stay manager-only
// (see /api/manage-driver-profile) since those need the owner's records to
// stay authoritative.
// Requires header: x-driver-token (see functions/_lib/driverAuth.js).

import { getDriverIdentity } from "../_lib/driverAuth.js";

const MAX_TEXT_LENGTH = 200;
const DRIVER_EDITABLE_FIELDS = [
  "phone", "email", "address",
  "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship",
];

export async function onRequestGet({ request, env }) {
  const identity = await getDriverIdentity(env, request.headers.get("x-driver-token"));
  if (!identity) return json({ error: "Unauthorized" }, 401);
  if (!env.TRIPS_KV) return json({ error: "Trip storage not configured" }, 503);

  const raw = await env.TRIPS_KV.get(`driver:${identity.code}`);
  const record = raw ? JSON.parse(raw) : null;

  return json({ name: identity.name, profile: record?.profile || {} });
}

export async function onRequestPost({ request, env }) {
  const identity = await getDriverIdentity(env, request.headers.get("x-driver-token"));
  if (!identity) return json({ error: "Unauthorized" }, 401);
  if (!env.TRIPS_KV) return json({ error: "Trip storage not configured" }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const isEs = body?.lang === "es";

  const raw = await env.TRIPS_KV.get(`driver:${identity.code}`);
  const record = raw ? JSON.parse(raw) : null;
  if (!record) return json({ error: isEs ? "Conductor no encontrado." : "Driver not found." }, 404);

  record.profile = record.profile || {};
  for (const field of DRIVER_EDITABLE_FIELDS) {
    record.profile[field] = text(body?.[field]);
  }

  await env.TRIPS_KV.put(`driver:${identity.code}`, JSON.stringify(record));
  return json({ ok: true, profile: record.profile });
}

function text(v) {
  return String(v || "").trim().slice(0, MAX_TEXT_LENGTH);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
