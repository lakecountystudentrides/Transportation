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

  const MAX_PHOTO_DIMENSION = 400; // resized client-side before it ever reaches the server

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

    driverList.querySelectorAll('[data-edit-profile]').forEach((btn) => {
      btn.addEventListener('click', () => toggleProfileForm(btn.getAttribute('data-edit-profile')));
    });
  }

  async function toggleProfileForm(code) {
    const form = driverList.querySelector(`.driver-profile-form[data-code="${code}"]`);
    if (!form) return;
    if (!form.hidden) {
      form.hidden = true;
      return;
    }
    form.hidden = false;
    if (form.dataset.loaded) return;
    form.innerHTML = `<p class="price-note">${T('Loading…', 'Cargando…')}</p>`;
    try {
      const res = await fetch(`/api/manage-driver-profile?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        form.innerHTML = `<p class="price-error">${data.error || T('Unable to load this driver’s info.', 'No se pudo cargar la información de este conductor.')}</p>`;
        return;
      }
      form.dataset.loaded = 'true';
      renderProfileForm(form, code, data.profile || {});
    } catch {
      form.innerHTML = `<p class="price-error">${T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.')}</p>`;
    }
  }

  function renderProfileForm(form, code, p) {
    form.innerHTML = `
      <div class="form-row">
        <label>${T('Photo', 'Foto')}</label>
        <img class="driver-photo-preview" alt="" style="width:72px; height:72px; object-fit:cover; border-radius:10px; background:var(--border); margin-bottom:0.5rem; ${p.photo ? '' : 'display:none;'}" src="${p.photo || ''}" />
        <input type="file" accept="image/*" class="driver-photo-input" />
        <input type="hidden" class="driver-photo-data" value="${escapeAttr(p.photo)}" />
      </div>
      <div class="form-row"><label>${T('Phone', 'Teléfono')}</label><input type="tel" class="pf-phone" value="${escapeAttr(p.phone)}" /></div>
      <div class="form-row"><label>${T('Email', 'Correo electrónico')}</label><input type="email" class="pf-email" value="${escapeAttr(p.email)}" /></div>
      <div class="form-row"><label>${T('Address', 'Dirección')}</label><input type="text" class="pf-address" value="${escapeAttr(p.address)}" /></div>
      <div class="form-row"><label>${T('License Number', 'Número de Licencia')}</label><input type="text" class="pf-licenseNumber" value="${escapeAttr(p.licenseNumber)}" /></div>
      <div class="form-row"><label>${T('License Expiration', 'Vencimiento de Licencia')}</label><input type="date" class="pf-licenseExpiration" value="${escapeAttr(p.licenseExpiration)}" /></div>
      <div class="form-row"><label>${T('Vehicle Make', 'Marca del Vehículo')}</label><input type="text" class="pf-vehicleMake" value="${escapeAttr(p.vehicleMake)}" /></div>
      <div class="form-row"><label>${T('Vehicle Model', 'Modelo del Vehículo')}</label><input type="text" class="pf-vehicleModel" value="${escapeAttr(p.vehicleModel)}" /></div>
      <div class="form-row"><label>${T('License Plate', 'Placa')}</label><input type="text" class="pf-vehiclePlate" value="${escapeAttr(p.vehiclePlate)}" /></div>
      <div class="form-row"><label>${T('Emergency Contact Name', 'Nombre de Contacto de Emergencia')}</label><input type="text" class="pf-emergencyContactName" value="${escapeAttr(p.emergencyContactName)}" /></div>
      <div class="form-row"><label>${T('Emergency Contact Phone', 'Teléfono de Emergencia')}</label><input type="tel" class="pf-emergencyContactPhone" value="${escapeAttr(p.emergencyContactPhone)}" /></div>
      <div class="form-row"><label>${T('Relationship', 'Relación')}</label><input type="text" class="pf-emergencyContactRelationship" value="${escapeAttr(p.emergencyContactRelationship)}" /></div>
      <div class="form-row"><label>${T('Hire Date', 'Fecha de Contratación')}</label><input type="date" class="pf-hireDate" value="${escapeAttr(p.hireDate)}" /></div>
      <div class="form-row"><label>${T('Pay Rate', 'Tarifa de Pago')}</label><input type="text" class="pf-payRate" placeholder="${T('e.g. $18.00/hr', 'ej. $18.00/hora')}" value="${escapeAttr(p.payRate)}" /></div>
      <button type="button" class="btn btn-primary" data-save-profile="${code}" style="margin-top:0.5rem;">${T('Save', 'Guardar')}</button>
      <div class="profile-save-error price-error" role="alert" hidden></div>
    `;

    form.querySelector('.driver-photo-input').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      resizeImageToDataUrl(file, MAX_PHOTO_DIMENSION).then((dataUrl) => {
        form.querySelector('.driver-photo-data').value = dataUrl;
        const preview = form.querySelector('.driver-photo-preview');
        preview.src = dataUrl;
        preview.style.display = '';
      }).catch(() => {
        const errEl = form.querySelector('.profile-save-error');
        showError(errEl, T('Unable to process that photo. Please try a different image.', 'No se pudo procesar esa foto. Por favor intente con otra imagen.'));
      });
    });

    form.querySelector('[data-save-profile]').addEventListener('click', async () => {
      const errEl = form.querySelector('.profile-save-error');
      hideError(errEl);
      const btn = form.querySelector('[data-save-profile]');
      btn.disabled = true;
      const body = {
        code,
        lang: lang(),
        photo: form.querySelector('.driver-photo-data').value,
        phone: form.querySelector('.pf-phone').value.trim(),
        email: form.querySelector('.pf-email').value.trim(),
        address: form.querySelector('.pf-address').value.trim(),
        licenseNumber: form.querySelector('.pf-licenseNumber').value.trim(),
        licenseExpiration: form.querySelector('.pf-licenseExpiration').value,
        vehicleMake: form.querySelector('.pf-vehicleMake').value.trim(),
        vehicleModel: form.querySelector('.pf-vehicleModel').value.trim(),
        vehiclePlate: form.querySelector('.pf-vehiclePlate').value.trim(),
        emergencyContactName: form.querySelector('.pf-emergencyContactName').value.trim(),
        emergencyContactPhone: form.querySelector('.pf-emergencyContactPhone').value.trim(),
        emergencyContactRelationship: form.querySelector('.pf-emergencyContactRelationship').value.trim(),
        hireDate: form.querySelector('.pf-hireDate').value,
        payRate: form.querySelector('.pf-payRate').value.trim(),
      };
      try {
        const res = await fetch('/api/manage-driver-profile', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          showError(errEl, data.error || T('Unable to save. Please try again.', 'No se pudo guardar. Por favor intente de nuevo.'));
          return;
        }
        form.hidden = true;
      } catch {
        showError(errEl, T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
      } finally {
        btn.disabled = false;
      }
    });
  }

  function resizeImageToDataUrl(file, maxDimension) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
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
        <button class="btn btn-ghost" data-edit-profile="${d.code}" style="margin-top:0.5rem; margin-left:0.5rem;">${T('Edit Info', 'Editar Información')}</button>
        <div class="driver-profile-form" data-code="${d.code}" hidden style="margin-top:1rem; padding-top:1rem; border-top:1px solid var(--border);"></div>
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
