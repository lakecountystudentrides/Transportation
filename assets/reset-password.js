(function () {
  const requestPanel = document.getElementById('request-panel');
  const confirmPanel = document.getElementById('confirm-panel');

  const requestBtn = document.getElementById('request-btn');
  const requestMessage = document.getElementById('request-message');
  const requestError = document.getElementById('request-error');

  const confirmBtn = document.getElementById('confirm-btn');
  const confirmMessage = document.getElementById('confirm-message');
  const confirmError = document.getElementById('confirm-error');

  function T(en, es) { return window.LCSR_T ? window.LCSR_T(en, es) : en; }
  function lang() { return window.LCSR_LANG || 'en'; }

  const token = new URLSearchParams(window.location.search).get('token');

  if (token) {
    requestPanel.hidden = true;
    confirmPanel.hidden = false;
  }

  requestBtn.addEventListener('click', async () => {
    hide(requestError);
    hide(requestMessage);
    const email = document.getElementById('requestEmail').value.trim();
    if (!email) return;

    requestBtn.disabled = true;
    try {
      const res = await fetch('/api/parent-forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, lang: lang() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        show(requestError, data.error || T('Unable to send a reset link right now.', 'No se pudo enviar un enlace de restablecimiento en este momento.'));
        return;
      }
      show(requestMessage, data.message || T("If an account exists for that email, we've sent a link to reset your password.", 'Si existe una cuenta para ese correo electrónico, le hemos enviado un enlace para restablecer su contraseña.'));
    } catch {
      show(requestError, T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
    } finally {
      requestBtn.disabled = false;
    }
  });

  confirmBtn.addEventListener('click', async () => {
    hide(confirmError);
    hide(confirmMessage);
    const password = document.getElementById('newPassword').value;
    if (!password) return;

    confirmBtn.disabled = true;
    try {
      const res = await fetch('/api/parent-reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password, lang: lang() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        show(confirmError, data.error || T('Unable to reset your password.', 'No se pudo restablecer su contraseña.'));
        return;
      }
      show(confirmMessage, T('Your password has been reset. You can now sign in with your new password.', 'Su contraseña ha sido restablecida. Ahora puede iniciar sesión con su nueva contraseña.'));
      confirmBtn.disabled = true;
      confirmBtn.textContent = T('Password Reset', 'Contraseña Restablecida');
      setTimeout(() => { window.location.href = '/parent-portal.html'; }, 2000);
    } catch {
      show(confirmError, T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
      confirmBtn.disabled = false;
    }
  });

  function show(el, msg) { el.textContent = msg; el.hidden = false; }
  function hide(el) { el.hidden = true; el.textContent = ''; }
})();
