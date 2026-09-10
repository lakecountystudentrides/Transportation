// POST /api/driver-deactivate -- Body: { code, active }
// Activates or deactivates a driver's access code without deleting their
// history. Owner only (must match env.DRIVER_ACCESS_TOKEN exactly).

export async function onRequestPost({ request, env }) {
  const token = request.headers.get("x-driver-token");
  if (!env.DRIVER_ACCESS_TOKEN || token !== env.DRIVER_ACCESS_TOKEN) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!env.TRIPS_KV) return json({ error: "Trip storage not configured" }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const code = String(body?.code || "");
  const active = body?.active !== false;
  if (!code) return json({ error: "Invalid request." }, 400);

  const key = `driver:${code}`;
  const raw = await env.TRIPS_KV.get(key);
  if (!raw) return json({ error: "Driver not found." }, 404);

  const driver = JSON.parse(raw);
  driver.active = active;
  await env.TRIPS_KV.put(key, JSON.stringify(driver));

  return json({ ok: true });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
