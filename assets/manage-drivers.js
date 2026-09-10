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

  const rosterSection = document.getElementById('roster-section');
  const rosterDropoffEl = document.getElementById('roster-dropoff');
  const rosterPickupEl = document.getElementById('roster-pickup');
  const rosterError = document.getElementById('roster-error');
  const rosterRefreshBtn = document.getElementById('roster-refresh-btn');

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
        rosterSection.hidden = true;
        return;
      }
      renderDrivers(data.drivers || []);
      loginPanel.hidden = true;
      driversPanel.hidden = false;
      rosterSection.hidden = false;
      await loadRoster();
    } catch {
      showError(driversError, 'Unable to reach the server. Please try again.');
    }
  }

  logoutBtn.addEventListener('click', async () => {
    try { await fetch('/api/owner-logout', { method: 'POST' }); } catch {}
    driversPanel.hidden = true;
    rosterSection.hidden = true;
    loginPanel.hidden = false;
  });

  rosterRefreshBtn.addEventListener('click', () => window.location.reload());

  async function loadRoster() {
    hideError(rosterError);
    try {
      const res = await fetch('/api/owner-trips');
      const data = await res.json();
      if (!res.ok || data.error) {
        showError(rosterError, data.error || 'Unable to load roster.');
        return;
      }
      renderRoster(data.trips || []);
    } catch {
      showError(rosterError, 'Unable to reach the server. Please try again.');
    }
  }

  function renderRoster(trips) {
    const active = trips.filter(isActiveToday);
    const dropoffs = active.slice().sort((a, b) => (a.dropoffTime || '99:99').localeCompare(b.dropoffTime || '99:99'));
    const pickups = active.filter((t) => legsFor(t.category).includes('pickup'))
      .sort((a, b) => (a.pickupTime || '99:99').localeCompare(b.pickupTime || '99:99'));

    rosterDropoffEl.innerHTML = dropoffs.length ? dropoffs.map(ownerTripCard).join('') : '<p>No trips today.</p>';
    rosterPickupEl.innerHTML = pickups.length ? pickups.map(ownerTripCard).join('') : '<p>No trips today.</p>';
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

  function todayDateKey(t) {
    if (isRecurring(t.category)) return actualTodayString();
    return t.startDate || (t.createdAt || '').slice(0, 10);
  }

  function actualTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function isActiveToday(t) {
    return isRecurring(t.category) || t.startDate === actualTodayString();
  }

  function overallStatusLabel(t) {
    const legs = legsFor(t.category);
    const dateKey = todayDateKey(t);
    const today = (t.dailyProgress && t.dailyProgress[dateKey]) || {};
    const allArrived = legs.every((l) => today[l] === 'arrived');
    const anyStarted = legs.some((l) => today[l] === 'started' || today[l] === 'arrived');
    return allArrived ? 'Completed' : anyStarted ? 'In Progress' : 'Scheduled';
  }

  function legStatusText(state) {
    if (state === 'arrived') return '✓ Completed';
    if (state === 'started') return 'In Progress';
    return 'Not started yet';
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
    return `<p class="price-note">Recurring ${isMonthly ? 'monthly' : 'weekly'} plan — continue through ${range}.</p>`;
  }

  function ownerTripCard(t) {
    const ageGrade = [t.childAge ? `age ${escapeHtml(t.childAge)}` : '', t.childGrade ? `grade ${escapeHtml(t.childGrade)}` : ''].filter(Boolean).join(', ');
    const childLabel = [escapeHtml(t.childName) || 'Child', ageGrade].filter(Boolean).join(' — ');
    const legs = legsFor(t.category);
    const dateKey = todayDateKey(t);
    const today = (t.dailyProgress && t.dailyProgress[dateKey]) || {};

    return `
      <div class="price-result" style="margin-top:0; margin-bottom:1rem;">
        <div class="price-row price-row-total"><span>${childLabel}</span><span>${overallStatusLabel(t)}</span></div>
        ${paymentBadge(t.paymentStatus)}
        <div class="price-row"><span>Start Date</span><span>${formatDate(t)}</span></div>
        <div class="price-row"><span>Service</span><span>${escapeHtml(t.category) || '—'}</span></div>
        <div class="price-row"><span>Parent</span><span>${escapeHtml(t.parentName) || '—'} ${phoneLink(t.parentPhone)}</span></div>
        <div class="price-row"><span>Pickup address</span><span>${addressLink(t.pickupAddress)}</span></div>
        <div class="price-row"><span>Drop-off address</span><span>${addressLink(t.dropoffAddress)}</span></div>
        ${t.activityAddress ? `<div class="price-row"><span>Then to</span><span>${addressLink(t.activityAddress)}</span></div>` : ''}
        <div class="price-row"><span>Time to be dropped off to school</span><span>${t.dropoffTime ? formatTime(t.dropoffTime) : '—'}</span></div>
        <div class="price-row"><span>Time to be picked up from school</span><span>${t.pickupTime ? formatTime(t.pickupTime) : '—'}</span></div>
        ${t.instructions ? `<div class="price-row price-row-note"><span>Notes</span><span>${escapeHtml(t.instructions)}</span></div>` : ''}
        <div class="price-row"><span>Drop-off leg</span><span>${legStatusText(today.dropoff)}</span></div>
        ${legs.includes('pickup') ? `<div class="price-row"><span>Pickup leg</span><span>${legStatusText(today.pickup)}</span></div>` : ''}
        ${recurringNote(t)}
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

  function phoneLink(phone) {
    if (!phone) return '';
    const dialable = phone.replace(/[^\d+]/g, '');
    return `· <a href="tel:${dialable}">${escapeHtml(phone)}</a>`;
  }

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
