// Short-lived, signed password-reset tokens for the parent portal. Same HMAC
// approach as functions/_lib/session.js, but these are single-purpose,
// short-expiry tokens carried in a reset-link URL, not a cookie.

const PURPOSE = "reset";
const EXPIRY_SECONDS = 30 * 60; // 30 minutes

export async function createResetToken(email, secret) {
  const expires = Math.floor(Date.now() / 1000) + EXPIRY_SECONDS;
  const payload = `${PURPOSE}|${email.toLowerCase()}|${expires}`;
  const signature = await sign(payload, secret);
  return `${b64url(payload)}.${signature}`;
}

export async function verifyResetToken(token, secret) {
  if (!token || !secret) return null;
  const [encodedPayload, signature] = String(token).split(".");
  if (!encodedPayload || !signature) return null;

  let payload;
  try {
    payload = b64urlDecode(encodedPayload);
  } catch {
    return null;
  }

  const expectedSignature = await sign(payload, secret);
  if (!timingSafeEqual(signature, expectedSignature)) return null;

  const [purpose, email, expiresStr] = payload.split("|");
  const expires = Number(expiresStr);
  if (purpose !== PURPOSE || !email || !expires || Date.now() / 1000 > expires) return null;

  return email;
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
