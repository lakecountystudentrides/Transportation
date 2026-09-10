// POST /api/trip-status -- driver presses Start Trip or Arrived.
// Body: { tripId, action: "start" | "arrive" }
// Requires header: x-driver-token -- either the owner code (DRIVER_ACCESS_TOKEN)
// or an individual driver's code (see functions/_lib/driverAuth.js).
// Updates the trip's status in KV and emails the parent.

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

  const { tripId, action } = body || {};
  if (!tripId || !["start", "arrive"].includes(action)) {
    return json({ error: "Invalid request." }, 400);
  }

  const raw = await env.TRIPS_KV.get(`trip:${tripId}`);
  if (!raw) return json({ error: "Trip not found." }, 404);

  const trip = JSON.parse(raw);
  trip.status = action === "start" ? "started" : "arrived";
  trip[action === "start" ? "startedAt" : "arrivedAt"] = new Date().toISOString();
  await env.TRIPS_KV.put(`trip:${tripId}`, JSON.stringify(trip));

  const childName = escapeHtml(trip.childName) || "Your child";
  let subject, html;
  if (action === "start") {
    subject = "Your child's trip has started";
    html = `<p>Hi${trip.parentName ? " " + escapeHtml(trip.parentName) : ""},</p>
      <p><strong>${childName}'s trip has started.</strong></p>
      <p>Pickup: ${escapeHtml(trip.pickupAddress) || "—"}<br/>
      Drop-off: ${escapeHtml(trip.dropoffAddress) || "—"}</p>
      <p>— Lake County Student Rides</p>`;
  } else {
    subject = `${childName} has arrived safely`;
    html = `<p>Hi${trip.parentName ? " " + escapeHtml(trip.parentName) : ""},</p>
      <p><strong>${childName} has arrived safely at ${escapeHtml(trip.dropoffAddress) || "the destination"}.</strong></p>
      <p>— Lake County Student Rides</p>`;
  }

  let emailResult = { sent: false };
  if (trip.parentEmail) {
    emailResult = await sendEmail(env, { to: trip.parentEmail, subject, html });
  }

  return json({ ok: true, status: trip.status, notified: emailResult.sent });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
