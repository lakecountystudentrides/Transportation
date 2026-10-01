(function () {
  const loginPanel = document.getElementById('login-panel');
  const tripsPanel = document.getElementById('trips-panel');
  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');
  const tokenInput = document.getElementById('driverToken');
  const refreshBtn = document.getElementById('refresh-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const tripList = document.getElementById('trip-list');
  const tripsError = document.getElementById('trips-error');
  const todaySummaryEl = document.getElementById('today-summary');
  const clockBtn = document.getElementById('clock-btn');
  const clockStatusLabel = document.getElementById('clock-status-label');
  const clockTodayHours = document.getElementById('clock-today-hours');
  const clockError = document.getElementById('clock-error');

  const STORAGE_KEY = 'lcsr_driver_token';

  function T(en, es) { return window.LCSR_T ? window.LCSR_T(en, es) : en; }
  function lang() { return window.LCSR_LANG || 'en'; }

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
    window.location.reload();
  });

  logoutBtn.addEventListener('click', function () {
    safeStorageRemove(STORAGE_KEY);
    tokenInput.value = '';
    tripsPanel.hidden = true;
    loginPanel.hidden = false;
    clockStatus = 'out';
  });

  document.addEventListener('lcsr:langchange', function () {
    if (!tripsPanel.hidden) {
      loadTrips(safeStorageGet(STORAGE_KEY));
      loadClockStatus(safeStorageGet(STORAGE_KEY));
    }
  });

  async function tryLoad(token) {
    hideError(loginError);
    const ok = await loadTrips(token);
    if (ok) {
      safeStorageSet(STORAGE_KEY, token);
      loginPanel.hidden = true;
      tripsPanel.hidden = false;
      loadClockStatus(token);
    } else {
      showError(loginError, T('Incorrect access code.', 'Código de acceso incorrecto.'));
    }
  }

  let clockStatus = 'out';

  async function loadClockStatus(token) {
    hideError(clockError);
    try {
      const res = await fetch('/api/clock', { headers: { 'x-driver-token': token } });
      const data = await res.json();
      if (!res.ok || data.error) return;
      renderClockStatus(data);
    } catch {
      showError(clockError, T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
    }
  }

  function renderClockStatus(data) {
    clockStatus = data.status === 'in' ? 'in' : 'out';
    clockTodayHours.textContent = (data.today?.hours || 0).toFixed(2);
    if (clockStatus === 'in') {
      const since = data.currentShiftStart ? formatTime24(data.currentShiftStart) : '';
      clockStatusLabel.textContent = since
        ? T(`Clocked In since ${since}`, `Presente desde las ${since}`)
        : T('Clocked In', 'Presente');
      clockBtn.textContent = T('Clock Out', 'Marcar Salida');
    } else {
      clockStatusLabel.textContent = T('Clocked Out', 'Fuera de servicio');
      clockBtn.textContent = T('Clock In', 'Marcar Entrada');
    }
  }

  function formatTime24(isoString) {
    const d = new Date(isoString);
    return formatTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
  }

  clockBtn.addEventListener('click', async function () {
    const token = safeStorageGet(STORAGE_KEY);
    if (!token) return;
    hideError(clockError);
    clockBtn.disabled = true;
    const action = clockStatus === 'in' ? 'out' : 'in';
    try {
      const res = await fetch('/api/clock', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-driver-token': token },
        body: JSON.stringify({ action, lang: lang() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showError(clockError, data.error || T('Unable to update your clock status.', 'No se pudo actualizar su estado de reloj.'));
        return;
      }
      renderClockStatus(data);
    } catch {
      showError(clockError, T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
    } finally {
      clockBtn.disabled = false;
    }
  });

  async function loadTrips(token) {
    hideError(tripsError);
    try {
      const res = await fetch('/api/trips', { headers: { 'x-driver-token': token } });
      const data = await res.json();
      if (!res.ok || data.error) {
        if (res.status === 401) return false;
        showError(tripsError, data.error || T('Unable to load trips.', 'No se pudieron cargar los viajes.'));
        return true;
      }
      renderTrips(data.trips || [], token);
      renderTodaySummary(data.trips || []);
      return true;
    } catch {
      showError(tripsError, T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
      return true;
    }
  }

  function legInfo() {
    return {
      dropoff: { startLabel: T('Start Drop-off', 'Iniciar Entrega'), arriveLabel: T('Arrived at School', 'Llegó a la Escuela') },
      pickup: { startLabel: T('Start Pickup', 'Iniciar Recogida'), arriveLabel: T('Arrived Home', 'Llegó a Casa') },
    };
  }

  function renderTrips(trips, token) {
    if (!trips.length) {
      tripList.innerHTML = `<p>${T('No trips yet.', 'Aún no hay viajes.')}</p>`;
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
        btn.textContent = T('Updating…', 'Actualizando…');
        try {
          const res = await fetch('/api/trip-status', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-driver-token': token },
            body: JSON.stringify({ tripId, leg, action, lang: lang() }),
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            showError(tripsError, data.error || T('Unable to update trip.', 'No se pudo actualizar el viaje.'));
            btn.disabled = false;
            btn.textContent = prevLabel;
            return;
          }
          loadTrips(token);
        } catch {
          showError(tripsError, T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
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
    const LEG_INFO = legInfo();

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

  function actualTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function isActiveToday(t) {
    return isRecurring(t.category) || t.startDate === actualTodayString();
  }

  // Today's Roster: every child on today's schedule, split into who still
  // needs to be dropped off at school vs. picked up from school -- resets
  // automatically each day since it's built from today's dailyProgress.
  function renderTodaySummary(trips) {
    const active = trips.filter(isActiveToday);
    const dropoffs = [];
    const pickups = [];

    active.forEach((t) => {
      const legs = legsFor(t.category);
      const dateKey = todayDateKey(t);
      const today = (t.dailyProgress && t.dailyProgress[dateKey]) || {};
      const name = escapeHtml(t.childName) || T('Child', 'Niño/a');

      dropoffs.push({ name, time: t.dropoffTime || '', done: today.dropoff === 'arrived' });
      if (legs.includes('pickup')) {
        pickups.push({ name, time: t.pickupTime || '', done: today.pickup === 'arrived' });
      }
    });

    const byTime = (a, b) => (a.time || '99:99').localeCompare(b.time || '99:99');
    dropoffs.sort(byTime);
    pickups.sort(byTime);

    if (!dropoffs.length && !pickups.length) {
      todaySummaryEl.innerHTML = `<p>${T('No trips scheduled for today.', 'No hay viajes programados para hoy.')}</p>`;
      return;
    }

    todaySummaryEl.innerHTML = `
      <h3 style="margin-bottom:0.25rem;">${T('Drop-off to School', 'Entrega en la Escuela')}</h3>
      ${rosterList(dropoffs)}
      <h3 style="margin:1.25rem 0 0.25rem;">${T('Pickup from School', 'Recogida de la Escuela')}</h3>
      ${rosterList(pickups)}
    `;
  }

  function rosterList(items) {
    if (!items.length) return `<p class="price-row-note">${T('None today.', 'Ninguno hoy.')}</p>`;
    return items.map((item) => `
      <div class="roster-item${item.done ? ' roster-done' : ''}">
        <span>${item.name}</span>
        <span>${item.time ? formatTime(item.time) : '—'}</span>
      </div>
    `).join('');
  }

  function overallStatusLabel(t) {
    const legs = legsFor(t.category);
    const dateKey = todayDateKey(t);
    const today = (t.dailyProgress && t.dailyProgress[dateKey]) || {};
    const allArrived = legs.every((l) => today[l] === 'arrived');
    const anyStarted = legs.some((l) => today[l] === 'started' || today[l] === 'arrived');
    return allArrived ? T('Completed', 'Completado') : anyStarted ? T('In Progress', 'En Progreso') : T('Scheduled', 'Programado');
  }

  function recurringNote(t) {
    if (!isRecurring(t.category) || !t.startDate) return '';
    const start = new Date(`${t.startDate}T00:00`);
    if (isNaN(start)) return '';
    const isMonthly = /^monthly/i.test(t.category.trim());
    const end = new Date(start);
    if (isMonthly) end.setMonth(end.getMonth() + 1);
    else end.setDate(end.getDate() + 6);
    const locale = lang() === 'es' ? 'es' : 'en-US';
    const range = `${start.toLocaleDateString(locale, { dateStyle: 'medium' })} – ${end.toLocaleDateString(locale, { dateStyle: 'medium' })}`;
    const planWord = isMonthly ? T('monthly', 'mensual') : T('weekly', 'semanal');
    return `<p class="price-note">${T(`Recurring ${planWord} plan — continue Start/Arrived every school day through ${range}.`, `Plan recurrente ${planWord} — continúe Iniciar/Llegó cada día escolar hasta ${range}.`)}</p>`;
  }

  function tripCard(t) {
    const statusLabel = overallStatusLabel(t);
    const ageGrade = [t.childAge ? `${T('age', 'edad')} ${escapeHtml(t.childAge)}` : '', t.childGrade ? `${T('grade', 'grado')} ${escapeHtml(t.childGrade)}` : ''].filter(Boolean).join(', ');
    const childLabel = [escapeHtml(t.childName) || T('Child', 'Niño/a'), ageGrade].filter(Boolean).join(' — ');
    return `
      <div class="price-result" style="margin-top:0; margin-bottom:1rem;">
        <div class="price-row price-row-total">
          <span style="display:flex; align-items:center; gap:0.5rem;">${childPhotoImg(t.childPhoto)}${childLabel}</span>
          <span>${statusLabel}</span>
        </div>
        ${paymentBadge(t.paymentStatus)}
        <div class="price-row"><span>${T('Start Date', 'Fecha de Inicio')}</span><span>${formatDate(t)}</span></div>
        <div class="price-row"><span>${T('Parent', 'Padre/Madre')}</span><span>${escapeHtml(t.parentName) || '—'} ${phoneLink(t.parentPhone)}</span></div>
        <div class="price-row"><span>${T('Pickup address', 'Dirección de recogida')}</span><span>${addressLink(t.pickupAddress)}</span></div>
        <div class="price-row"><span>${T('Drop-off address', 'Dirección de entrega')}</span><span>${addressLink(t.dropoffAddress)}</span></div>
        ${t.activityAddress ? `<div class="price-row"><span>${T('Then to', 'Luego a')}</span><span>${addressLink(t.activityAddress)}</span></div>` : ''}
        <div class="price-row"><span>${T('Time to be dropped off to school', 'Hora de entrega en la escuela')}</span><span>${t.dropoffTime ? formatTime(t.dropoffTime) : '—'}</span></div>
        <div class="price-row"><span>${T('Time to be picked up from school', 'Hora de recogida de la escuela')}</span><span>${t.pickupTime ? formatTime(t.pickupTime) : '—'}</span></div>
        ${t.instructions ? `<div class="price-row price-row-note"><span>${T('Notes', 'Notas')}</span><span>${escapeHtml(t.instructions)}</span></div>` : ''}
        ${contactListRows(T('Emergency Contact', 'Contacto de Emergencia'), t.emergencyContacts)}
        ${contactListRows(T('Authorized Pickup/Drop-off', 'Recogida/Entrega Autorizada'), t.authorizedPickups)}
        ${recurringNote(t)}
        ${legButtons(t)}
      </div>
    `;
  }

  function childPhotoImg(photo) {
    if (!photo) return '';
    return `<img src="${photo}" alt="" style="width:36px; height:36px; object-fit:cover; border-radius:6px; flex-shrink:0;" />`;
  }

  function contactListRows(label, contacts) {
    if (!contacts || !contacts.length) return '';
    return contacts.map((c) => {
      const name = escapeHtml(c.name) || '—';
      const rel = c.relationship ? ` (${escapeHtml(c.relationship)})` : '';
      return `<div class="price-row price-row-note"><span>${label}</span><span>${name}${rel} ${phoneLink(c.phone)}</span></div>`;
    }).join('');
  }

  function formatDate(t) {
    const locale = lang() === 'es' ? 'es' : 'en-US';
    if (t.startDate) {
      const d = new Date(`${t.startDate}T00:00`);
      if (!isNaN(d)) return d.toLocaleDateString(locale, { dateStyle: 'medium' });
    }
    if (t.createdAt) {
      return new Date(t.createdAt).toLocaleDateString(locale, { dateStyle: 'medium' }) + T(' (booked)', ' (reservado)');
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
      return `<div class="price-row"><span></span><span style="color:#a66a00; font-weight:700;">${T('Bank transfer pending — trip is still on', 'Transferencia bancaria pendiente — el viaje continúa')}</span></div>`;
    }
    if (paymentStatus === 'failed') {
      return `<div class="price-row"><span></span><span style="color:#8a1f1f; font-weight:700;">${T('Bank transfer failed — follow up with parent', 'Transferencia bancaria fallida — comuníquese con el padre/madre')}</span></div>`;
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
  function safeStorageRemove(key) {
    try { localStorage.removeItem(key); } catch {}
  }
})();
