// GET /api/clock -- driver's own current clock status (for page load/refresh).
// POST /api/clock -- Body: { action: "in" | "out", lang }
// Requires header: x-driver-token (see functions/_lib/driverAuth.js).
//
// Each driver's record lives at "timeclock:<code>" and tracks a running
// status plus a per-day shift log so the manager can see hours for payroll.
// A shift is always attributed to the Florida-time day it started on, even
// if the driver clocks out after midnight, so a single overnight shift
// never gets split across two days.

import { getDriverIdentity } from "../_lib/driverAuth.js";

const MAX_DAYS_KEPT = 60;

export async function onRequestGet({ request, env }) {
  const identity = await getDriverIdentity(env, request.headers.get("x-driver-token"));
  if (!identity) return json({ error: "Unauthorized" }, 401);
  if (!env.TRIPS_KV) return json({ error: "Trip storage not configured" }, 503);

  const record = await getRecord(env, identity.code);
  const todayKey = floridaDateKey(new Date());
  return json({
    status: record.status,
    currentShiftStart: record.currentShiftStart,
    today: record.days[todayKey] || null,
  });
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
  const action = body?.action;
  if (!["in", "out"].includes(action)) {
    return json({ error: isEs ? "Solicitud inválida." : "Invalid request." }, 400);
  }

  const record = await getRecord(env, identity.code);
  record.name = identity.name;
  const now = new Date();

  if (action === "in") {
    if (record.status === "in") {
      return json({ error: isEs ? "Ya está marcado como presente." : "You're already clocked in." }, 400);
    }
    const dayKey = floridaDateKey(now);
    record.status = "in";
    record.currentShiftStart = now.toISOString();
    record.currentShiftDayKey = dayKey;
    const day = record.days[dayKey] || { shifts: [], hours: 0 };
    day.shifts.push({ in: now.toISOString(), out: null });
    record.days[dayKey] = day;
  } else {
    if (record.status !== "in" || !record.currentShiftDayKey) {
      return json({ error: isEs ? "No está marcado como presente." : "You're not clocked in." }, 400);
    }
    const day = record.days[record.currentShiftDayKey];
    const shift = day?.shifts[day.shifts.length - 1];
    if (shift) {
      shift.out = now.toISOString();
      const hours = (now - new Date(shift.in)) / 3600000;
      day.hours = round2((day.hours || 0) + hours);
    }
    record.status = "out";
    record.currentShiftStart = null;
    record.currentShiftDayKey = null;
  }

  trimOldDays(record);
  await env.TRIPS_KV.put(`timeclock:${identity.code}`, JSON.stringify(record));

  const todayKey = floridaDateKey(now);
  return json({
    ok: true,
    status: record.status,
    currentShiftStart: record.currentShiftStart,
    today: record.days[todayKey] || null,
  });
}

async function getRecord(env, code) {
  const raw = await env.TRIPS_KV.get(`timeclock:${code}`);
  if (raw) return JSON.parse(raw);
  return { name: "", status: "out", currentShiftStart: null, currentShiftDayKey: null, days: {} };
}

// Keeps each driver's KV record bounded -- a payroll log only needs recent
// history, not an ever-growing list of every day since they were hired.
function trimOldDays(record) {
  const keys = Object.keys(record.days).sort().reverse();
  if (keys.length <= MAX_DAYS_KEPT) return;
  for (const key of keys.slice(MAX_DAYS_KEPT)) delete record.days[key];
}

function floridaDateKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
