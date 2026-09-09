(function () {
  const loginPanel = document.getElementById('login-panel');
  const tripsPanel = document.getElementById('trips-panel');
  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');
  const tokenInput = document.getElementById('driverToken');
  const refreshBtn = document.getElementById('refresh-btn');
  const tripList = document.getElementById('trip-list');
  const tripsError = document.getElementById('trips-error');

  const STORAGE_KEY = 'lcsr_driver_token';

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

  refreshBtn.addEventListener('click', function () {
    const token = safeStorageGet(STORAGE_KEY);
    if (token) loadTrips(token);
  });

  async function tryLoad(token) {
    hideError(loginError);
    const ok = await loadTrips(token);
    if (ok) {
      safeStorageSet(STORAGE_KEY, token);
      loginPanel.hidden = true;
      tripsPanel.hidden = false;
    } else {
      showError(loginError, 'Incorrect access code.');
    }
  }

  async function loadTrips(token) {
    hideError(tripsError);
    try {
      const res = await fetch('/api/trips', { headers: { 'x-driver-token': token } });
      const data = await res.json();
      if (!res.ok || data.error) {
        if (res.status === 401) return false;
        showError(tripsError, data.error || 'Unable to load trips.');
        return true;
      }
      renderTrips(data.trips || [], token);
      return true;
    } catch {
      showError(tripsError, 'Unable to reach the server. Please try again.');
      return true;
    }
  }

  function renderTrips(trips, token) {
    if (!trips.length) {
      tripList.innerHTML = '<p>No trips yet.</p>';
      return;
    }
    tripList.innerHTML = trips.map((t) => tripCard(t)).join('');

    tripList.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const tripId = btn.getAttribute('data-trip-id');
        const action = btn.getAttribute('data-action');
        btn.disabled = true;
        btn.textContent = 'Updating…';
        try {
          const res = await fetch('/api/trip-status', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-driver-token': token },
            body: JSON.stringify({ tripId, action }),
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            showError(tripsError, data.error || 'Unable to update trip.');
            btn.disabled = false;
            btn.textContent = action === 'start' ? 'Start Trip' : 'Arrived';
            return;
          }
          loadTrips(token);
        } catch {
          showError(tripsError, 'Unable to reach the server. Please try again.');
        }
      });
    });
  }

  function tripCard(t) {
    const statusLabel = { scheduled: 'Scheduled', started: 'In Progress', arrived: 'Completed' }[t.status] || t.status;
    let actionBtn = '';
    if (t.status === 'scheduled') {
      actionBtn = `<button class="btn btn-primary" data-action="start" data-trip-id="${t.id}">Start Trip</button>`;
    } else if (t.status === 'started') {
      actionBtn = `<button class="btn btn-primary" data-action="arrive" data-trip-id="${t.id}">Arrived</button>`;
    }
    return `
      <div class="price-result" style="margin-top:0; margin-bottom:1rem;">
        <div class="price-row price-row-total"><span>${escapeHtml(t.childName) || 'Child'}</span><span>${statusLabel}</span></div>
        ${paymentBadge(t.paymentStatus)}
        <div class="price-row"><span>Date</span><span>${formatDate(t)}</span></div>
        <div class="price-row"><span>Pickup</span><span>${addressLink(t.pickupAddress)}${t.pickupTime ? ' at ' + formatTime(t.pickupTime) : ''}</span></div>
        <div class="price-row"><span>Drop-off</span><span>${addressLink(t.dropoffAddress)}${t.dropoffTime ? ' at ' + formatTime(t.dropoffTime) : ''}</span></div>
        <div class="price-row"><span>Parent</span><span>${escapeHtml(t.parentName) || '—'} ${t.parentPhone ? '· ' + escapeHtml(t.parentPhone) : ''}</span></div>
        ${t.instructions ? `<div class="price-row price-row-note"><span>Notes</span><span>${escapeHtml(t.instructions)}</span></div>` : ''}
        <div style="margin-top:0.75rem;">${actionBtn}</div>
      </div>
    `;
  }

  function formatDate(t) {
    if (t.startDate) {
      const d = new Date(`${t.startDate}T00:00`);
      if (!isNaN(d)) return d.toLocaleDateString('en-US', { dateStyle: 'medium' });
    }
    if (t.createdAt) {
      return new Date(t.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) + ' (booked)';
    }
    return '—';
  }

  function formatTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  }

  function paymentBadge(paymentStatus) {
    if (paymentStatus === 'pending') {
      return '<div class="price-row"><span></span><span style="color:#a66a00; font-weight:700;">Bank transfer pending — trip is still on</span></div>';
    }
    if (paymentStatus === 'failed') {
      return '<div class="price-row"><span></span><span style="color:#8a1f1f; font-weight:700;">Bank transfer failed — follow up with parent</span></div>';
    }
    return '';
  }

  function addressLink(address) {
    if (!address) return '—';
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    return `<a href="${url}" target="_blank" rel="noopener">${escapeHtml(address)}</a>`;
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
