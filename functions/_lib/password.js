// Password hashing for parent accounts, using PBKDF2 via Web Crypto (built
// into the Cloudflare Workers runtime, so no extra dependency). Stored format
// is "<salt-base64>:<hash-base64>".

const ITERATIONS = 100000;

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveBits(password, salt);
  return `${bufToB64(salt)}:${bufToB64(hash)}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [saltB64, hashB64] = stored.split(":");
  const salt = b64ToBuf(saltB64);
  const expected = b64ToBuf(hashB64);
  const actual = await deriveBits(password, salt);
  return timingSafeEqual(actual, expected);
}

async function deriveBits(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

function bufToB64(buf) {
  return btoa(String.fromCharCode(...buf));
}
function b64ToBuf(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}
