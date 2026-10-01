// Authorizes a driver dashboard request. Two kinds of codes work:
// 1. env.DRIVER_ACCESS_TOKEN -- the owner/master code, also used to manage
//    individual drivers at /manage-drivers.html (functions/api/drivers.js).
// 2. A per-driver code issued from that page, stored in TRIPS_KV under
//    "driver:<code>" as { name, active, createdAt }.

// Resolves the token to a driver identity (code + display name), or null if
// the token isn't valid/active. functions/api/clock.js needs the identity
// (not just a yes/no) to know whose time-clock record to read and write.
export async function getDriverIdentity(env, token) {
  if (!token) return null;
  if (env.DRIVER_ACCESS_TOKEN && token === env.DRIVER_ACCESS_TOKEN) {
    return { code: token, name: "Owner" };
  }
  if (!env.TRIPS_KV) return null;

  const raw = await env.TRIPS_KV.get(`driver:${token}`);
  if (!raw) return null;

  const driver = JSON.parse(raw);
  if (driver.active === false) return null;
  return { code: token, name: driver.name || "Driver" };
}

export async function isAuthorizedDriver(env, token) {
  return !!(await getDriverIdentity(env, token));
}
