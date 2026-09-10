// Authorizes a driver dashboard request. Two kinds of codes work:
// 1. env.DRIVER_ACCESS_TOKEN -- the owner/master code, also used to manage
//    individual drivers at /manage-drivers.html (functions/api/drivers.js).
// 2. A per-driver code issued from that page, stored in TRIPS_KV under
//    "driver:<code>" as { name, active, createdAt }.

export async function isAuthorizedDriver(env, token) {
  if (!token) return false;
  if (env.DRIVER_ACCESS_TOKEN && token === env.DRIVER_ACCESS_TOKEN) return true;
  if (!env.TRIPS_KV) return false;

  const raw = await env.TRIPS_KV.get(`driver:${token}`);
  if (!raw) return false;

  const driver = JSON.parse(raw);
  return driver.active !== false;
}
