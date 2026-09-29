// GET/POST /api/parent-profile -- requires a valid parent session cookie.
// Stores each parent's emergency contact and authorized pickup/drop-off
// adult, merged into their existing "parent:<email>" KV record alongside
// their passwordHash -- this is the same record functions/api/parent-*.js
// already reads/writes, never a separate one.

import { verifySessionCookie } from "../_lib/session.js";

const FIELDS = [
  "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship",
  "authorizedPickupName", "authorizedPickupPhone", "authorizedPickupRelationship",
];

export async function onRequestGet({ request, env }) {
  const email = await requireEmail(request, env);
  if (email instanceof Response) return email;

  const record = await getParentRecord(env, email);
  const profile = {};
  for (const field of FIELDS) profile[field] = record?.[field] || "";
  return json({ profile });
}

export async function onRequestPost({ request, env }) {
  const email = await requireEmail(request, env);
  if (email instanceof Response) return email;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const key = `parent:${email}`;
  const record = await getParentRecord(env, email);
  if (!record) {
    return json({ error: "Account not found." }, 404);
  }

  for (const field of FIELDS) {
    if (body?.[field] !== undefined) record[field] = String(body[field]).trim().slice(0, 200);
  }
  await env.TRIPS_KV.put(key, JSON.stringify(record));

  return json({ ok: true });
}

async function requireEmail(request, env) {
  if (!env.PARENT_SESSION_SECRET) {
    return json({ error: "Sign-in isn't configured yet." }, 503);
  }
  const email = await verifySessionCookie(request.headers.get("cookie"), env.PARENT_SESSION_SECRET);
  if (!email) {
    return json({ error: "Please sign in again." }, 401);
  }
  if (!env.TRIPS_KV) {
    return json({ error: "Account storage not configured" }, 503);
  }
  return email;
}

async function getParentRecord(env, email) {
  const raw = await env.TRIPS_KV.get(`parent:${email}`);
  return raw ? JSON.parse(raw) : null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
