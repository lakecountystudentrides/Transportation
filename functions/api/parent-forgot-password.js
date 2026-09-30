// POST /api/parent-forgot-password -- Body: { email }
// Always responds with the same generic success message, whether or not an
// account exists for that email, so this endpoint can't be used to discover
// which emails have accounts. If the account exists, emails a reset link.

import { createResetToken } from "../_lib/resetToken.js";
import { sendEmail, escapeHtml } from "../_lib/email.js";

const GENERIC_MESSAGE_EN = "If an account exists for that email, we've sent a link to reset your password.";
const GENERIC_MESSAGE_ES = "Si existe una cuenta para ese correo electrónico, le hemos enviado un enlace para restablecer su contraseña.";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const isEs = body?.lang === "es";
  const genericMessage = isEs ? GENERIC_MESSAGE_ES : GENERIC_MESSAGE_EN;

  const email = String(body?.email || "").trim().toLowerCase();
  if (!email) {
    return json({ message: genericMessage });
  }
  if (!env.TRIPS_KV || !env.PARENT_SESSION_SECRET) {
    return json({ error: isEs ? "El restablecimiento de contraseña aún no está configurado." : "Password reset isn't configured yet." }, 503);
  }

  const raw = await env.TRIPS_KV.get(`parent:${email}`);
  if (raw) {
    const token = await createResetToken(email, env.PARENT_SESSION_SECRET);
    const siteUrl = env.SITE_URL || new URL(request.url).origin;
    const resetLink = `${siteUrl}/reset-password.html?token=${encodeURIComponent(token)}`;

    await sendEmail(env, {
      to: email,
      subject: isEs ? "Restablezca su contraseña de Lake County Student Rides" : "Reset your Lake County Student Rides password",
      html: isEs ? `
        <p>Recibimos una solicitud para restablecer la contraseña de su cuenta de padre/madre de Lake County Student Rides.</p>
        <p><a href="${escapeHtml(resetLink)}">Haga clic aquí para elegir una nueva contraseña</a></p>
        <p>Este enlace expira en 30 minutos. Si usted no solicitó esto, puede ignorar este correo electrónico de forma segura.</p>
      ` : `
        <p>We received a request to reset the password for your Lake County Student Rides parent account.</p>
        <p><a href="${escapeHtml(resetLink)}">Click here to choose a new password</a></p>
        <p>This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  }

  return json({ message: genericMessage });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
