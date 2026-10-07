// GET /api/driver-hours -- the driver's own clock-in/out history, grouped
// into 2-week pay periods (most recent first), for the "Hours Worked"
// page at /driver-hours.html. Requires header: x-driver-token (see
// functions/_lib/driverAuth.js). Pulls from the same "timeclock:<code>"
// record functions/api/clock.js writes -- periods are just that record's
// days bucketed into rolling 14-day windows counting back from today.

import { getDriverIdentity } from "../_lib/driverAuth.js";

export async function onRequestGet({ request, env }) {
  const identity = await getDriverIdentity(env, request.headers.get("x-driver-token"));
  if (!identity) return json({ error: "Unauthorized" }, 401);
  if (!env.TRIPS_KV) return json({ error: "Trip storage not configured" }, 503);

  const raw = await env.TRIPS_KV.get(`timeclock:${identity.code}`);
  const record = raw ? JSON.parse(raw) : { days: {} };

  return json({ periods: groupIntoPeriods(record.days || {}) });
}

function groupIntoPeriods(days) {
  const today = new Date(`${floridaDateKey(new Date())}T00:00`);
  const periods = {};

  for (const [dateKey, day] of Object.entries(days)) {
    const d = new Date(`${dateKey}T00:00`);
    const diffDays = Math.floor((today - d) / 86400000);
    if (diffDays < 0) continue; // defensive -- ignore any clock-skew future entry
    const periodIndex = Math.floor(diffDays / 14);
    periods[periodIndex] = periods[periodIndex] || { days: [], totalHours: 0 };
    periods[periodIndex].days.push({ date: dateKey, hours: day.hours || 0 });
    periods[periodIndex].totalHours += day.hours || 0;
  }

  return Object.keys(periods)
    .map(Number)
    .sort((a, b) => a - b)
    .map((idx) => {
      const end = new Date(today);
      end.setDate(end.getDate() - idx * 14);
      const start = new Date(end);
      start.setDate(start.getDate() - 13);
      const p = periods[idx];
      p.days.sort((a, b) => b.date.localeCompare(a.date));
      p.totalHours = round2(p.totalHours);
      p.startDate = floridaDateKey(start);
      p.endDate = floridaDateKey(end);
      return p;
    });
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
