// Shared helper for sending transactional email via Resend.
// Files under functions/_lib/ are not routes -- they're plain modules
// other Pages Functions can import.

export async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY || !to) return { sent: false };

  const from = env.NOTIFICATION_FROM_EMAIL || "Lake County Student Rides <transportation@lakecountystudentrides.com>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return { sent: res.ok };
  } catch {
    return { sent: false };
  }
}

export function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
