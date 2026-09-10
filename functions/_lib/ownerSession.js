// Signed, stateless session cookie for the owner-only /manage-drivers.html
// page. Separate cookie name and secret from the parent portal's session
// (functions/_lib/session.js) so the two can never collide or be confused.

const COOKIE_NAME = "lcsr_owner_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours -- shorter-lived, since this unlocks driver management

export async function createOwnerSessionCookie(username, secret) {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${username}|${expires}`;
  const signature = await sign(payload, secret);
  const token = `${b64url(payload)}.${signature}`;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}

export async function verifyOwnerSessionCookie(cookieHeader, secret) {
  if (!cookieHeader || !secret) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;

  const [encodedPayload, signature] = match[1].split(".");
  if (!encodedPayload || !signature) return null;

  let payload;
  try {
    payload = b64urlDecode(encodedPayload);
  } catch {
    return null;
  }

  const expectedSignature = await sign(payload, secret);
  if (!timingSafeEqual(signature, expectedSignature)) return null;

  const [username, expiresStr] = payload.split("|");
  const expires = Number(expiresStr);
  if (!username || !expires || Date.now() / 1000 > expires) return null;

  return username;
}

export function clearOwnerSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function sign(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(String.fromCharCode(...new Uint8Array(sigBuffer)));
}

function b64url(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  return atob(padded);
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
