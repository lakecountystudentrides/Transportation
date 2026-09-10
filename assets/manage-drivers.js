(function () {
  const loginPanel = document.getElementById('login-panel');
  const driversPanel = document.getElementById('drivers-panel');
  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');
  const usernameInput = document.getElementById('ownerUsername');
  const passwordInput = document.getElementById('ownerPassword');

  const addDriverBtn = document.getElementById('add-driver-btn');
  const addDriverError = document.getElementById('add-driver-error');
  const newDriverName = document.getElementById('newDriverName');
  const newDriverCode = document.getElementById('new-driver-code');

  const driverList = document.getElementById('driver-list');
  const driversError = document.getElementById('drivers-error');
  const logoutBtn = document.getElementById('logout-btn');

  // If a valid session cookie already exists from a previous visit, skip straight to the drivers list.
  loadDrivers();

  loginBtn.addEventListener('click', async () => {
    hideError(loginError);
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) return;

    loginBtn.disabled = true;
    try {
      const res = await fetch('/api/owner-login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showError(loginError, data.error || 'Incorrect username or password.');
        return;
      }
      await loadDrivers();
    } catch {
      showError(loginError, 'Unable to reach the server. Please try again.');
    } finally {
      loginBtn.disabled = false;
    }
  });

  async function loadDrivers() {
    hideError(driversError);
    try {
      const res = await fetch('/api/drivers');
      const data = await res.json();
      if (!res.ok || data.error) {
        loginPanel.hidden = false;
        driversPanel.hidden = true;
        return;
      }
      renderDrivers(data.drivers || []);
      loginPanel.hidden = true;
      driversPanel.hidden = false;
    } catch {
      showError(driversError, 'Unable to reach the server. Please try again.');
    }
  }

  logoutBtn.addEventListener('click', async () => {
    try { await fetch('/api/owner-logout', { method: 'POST' }); } catch {}
    driversPanel.hidden = true;
    loginPanel.hidden = false;
  });

  addDriverBtn.addEventListener('click', async () => {
    hideError(addDriverError);
    newDriverCode.hidden = true;
    const name = newDriverName.value.trim();
    if (!name) return;

    addDriverBtn.disabled = true;
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showError(addDriverError, data.error || 'Unable to add driver.');
        return;
      }
      newDriverName.value = '';
      newDriverCode.textContent = `${data.name}'s access code: ${data.code} — give this to them to sign in at /driver.html`;
      newDriverCode.hidden = false;
      await loadDrivers();
    } catch {
      showError(addDriverError, 'Unable to reach the server. Please try again.');
    } finally {
      addDriverBtn.disabled = false;
    }
  });

  function renderDrivers(drivers) {
    if (!drivers.length) {
      driverList.innerHTML = '<p>No drivers added yet.</p>';
      return;
    }
    driverList.innerHTML = drivers.map(driverCard).join('');

    driverList.querySelectorAll('[data-toggle-code]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const code = btn.getAttribute('data-toggle-code');
        const nextActive = btn.getAttribute('data-next-active') === 'true';
        btn.disabled = true;
        try {
          const res = await fetch('/api/driver-deactivate', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code, active: nextActive }),
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            showError(driversError, data.error || 'Unable to update driver.');
            btn.disabled = false;
            return;
          }
          await loadDrivers();
        } catch {
          showError(driversError, 'Unable to reach the server. Please try again.');
          btn.disabled = false;
        }
      });
    });
  }

  function driverCard(d) {
    const isActive = d.active !== false;
    const actionLabel = isActive ? 'Deactivate' : 'Reactivate';
    const statusLabel = isActive ? 'Active' : 'Deactivated';
    return `
      <div class="price-result" style="margin-top:0; margin-bottom:1rem;">
        <div class="price-row price-row-total"><span>${escapeHtml(d.name)}</span><span>${statusLabel}</span></div>
        <div class="price-row"><span>Access code</span><span>${escapeHtml(d.code)}</span></div>
        <button class="btn btn-ghost" data-toggle-code="${d.code}" data-next-active="${!isActive}" style="margin-top:0.5rem;">${actionLabel}</button>
      </div>
    `;
  }

  function showError(el, msg) { el.textContent = msg; el.hidden = false; }
  function hideError(el) { el.hidden = true; el.textContent = ''; }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
})();
