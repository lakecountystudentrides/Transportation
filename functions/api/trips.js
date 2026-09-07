// GET /api/trips -- returns recent trips for the driver dashboard.
// Requires header: x-driver-token matching env.DRIVER_ACCESS_TOKEN.

export async function onRequestGet({ request, env }) {
  const token = request.headers.get("x-driver-token");
  if (!env.DRIVER_ACCESS_TOKEN || token !== env.DRIVER_ACCESS_TOKEN) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!env.TRIPS_KV) {
    return json({ error: "Trip storage not configured" }, 503);
  }

  const indexRaw = await env.TRIPS_KV.get("trip-index");
  const index = indexRaw ? JSON.parse(indexRaw) : [];

  const trips = [];
  for (const id of index.slice(0, 50)) {
    const raw = await env.TRIPS_KV.get(`trip:${id}`);
    if (raw) trips.push(JSON.parse(raw));
  }

  return json({ trips });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
