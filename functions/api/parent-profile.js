// GET/POST /api/parent-profile -- requires a valid parent session cookie.
// Stores each parent's children (name + photo), emergency contacts, and
// authorized pickup/drop-off adults -- each a list, since a family can have
// more than one child, emergency contact, or authorized adult. Merged into
// the existing "parent:<email>" KV record alongside passwordHash -- the same
// record functions/api/parent-*.js already reads/writes, never a separate one.
//
// functions/api/trips.js and functions/api/owner-trips.js read this record
// to attach a trip's child photo and the family's emergency/authorized
// contacts to each trip, so drivers and the owner see it without the parent
// having to send it separately.

import { verifySessionCookie } from "../_lib/session.js";

const MAX_ENTRIES = 8;
const MAX_TEXT_LENGTH = 200;
const MAX_PHOTO_LENGTH = 400000; // ~300KB raw -- keeps parent KV records and every trip lookup fast

export async function onRequestGet({ request, env }) {
  const email = await requireEmail(request, env);
  if (email instanceof Response) return email;

  const record = await getParentRecord(env, email);
  return json({
    children: record?.children || [],
    emergencyContacts: record?.emergencyContacts || [],
    authorizedPickups: record?.authorizedPickups || [],
  });
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
  const isEs = body?.lang === "es";

  const key = `parent:${email}`;
  const record = await getParentRecord(env, email);
  if (!record) {
    return json({ error: isEs ? "Cuenta no encontrada." : "Account not found." }, 404);
  }

  const children = sanitizeList(body?.children, (c) => {
    if (c.photo && String(c.photo).length > MAX_PHOTO_LENGTH) {
      throw new Error(isEs ? "Una de las fotos de los niños es demasiado grande. Por favor use una foto más pequeña." : "One of the child photos is too large. Please use a smaller photo.");
    }
    return { name: text(c.name), photo: c.photo ? String(c.photo) : "" };
  }, isEs);
  if (children instanceof Response) return children;

  const emergencyContacts = sanitizeList(body?.emergencyContacts, (c) => ({
    name: text(c.name), phone: text(c.phone), relationship: text(c.relationship),
  }), isEs);
  if (emergencyContacts instanceof Response) return emergencyContacts;

  const authorizedPickups = sanitizeList(body?.authorizedPickups, (c) => ({
    name: text(c.name), phone: text(c.phone), relationship: text(c.relationship),
  }), isEs);
  if (authorizedPickups instanceof Response) return authorizedPickups;

  if (body?.children !== undefined) record.children = children;
  if (body?.emergencyContacts !== undefined) record.emergencyContacts = emergencyContacts;
  if (body?.authorizedPickups !== undefined) record.authorizedPickups = authorizedPickups;

  await env.TRIPS_KV.put(key, JSON.stringify(record));
  return json({ ok: true });
}

// Trims each entry to MAX_ENTRIES, drops fully-blank entries, and applies
// `mapFn` to shape/validate each one. Returns a Response on validation
// failure instead of throwing, so callers can `return` it directly.
function sanitizeList(list, mapFn, isEs) {
  if (list === undefined) return [];
  if (!Array.isArray(list)) return json({ error: isEs ? "Solicitud inválida." : "Invalid request." }, 400);
  try {
    return list
      .slice(0, MAX_ENTRIES)
      .map(mapFn)
      .filter((entry) => Object.values(entry).some((v) => v));
  } catch (err) {
    return json({ error: err.message || (isEs ? "Solicitud inválida." : "Invalid request.") }, 400);
  }
}

function text(v) {
  return String(v || "").trim().slice(0, MAX_TEXT_LENGTH);
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
