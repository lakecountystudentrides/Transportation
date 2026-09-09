// Tracks a per-parent past-due balance in TRIPS_KV under "pastdue:<email>",
// created when a bank transfer fails after a trip was already dispatched.
// Independent of whether the parent has a portal account -- keyed by email.

export async function getPastDue(env, email) {
  const raw = await env.TRIPS_KV.get(`pastdue:${email.toLowerCase()}`);
  return raw ? JSON.parse(raw).amount : 0;
}

export async function addPastDue(env, email, amount) {
  const key = `pastdue:${email.toLowerCase()}`;
  const current = await getPastDue(env, email);
  await env.TRIPS_KV.put(key, JSON.stringify({ amount: current + amount, updatedAt: new Date().toISOString() }));
}

export async function clearPastDue(env, email) {
  const key = `pastdue:${email.toLowerCase()}`;
  await env.TRIPS_KV.put(key, JSON.stringify({ amount: 0, updatedAt: new Date().toISOString() }));
}
