(function () {
  const loginPanel = document.getElementById('login-panel');
  const driversPanel = document.getElementById('drivers-panel');
  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');
  const tokenInput = document.getElementById('ownerToken');

  const addDriverBtn = document.getElementById('add-driver-btn');
  const addDriverError = document.getElementById('add-driver-error');
  const newDriverName = document.getElementById('newDriverName');
  const newDriverCode = document.getElementById('new-driver-code');

  const driverList = document.getElementById('driver-list');
  const driversError = document.getElementById('drivers-error');

  const STORAGE_KEY = 'lcsr_owner_token';

  const savedToken = safeStorageGet(STORAGE_KEY);
  if (savedToken) {
    tokenInput.value = savedToken;
    tryLoad(savedToken);
  }

  loginBtn.addEventListener('click', function () {
    const token = tokenInput.value.trim();
    if (!token) return;
    tryLoad(token);
  });

  async function tryLoad(token) {
    hideError(loginError);
    const ok = await loadDrivers(token);
    if (ok) {
      safeStorageSet(STORAGE_KEY, token);
      loginPanel.hidden = true;
      driversPanel.hidden = false;
    } else {
      showError(loginError, 'Incorrect access code.');
    }
  }

  async function loadDrivers(token) {
    hideError(driversError);
    try {
      const res = await fetch('/api/drivers', { headers: { 'x-driver-token': token } });
      const data = await res.json();
      if (!res.ok || data.error) {
        if (res.status === 401) return false;
        showError(driversError, data.error || 'Unable to load drivers.');
        return true;
      }
      renderDrivers(data.drivers || [], token);
      return true;
    } catch {
      showError(driversError, 'Unable to reach the server. Please try again.');
      return true;
    }
  }

  addDriverBtn.addEventListener('click', async () => {
    hideError(addDriverError);
    newDriverCode.hidden = true;
    const name = newDriverName.value.trim();
    if (!name) return;

    const token = safeStorageGet(STORAGE_KEY);
    addDriverBtn.disabled = true;
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-driver-token': token },
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
      await loadDrivers(token);
    } catch {
      showError(addDriverError, 'Unable to reach the server. Please try again.');
    } finally {
      addDriverBtn.disabled = false;
    }
  });

  function renderDrivers(drivers, token) {
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
            headers: { 'content-type': 'application/json', 'x-driver-token': token },
            body: JSON.stringify({ code, active: nextActive }),
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            showError(driversError, data.error || 'Unable to update driver.');
            btn.disabled = false;
            return;
          }
          await loadDrivers(token);
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

  function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function safeStorageSet(key, val) {
    try { localStorage.setItem(key, val); } catch {}
  }
})();
