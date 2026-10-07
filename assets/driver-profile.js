(function () {
  const signedOutPanel = document.getElementById('signed-out-panel');
  const infoPanel = document.getElementById('info-panel');
  const infoCard = document.getElementById('info-card');
  const infoError = document.getElementById('info-error');

  const STORAGE_KEY = 'lcsr_driver_token'; // same key driver.js stores the access code under

  function T(en, es) { return window.LCSR_T ? window.LCSR_T(en, es) : en; }
  function lang() { return window.LCSR_LANG || 'en'; }

  const token = safeStorageGet(STORAGE_KEY);
  let currentName = '';
  let currentProfile = {};
  let editMode = false;

  if (!token) {
    signedOutPanel.hidden = false;
  } else {
    loadProfile(token);
  }

  document.addEventListener('lcsr:langchange', function () {
    if (!infoPanel.hidden) render();
  });

  async function loadProfile(token) {
    hideError();
    try {
      const res = await fetch('/api/driver-profile', { headers: { 'x-driver-token': token } });
      const data = await res.json();
      if (!res.ok || data.error) {
        signedOutPanel.hidden = false;
        infoPanel.hidden = true;
        return;
      }
      currentName = data.name;
      currentProfile = data.profile || {};
      editMode = false;
      render();
      infoPanel.hidden = false;
      signedOutPanel.hidden = true;
    } catch {
      showError(T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
    }
  }

  function render() {
    editMode ? renderEditMode() : renderViewMode();
  }

  function otherInfoRows(p) {
    const notOnFile = T('Not on file yet', 'Aún no registrado');
    const row = (label, value) => `<div class="price-row"><span>${label}</span><span>${value ? escapeHtml(value) : `<span style="color:var(--text-muted);">${notOnFile}</span>`}</span></div>`;
    const vehicle = [p.vehicleMake, p.vehicleModel].filter(Boolean).join(' ');
    return `
      <div class="price-row price-row-total" style="margin-top:1.25rem; border-top:1px solid var(--border); padding-top:0.75rem;"><span>${T('Other Information', 'Otra Información')}</span><span></span></div>
      ${row(T('License Number', 'Número de Licencia'), p.licenseNumber)}
      ${row(T('License Expiration', 'Vencimiento de Licencia'), formatDate(p.licenseExpiration))}
      ${row(T('Vehicle', 'Vehículo'), vehicle)}
      ${row(T('License Plate', 'Placa'), p.vehiclePlate)}
      ${row(T('Hire Date', 'Fecha de Contratación'), formatDate(p.hireDate))}
      ${row(T('Pay Rate', 'Tarifa de Pago'), p.payRate)}
    `;
  }

  function photoBlock(p) {
    return p.photo
      ? `<img src="${p.photo}" alt="" style="width:88px; height:88px; object-fit:cover; border-radius:10px; margin-bottom:1rem; display:block;" />`
      : '';
  }

  function renderViewMode() {
    const p = currentProfile;
    const notOnFile = T('Not on file yet', 'Aún no registrado');
    const row = (label, value) => `<div class="price-row"><span>${label}</span><span>${value ? escapeHtml(value) : `<span style="color:var(--text-muted);">${notOnFile}</span>`}</span></div>`;

    infoCard.innerHTML = `
      ${photoBlock(p)}
      <div class="price-row price-row-total"><span>${escapeHtml(currentName)}</span><span></span></div>
      ${row(T('Phone', 'Teléfono'), p.phone)}
      ${row(T('Email', 'Correo electrónico'), p.email)}
      ${row(T('Address', 'Dirección'), p.address)}
      ${row(T('Emergency Contact', 'Contacto de Emergencia'), p.emergencyContactName)}
      ${row(T('Emergency Contact Phone', 'Teléfono de Emergencia'), p.emergencyContactPhone)}
      ${row(T('Relationship', 'Relación'), p.emergencyContactRelationship)}
      <button type="button" id="edit-info-btn" class="btn btn-primary" style="margin-top:0.75rem;">${T('Edit', 'Editar')}</button>
      ${otherInfoRows(p)}
    `;

    document.getElementById('edit-info-btn').addEventListener('click', () => {
      editMode = true;
      render();
    });
  }

  function renderEditMode() {
    const p = currentProfile;
    infoCard.innerHTML = `
      ${photoBlock(p)}
      <div class="price-row price-row-total"><span>${escapeHtml(currentName)}</span><span></span></div>

      <div class="form-row"><label>${T('Phone', 'Teléfono')}</label><input type="tel" class="ip-phone" value="${escapeAttr(p.phone)}" /></div>
      <div class="form-row"><label>${T('Email', 'Correo electrónico')}</label><input type="email" class="ip-email" value="${escapeAttr(p.email)}" /></div>
      <div class="form-row"><label>${T('Address', 'Dirección')}</label><input type="text" class="ip-address" value="${escapeAttr(p.address)}" /></div>
      <div class="form-row"><label>${T('Emergency Contact', 'Contacto de Emergencia')}</label><input type="text" class="ip-emergencyContactName" value="${escapeAttr(p.emergencyContactName)}" /></div>
      <div class="form-row"><label>${T('Emergency Contact Phone', 'Teléfono de Emergencia')}</label><input type="tel" class="ip-emergencyContactPhone" value="${escapeAttr(p.emergencyContactPhone)}" /></div>
      <div class="form-row"><label>${T('Relationship', 'Relación')}</label><input type="text" class="ip-emergencyContactRelationship" value="${escapeAttr(p.emergencyContactRelationship)}" /></div>
      <button type="button" id="save-info-btn" class="btn btn-primary" style="margin-top:0.5rem;">${T('Save', 'Guardar')}</button>
      <button type="button" id="cancel-info-btn" class="btn btn-ghost" style="margin-top:0.5rem; margin-left:0.5rem;">${T('Cancel', 'Cancelar')}</button>

      ${otherInfoRows(p)}
    `;

    document.getElementById('save-info-btn').addEventListener('click', saveInfo);
    document.getElementById('cancel-info-btn').addEventListener('click', () => {
      editMode = false;
      render();
    });
  }

  async function saveInfo() {
    hideError();
    const btn = document.getElementById('save-info-btn');
    btn.disabled = true;
    const body = {
      lang: lang(),
      phone: document.querySelector('.ip-phone').value.trim(),
      email: document.querySelector('.ip-email').value.trim(),
      address: document.querySelector('.ip-address').value.trim(),
      emergencyContactName: document.querySelector('.ip-emergencyContactName').value.trim(),
      emergencyContactPhone: document.querySelector('.ip-emergencyContactPhone').value.trim(),
      emergencyContactRelationship: document.querySelector('.ip-emergencyContactRelationship').value.trim(),
    };
    try {
      const res = await fetch('/api/driver-profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-driver-token': token },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showError(data.error || T('Unable to save. Please try again.', 'No se pudo guardar. Por favor intente de nuevo.'));
        return;
      }
      currentProfile = data.profile || { ...currentProfile, ...body };
      editMode = false;
      render();
    } catch {
      showError(T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
    } finally {
      btn.disabled = false;
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T00:00`);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString(lang() === 'es' ? 'es' : 'en-US', { dateStyle: 'medium' });
  }

  function showError(msg) { infoError.textContent = msg; infoError.hidden = false; }
  function hideError() { infoError.hidden = true; infoError.textContent = ''; }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
  }

  function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
})();
