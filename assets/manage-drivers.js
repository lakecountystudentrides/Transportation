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

  const timeclockSection = document.getElementById('timeclock-section');
  const timeclockListEl = document.getElementById('timeclock-list');
  const timeclockError = document.getElementById('timeclock-error');
  const timeclockRefreshBtn = document.getElementById('timeclock-refresh-btn');

  function T(en, es) { return window.LCSR_T ? window.LCSR_T(en, es) : en; }
  function lang() { return window.LCSR_LANG || 'en'; }

  // If a valid session cookie already exists from a previous visit, skip straight to the drivers list.
  loadDrivers();

  document.addEventListener('lcsr:langchange', () => {
    if (!driversPanel.hidden) loadDrivers();
  });

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
        body: JSON.stringify({ username, password, lang: lang() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showError(loginError, data.error || T('Incorrect username or password.', 'Nombre de usuario o contraseña incorrectos.'));
        return;
      }
      await loadDrivers();
    } catch {
      showError(loginError, T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
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
      timeclockSection.hidden = false;
      await loadRoster();
      await loadTimeLog();
    } catch {
      showError(driversError, T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
    }
  }

  logoutBtn.addEventListener('click', async () => {
    try { await fetch('/api/owner-logout', { method: 'POST' }); } catch {}
    driversPanel.hidden = true;
    rosterSection.hidden = true;
    timeclockSection.hidden = true;
    loginPanel.hidden = false;
  });

  rosterRefreshBtn.addEventListener('click', () => window.location.reload());
  timeclockRefreshBtn.addEventListener('click', () => loadTimeLog());

  async function loadTimeLog() {
    hideError(timeclockError);
    try {
      const res = await fetch('/api/time-log');
      const data = await res.json();
      if (!res.ok || data.error) {
        showError(timeclockError, data.error || T('Unable to load the time clock.', 'No se pudo cargar el reloj de trabajo.'));
        return;
      }
      renderTimeLog(data.drivers || []);
    } catch {
      showError(timeclockError, T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
    }
  }

  const DAYS_SHOWN = 14;

  function renderTimeLog(drivers) {
    if (!drivers.length) {
      timeclockListEl.innerHTML = `<p>${T('No drivers have clocked in yet.', 'Ningún conductor ha marcado entrada todavía.')}</p>`;
      return;
    }
    timeclockListEl.innerHTML = drivers.map(timeclockCard).join('');
  }

  function timeclockCard(d) {
    const isIn = d.status === 'in';
    const statusLabel = isIn
      ? (d.currentShiftStart ? T(`Clocked In since ${formatDateTime(d.currentShiftStart)}`, `Presente desde ${formatDateTime(d.currentShiftStart)}`) : T('Clocked In', 'Presente'))
      : T('Clocked Out', 'Fuera de servicio');

    const dayKeys = Object.keys(d.days || {}).sort().reverse().slice(0, DAYS_SHOWN);
    const rows = dayKeys.length
      ? dayKeys.map((key) => `<div class="price-row"><span>${formatDayKey(key)}</span><span>${(d.days[key].hours || 0).toFixed(2)} ${T('hrs', 'hrs')}</span></div>`).join('')
      : `<div class="price-row price-row-note"><span>${T('No hours logged yet.', 'Aún no hay horas registradas.')}</span><span></span></div>`;

    return `
      <div class="price-result" style="margin-top:0; margin-bottom:1rem;">
        <div class="price-row price-row-total"><span>${escapeHtml(d.name)}</span><span style="color:${isIn ? 'var(--gold-dark)' : 'inherit'};">${statusLabel}</span></div>
        ${rows}
      </div>
    `;
  }

  function formatDayKey(key) {
    const d = new Date(`${key}T00:00`);
    if (isNaN(d)) return key;
    return d.toLocaleDateString(lang() === 'es' ? 'es' : 'en-US', { dateStyle: 'medium' });
  }

  function formatDateTime(isoString) {
    const d = new Date(isoString);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString(lang() === 'es' ? 'es' : 'en-US', { hour: 'numeric', minute: '2-digit' });
  }

  async function loadRoster() {
    hideError(rosterError);
    try {
      const res = await fetch('/api/owner-trips');
      const data = await res.json();
      if (!res.ok || data.error) {
        showError(rosterError, data.error || T('Unable to load roster.', 'No se pudo cargar la lista.'));
        return;
      }
      renderRoster(data.trips || []);
    } catch {
      showError(rosterError, T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
    }
  }

  function renderRoster(trips) {
    const active = trips.filter(isActiveToday);
    const dropoffs = active.slice().sort((a, b) => (a.dropoffTime || '99:99').localeCompare(b.dropoffTime || '99:99'));
    const pickups = active.filter((t) => legsFor(t.category).includes('pickup'))
      .sort((a, b) => (a.pickupTime || '99:99').localeCompare(b.pickupTime || '99:99'));

    const noneToday = `<p>${T('No trips today.', 'No hay viajes hoy.')}</p>`;
    rosterDropoffEl.innerHTML = dropoffs.length ? dropoffs.map(ownerTripCard).join('') : noneToday;
    rosterPickupEl.innerHTML = pickups.length ? pickups.map(ownerTripCard).join('') : noneToday;
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
    return allArrived ? T('Completed', 'Completado') : anyStarted ? T('In Progress', 'En Progreso') : T('Scheduled', 'Programado');
  }

  function legStatusText(state) {
    if (state === 'arrived') return `✓ ${T('Completed', 'Completado')}`;
    if (state === 'started') return T('In Progress', 'En Progreso');
    return T('Not started yet', 'Aún no ha comenzado');
  }

  const CATEGORY_LABELS_ES = {
    'One-way': 'Solo ida',
    'Round trip': 'Viaje redondo',
    'Weekly, one-way only': 'Semanal, solo ida',
    'Weekly, round trip': 'Semanal, viaje redondo',
    'Monthly, one route/day': 'Mensual, una ruta/día',
    'Monthly, two routes/day (round trip)': 'Mensual, dos rutas/día (viaje redondo)',
  };
  function categoryLabel(category) {
    return lang() === 'es' ? (CATEGORY_LABELS_ES[category] || category) : category;
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
    return `<p class="price-note">${T(`Recurring ${planWord} plan — continue through ${range}.`, `Plan recurrente ${planWord} — continúe hasta ${range}.`)}</p>`;
  }

  function ownerTripCard(t) {
    const ageGrade = [t.childAge ? `${T('age', 'edad')} ${escapeHtml(t.childAge)}` : '', t.childGrade ? `${T('grade', 'grado')} ${escapeHtml(t.childGrade)}` : ''].filter(Boolean).join(', ');
    const childLabel = [escapeHtml(t.childName) || T('Child', 'Niño/a'), ageGrade].filter(Boolean).join(' — ');
    const legs = legsFor(t.category);
    const dateKey = todayDateKey(t);
    const today = (t.dailyProgress && t.dailyProgress[dateKey]) || {};

    return `
      <div class="price-result" style="margin-top:0; margin-bottom:1rem;">
        <div class="price-row price-row-total">
          <span style="display:flex; align-items:center; gap:0.5rem;">${childPhotoImg(t.childPhoto)}${childLabel}</span>
          <span>${overallStatusLabel(t)}</span>
        </div>
        ${paymentBadge(t.paymentStatus)}
        <div class="price-row"><span>${T('Start Date', 'Fecha de Inicio')}</span><span>${formatDate(t)}</span></div>
        <div class="price-row"><span>${T('Service', 'Servicio')}</span><span>${escapeHtml(categoryLabel(t.category)) || '—'}</span></div>
        <div class="price-row"><span>${T('Parent', 'Padre/Madre')}</span><span>${escapeHtml(t.parentName) || '—'} ${phoneLink(t.parentPhone)}</span></div>
        <div class="price-row"><span>${T('Pickup address', 'Dirección de recogida')}</span><span>${addressLink(t.pickupAddress)}</span></div>
        <div class="price-row"><span>${T('Drop-off address', 'Dirección de entrega')}</span><span>${addressLink(t.dropoffAddress)}</span></div>
        ${t.activityAddress ? `<div class="price-row"><span>${T('Then to', 'Luego a')}</span><span>${addressLink(t.activityAddress)}</span></div>` : ''}
        <div class="price-row"><span>${T('Time to be dropped off to school', 'Hora de entrega en la escuela')}</span><span>${t.dropoffTime ? formatTime(t.dropoffTime) : '—'}</span></div>
        <div class="price-row"><span>${T('Time to be picked up from school', 'Hora de recogida de la escuela')}</span><span>${t.pickupTime ? formatTime(t.pickupTime) : '—'}</span></div>
        ${t.instructions ? `<div class="price-row price-row-note"><span>${T('Notes', 'Notas')}</span><span>${escapeHtml(t.instructions)}</span></div>` : ''}
        ${contactListRows(T('Emergency Contact', 'Contacto de Emergencia'), t.emergencyContacts)}
        ${contactListRows(T('Authorized Pickup/Drop-off', 'Recogida/Entrega Autorizada'), t.authorizedPickups)}
        <div class="price-row"><span>${T('Drop-off leg', 'Tramo de entrega')}</span><span>${legStatusText(today.dropoff)}</span></div>
        ${legs.includes('pickup') ? `<div class="price-row"><span>${T('Pickup leg', 'Tramo de recogida')}</span><span>${legStatusText(today.pickup)}</span></div>` : ''}
        ${recurringNote(t)}
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
        body: JSON.stringify({ name, lang: lang() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showError(addDriverError, data.error || T('Unable to add driver.', 'No se pudo agregar el conductor.'));
        return;
      }
      newDriverName.value = '';
      newDriverCode.textContent = T(
        `${data.name}'s access code: ${data.code} — give this to them to sign in at /driver.html`,
        `Código de acceso de ${data.name}: ${data.code} — entrégueselo para que inicie sesión en /driver.html`
      );
      newDriverCode.hidden = false;
      await loadDrivers();
    } catch {
      showError(addDriverError, T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
    } finally {
      addDriverBtn.disabled = false;
    }
  });

  function renderDrivers(drivers) {
    if (!drivers.length) {
      driverList.innerHTML = `<p>${T('No drivers added yet.', 'Aún no se han agregado conductores.')}</p>`;
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
            body: JSON.stringify({ code, active: nextActive, lang: lang() }),
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            showError(driversError, data.error || T('Unable to update driver.', 'No se pudo actualizar el conductor.'));
            btn.disabled = false;
            return;
          }
          await loadDrivers();
        } catch {
          showError(driversError, T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
          btn.disabled = false;
        }
      });
    });
  }

  function driverCard(d) {
    const isActive = d.active !== false;
    const actionLabel = isActive ? T('Deactivate', 'Desactivar') : T('Reactivate', 'Reactivar');
    const statusLabel = isActive ? T('Active', 'Activo') : T('Deactivated', 'Desactivado');
    return `
      <div class="price-result" style="margin-top:0; margin-bottom:1rem;">
        <div class="price-row price-row-total"><span>${escapeHtml(d.name)}</span><span>${statusLabel}</span></div>
        <div class="price-row"><span>${T('Access code', 'Código de acceso')}</span><span>${escapeHtml(d.code)}</span></div>
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
