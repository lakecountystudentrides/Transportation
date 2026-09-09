(function () {
  const requestPanel = document.getElementById('request-panel');
  const confirmPanel = document.getElementById('confirm-panel');

  const requestBtn = document.getElementById('request-btn');
  const requestMessage = document.getElementById('request-message');
  const requestError = document.getElementById('request-error');

  const confirmBtn = document.getElementById('confirm-btn');
  const confirmMessage = document.getElementById('confirm-message');
  const confirmError = document.getElementById('confirm-error');

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
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        show(requestError, data.error || 'Unable to send a reset link right now.');
        return;
      }
      show(requestMessage, data.message || "If an account exists for that email, we've sent a link to reset your password.");
    } catch {
      show(requestError, 'Unable to reach the server. Please try again.');
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
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        show(confirmError, data.error || 'Unable to reset your password.');
        return;
      }
      show(confirmMessage, 'Your password has been reset. You can now sign in with your new password.');
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Password Reset';
      setTimeout(() => { window.location.href = '/parent-portal.html'; }, 2000);
    } catch {
      show(confirmError, 'Unable to reach the server. Please try again.');
      confirmBtn.disabled = false;
    }
  });

  function show(el, msg) { el.textContent = msg; el.hidden = false; }
  function hide(el) { el.hidden = true; el.textContent = ''; }
})();
