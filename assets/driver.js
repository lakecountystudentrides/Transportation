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

  const LEG_INFO = {
    dropoff: { startLabel: 'Start Drop-off', arriveLabel: 'Arrived at School' },
    pickup: { startLabel: 'Start Pickup', arriveLabel: 'Arrived Home' },
  };

  function renderTrips(trips, token) {
    if (!trips.length) {
      tripList.innerHTML = '<p>No trips yet.</p>';
      return;
    }
    tripList.innerHTML = trips.map((t) => tripCard(t)).join('');

    tripList.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const tripId = btn.getAttribute('data-trip-id');
        const leg = btn.getAttribute('data-leg');
        const action = btn.getAttribute('data-action');
        const prevLabel = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Updating…';
        try {
          const res = await fetch('/api/trip-status', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-driver-token': token },
            body: JSON.stringify({ tripId, leg, action }),
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            showError(tripsError, data.error || 'Unable to update trip.');
            btn.disabled = false;
            btn.textContent = prevLabel;
            return;
          }
          loadTrips(token);
        } catch {
          showError(tripsError, 'Unable to reach the server. Please try again.');
        }
      });
    });
  }

  function isRoundTrip(category) {
    return /round trip/i.test(category || '');
  }

  function isRecurring(category) {
    return /^(weekly|monthly)/i.test(String(category || '').trim());
  }

  function legsFor(category) {
    return isRoundTrip(category) ? ['dropoff', 'pickup'] : ['dropoff'];
  }

  // Matches the server's dateKey logic (functions/api/trip-status.js) closely
  // enough to show the right button state before the driver taps anything --
  // recurring plans reset every day, one-off trips stick to their start date.
  function todayDateKey(t) {
    if (isRecurring(t.category)) {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return t.startDate || (t.createdAt || '').slice(0, 10);
  }

  function legButtons(t) {
    const legs = legsFor(t.category);
    const dateKey = todayDateKey(t);
    const today = (t.dailyProgress && t.dailyProgress[dateKey]) || {};

    return legs.map((leg) => {
      const info = LEG_INFO[leg];
      const legState = today[leg] || 'scheduled';
      let btn = '';
      if (legState === 'scheduled') {
        btn = `<button class="btn btn-primary" data-action="start" data-leg="${leg}" data-trip-id="${t.id}">${info.startLabel}</button>`;
      } else if (legState === 'started') {
        btn = `<button class="btn btn-primary" data-action="arrive" data-leg="${leg}" data-trip-id="${t.id}">${info.arriveLabel}</button>`;
      } else {
        btn = `<span style="color:var(--text-muted); font-size:0.9rem;">✓ ${info.arriveLabel}</span>`;
      }
      return `<div style="margin-top:0.5rem;">${btn}</div>`;
    }).join('');
  }

  function overallStatusLabel(t) {
    const legs = legsFor(t.category);
    const dateKey = todayDateKey(t);
    const today = (t.dailyProgress && t.dailyProgress[dateKey]) || {};
    const allArrived = legs.every((l) => today[l] === 'arrived');
    const anyStarted = legs.some((l) => today[l] === 'started' || today[l] === 'arrived');
    return allArrived ? 'Completed' : anyStarted ? 'In Progress' : 'Scheduled';
  }

  function recurringNote(t) {
    if (!isRecurring(t.category) || !t.startDate) return '';
    const start = new Date(`${t.startDate}T00:00`);
    if (isNaN(start)) return '';
    const isMonthly = /^monthly/i.test(t.category.trim());
    const end = new Date(start);
    if (isMonthly) end.setMonth(end.getMonth() + 1);
    else end.setDate(end.getDate() + 6);
    const range = `${start.toLocaleDateString('en-US', { dateStyle: 'medium' })} – ${end.toLocaleDateString('en-US', { dateStyle: 'medium' })}`;
    return `<p class="price-note">Recurring ${isMonthly ? 'monthly' : 'weekly'} plan — continue Start/Arrived every school day through ${range}.</p>`;
  }

  function tripCard(t) {
    const statusLabel = overallStatusLabel(t);
    const ageGrade = [t.childAge ? `age ${escapeHtml(t.childAge)}` : '', t.childGrade ? `grade ${escapeHtml(t.childGrade)}` : ''].filter(Boolean).join(', ');
    const childLabel = [escapeHtml(t.childName) || 'Child', ageGrade].filter(Boolean).join(' — ');
    return `
      <div class="price-result" style="margin-top:0; margin-bottom:1rem;">
        <div class="price-row price-row-total"><span>${childLabel}</span><span>${statusLabel}</span></div>
        ${paymentBadge(t.paymentStatus)}
        <div class="price-row"><span>Date</span><span>${formatDate(t)}</span></div>
        <div class="price-row"><span>Parent</span><span>${escapeHtml(t.parentName) || '—'} ${t.parentPhone ? '· ' + escapeHtml(t.parentPhone) : ''}</span></div>
        <div class="price-row"><span>Pickup address</span><span>${addressLink(t.pickupAddress)}</span></div>
        <div class="price-row"><span>Drop-off address</span><span>${addressLink(t.dropoffAddress)}</span></div>
        ${t.activityAddress ? `<div class="price-row"><span>Then to</span><span>${addressLink(t.activityAddress)}</span></div>` : ''}
        <div class="price-row"><span>Time to be dropped off to school</span><span>${t.dropoffTime ? formatTime(t.dropoffTime) : '—'}</span></div>
        <div class="price-row"><span>Time to be picked up from school</span><span>${t.pickupTime ? formatTime(t.pickupTime) : '—'}</span></div>
        ${t.instructions ? `<div class="price-row price-row-note"><span>Notes</span><span>${escapeHtml(t.instructions)}</span></div>` : ''}
        ${recurringNote(t)}
        ${legButtons(t)}
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
