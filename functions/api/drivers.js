// GET /api/drivers -- lists all drivers (owner only).
// POST /api/drivers -- Body: { name } -- creates a new driver with a
// randomly generated access code (owner only).
// Requires header: x-driver-token matching env.DRIVER_ACCESS_TOKEN exactly --
// individual driver codes cannot manage other drivers.

export async function onRequestGet({ request, env }) {
  if (!isOwner(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.TRIPS_KV) return json({ error: "Trip storage not configured" }, 503);

  const list = await env.TRIPS_KV.list({ prefix: "driver:" });
  const drivers = [];
  for (const key of list.keys) {
    const raw = await env.TRIPS_KV.get(key.name);
    if (!raw) continue;
    const driver = JSON.parse(raw);
    drivers.push({ code: key.name.slice("driver:".length), ...driver });
  }
  drivers.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  return json({ drivers });
}

export async function onRequestPost({ request, env }) {
  if (!isOwner(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.TRIPS_KV) return json({ error: "Trip storage not configured" }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const name = String(body?.name || "").trim();
  if (!name) return json({ error: "Please enter the driver's name." }, 400);

  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const driver = { name, active: true, createdAt: new Date().toISOString() };
  await env.TRIPS_KV.put(`driver:${code}`, JSON.stringify(driver));

  return json({ code, ...driver });
}

function isOwner(request, env) {
  const token = request.headers.get("x-driver-token");
  return !!(env.DRIVER_ACCESS_TOKEN && token === env.DRIVER_ACCESS_TOKEN);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
