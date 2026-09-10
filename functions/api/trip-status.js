// POST /api/trip-status -- driver presses Start/Arrived for one leg of a trip.
// Body: { tripId, leg: "dropoff" | "pickup", action: "start" | "arrive" }
// Requires header: x-driver-token -- either the owner code (DRIVER_ACCESS_TOKEN)
// or an individual driver's code (see functions/_lib/driverAuth.js).
//
// A one-way trip has a single "dropoff" leg (pickupAddress -> dropoffAddress).
// A round trip also has a "pickup" leg (the return run, dropoffAddress ->
// pickupAddress, in the afternoon). Weekly/monthly plans repeat every school
// day, so their progress is keyed by *today's* date (Florida time) rather
// than the trip's original start date -- the buttons reset automatically
// each morning instead of staying stuck on "Completed" after day one.

import { sendEmail, escapeHtml } from "../_lib/email.js";
import { isAuthorizedDriver } from "../_lib/driverAuth.js";

export async function onRequestPost({ request, env }) {
  const token = request.headers.get("x-driver-token");
  if (!(await isAuthorizedDriver(env, token))) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!env.TRIPS_KV) {
    return json({ error: "Trip storage not configured" }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const { tripId, leg, action } = body || {};
  if (!tripId || !["dropoff", "pickup"].includes(leg) || !["start", "arrive"].includes(action)) {
    return json({ error: "Invalid request." }, 400);
  }

  const raw = await env.TRIPS_KV.get(`trip:${tripId}`);
  if (!raw) return json({ error: "Trip not found." }, 404);
  const trip = JSON.parse(raw);

  const legs = legsFor(trip.category);
  if (!legs.includes(leg)) {
    return json({ error: "This trip doesn't have that leg." }, 400);
  }

  const dateKey = getDateKey(trip);
  trip.dailyProgress = trip.dailyProgress || {};
  trip.dailyProgress[dateKey] = trip.dailyProgress[dateKey] || {};
  trip.dailyProgress[dateKey][leg] = action === "start" ? "started" : "arrived";
  trip.dailyProgress[dateKey][`${leg}At`] = new Date().toISOString();

  const today = trip.dailyProgress[dateKey];
  const allArrived = legs.every((l) => today[l] === "arrived");
  const anyStarted = legs.some((l) => today[l] === "started" || today[l] === "arrived");
  trip.status = allArrived ? "arrived" : anyStarted ? "started" : "scheduled";

  await env.TRIPS_KV.put(`trip:${tripId}`, JSON.stringify(trip));

  const emailResult = await notifyParent(env, trip, leg, action);

  return json({ ok: true, status: trip.status, dailyProgress: trip.dailyProgress[dateKey], notified: emailResult.sent });
}

async function notifyParent(env, trip, leg, action) {
  if (!trip.parentEmail) return { sent: false };

  const childName = escapeHtml(trip.childName) || "Your child";
  const greeting = `Hi${trip.parentName ? " " + escapeHtml(trip.parentName) : ""},`;
  let subject, body;

  if (leg === "dropoff" && action === "start") {
    subject = `${childName}'s ride to school has started`;
    body = `<strong>${childName}'s trip has started</strong> — heading to ${escapeHtml(trip.dropoffAddress) || "school"}.`;
  } else if (leg === "dropoff" && action === "arrive") {
    subject = `${childName} has arrived at school`;
    body = `<strong>${childName} has arrived safely at ${escapeHtml(trip.dropoffAddress) || "school"}.</strong>`;
  } else if (leg === "pickup" && action === "start") {
    subject = `${childName} has been picked up from school`;
    body = `<strong>${childName} has been picked up from ${escapeHtml(trip.dropoffAddress) || "school"}</strong> and is heading to ${escapeHtml(trip.pickupAddress) || "home"}.`;
  } else {
    subject = `${childName} has arrived home safely`;
    body = `<strong>${childName} has arrived safely at ${escapeHtml(trip.pickupAddress) || "home"}.</strong>`;
  }

  const html = `<p>${greeting}</p><p>${body}</p><p>— Lake County Student Rides</p>`;
  return sendEmail(env, { to: trip.parentEmail, subject, html });
}

function legsFor(category) {
  return isRoundTrip(category) ? ["dropoff", "pickup"] : ["dropoff"];
}

function isRoundTrip(category) {
  return /round trip/i.test(category || "");
}

function isRecurring(category) {
  return /^(weekly|monthly)/i.test(String(category || "").trim());
}

// Recurring plans reset every school day -- key progress by today's date
// (Florida time) so yesterday's "Completed" doesn't carry over. One-off
// trips key by their own start date so there's exactly one day of progress.
function getDateKey(trip) {
  if (isRecurring(trip.category)) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
  return trip.startDate || (trip.createdAt || "").slice(0, 10);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
