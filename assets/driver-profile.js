(function () {
  const signedOutPanel = document.getElementById('signed-out-panel');
  const infoPanel = document.getElementById('info-panel');
  const infoCard = document.getElementById('info-card');
  const infoError = document.getElementById('info-error');

  const STORAGE_KEY = 'lcsr_driver_token'; // same key driver.js stores the access code under

  function T(en, es) { return window.LCSR_T ? window.LCSR_T(en, es) : en; }
  function lang() { return window.LCSR_LANG || 'en'; }

  const token = safeStorageGet(STORAGE_KEY);
  if (!token) {
    signedOutPanel.hidden = false;
  } else {
    loadProfile(token);
  }

  document.addEventListener('lcsr:langchange', function () {
    if (!infoPanel.hidden) loadProfile(token);
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
      renderInfo(data.name, data.profile || {});
      infoPanel.hidden = false;
      signedOutPanel.hidden = true;
    } catch {
      showError(T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
    }
  }

  function renderInfo(name, p) {
    const notOnFile = T('Not on file yet', 'Aún no registrado');
    const row = (label, value) => `<div class="price-row"><span>${label}</span><span>${value ? escapeHtml(value) : `<span style="color:var(--text-muted);">${notOnFile}</span>`}</span></div>`;

    const photoBlock = p.photo
      ? `<img src="${p.photo}" alt="" style="width:88px; height:88px; object-fit:cover; border-radius:10px; margin-bottom:1rem; display:block;" />`
      : '';

    const vehicle = [p.vehicleMake, p.vehicleModel].filter(Boolean).join(' ');

    infoCard.innerHTML = `
      ${photoBlock}
      <div class="price-row price-row-total"><span>${escapeHtml(name)}</span><span></span></div>
      ${row(T('Phone', 'Teléfono'), p.phone)}
      ${row(T('Email', 'Correo electrónico'), p.email)}
      ${row(T('Address', 'Dirección'), p.address)}
      ${row(T('License Number', 'Número de Licencia'), p.licenseNumber)}
      ${row(T('License Expiration', 'Vencimiento de Licencia'), formatDate(p.licenseExpiration))}
      ${row(T('Vehicle', 'Vehículo'), vehicle)}
      ${row(T('License Plate', 'Placa'), p.vehiclePlate)}
      ${row(T('Emergency Contact', 'Contacto de Emergencia'), p.emergencyContactName)}
      ${row(T('Emergency Contact Phone', 'Teléfono de Emergencia'), p.emergencyContactPhone)}
      ${row(T('Relationship', 'Relación'), p.emergencyContactRelationship)}
      ${row(T('Hire Date', 'Fecha de Contratación'), formatDate(p.hireDate))}
    `;
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

  function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
})();
