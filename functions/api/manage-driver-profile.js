// GET /api/manage-driver-profile?code=<code> -- owner-only. Returns one
// driver's personal info (contact, license, vehicle, emergency contact,
// hire date, photo) for the edit form on /manage-drivers.html.
// POST /api/manage-driver-profile -- owner-only. Body: { code, lang, ...fields }
// Saves the same fields back onto that driver's KV record. Drivers can
// view this (see /api/driver-profile) but never edit it themselves --
// the owner is the only one who updates it.

import { verifyOwnerSessionCookie } from "../_lib/ownerSession.js";

const MAX_TEXT_LENGTH = 200;
const MAX_PHOTO_LENGTH = 400000; // ~300KB raw -- keeps driver KV records fast to read

const PROFILE_FIELDS = [
  "phone", "email", "address",
  "licenseNumber", "licenseExpiration",
  "vehicleMake", "vehicleModel", "vehiclePlate",
  "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship",
  "hireDate", "payRate",
];

export async function onRequestGet({ request, env }) {
  const owner = await requireOwner(request, env);
  if (owner instanceof Response) return owner;

  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const record = await getDriver(env, code);
  if (!record) return json({ error: "Driver not found." }, 404);

  return json({ name: record.name, profile: record.profile || {} });
}

export async function onRequestPost({ request, env }) {
  const owner = await requireOwner(request, env);
  if (owner instanceof Response) return owner;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const isEs = body?.lang === "es";

  const code = String(body?.code || "");
  const record = await getDriver(env, code);
  if (!record) return json({ error: isEs ? "Conductor no encontrado." : "Driver not found." }, 404);

  const photo = body?.photo ? String(body.photo) : "";
  if (photo && photo.length > MAX_PHOTO_LENGTH) {
    return json({ error: isEs ? "Esa foto es demasiado grande. Por favor use una imagen más pequeña." : "That photo is too large. Please use a smaller image." }, 400);
  }

  const profile = { photo };
  for (const field of PROFILE_FIELDS) {
    profile[field] = text(body?.[field]);
  }

  record.profile = profile;
  await env.TRIPS_KV.put(`driver:${code}`, JSON.stringify(record));

  return json({ ok: true });
}

function text(v) {
  return String(v || "").trim().slice(0, MAX_TEXT_LENGTH);
}

async function getDriver(env, code) {
  if (!code || !env.TRIPS_KV) return null;
  const raw = await env.TRIPS_KV.get(`driver:${code}`);
  return raw ? JSON.parse(raw) : null;
}

async function requireOwner(request, env) {
  if (!env.OWNER_SESSION_SECRET) return json({ error: "Owner login isn't configured yet." }, 503);
  const username = await verifyOwnerSessionCookie(request.headers.get("cookie"), env.OWNER_SESSION_SECRET);
  if (!username) return json({ error: "Unauthorized" }, 401);
  if (!env.TRIPS_KV) return json({ error: "Trip storage not configured" }, 503);
  return username;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
