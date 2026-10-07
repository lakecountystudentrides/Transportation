(function () {
  const signedOutPanel = document.getElementById('signed-out-panel');
  const hoursPanel = document.getElementById('hours-panel');
  const hoursList = document.getElementById('hours-list');
  const hoursError = document.getElementById('hours-error');

  const STORAGE_KEY = 'lcsr_driver_token'; // same key driver.js stores the access code under

  function T(en, es) { return window.LCSR_T ? window.LCSR_T(en, es) : en; }
  function lang() { return window.LCSR_LANG || 'en'; }

  const token = safeStorageGet(STORAGE_KEY);
  if (!token) {
    signedOutPanel.hidden = false;
  } else {
    loadHours(token);
  }

  document.addEventListener('lcsr:langchange', function () {
    if (!hoursPanel.hidden) loadHours(token);
  });

  async function loadHours(token) {
    hideError();
    try {
      const res = await fetch('/api/driver-hours', { headers: { 'x-driver-token': token } });
      const data = await res.json();
      if (!res.ok || data.error) {
        signedOutPanel.hidden = false;
        hoursPanel.hidden = true;
        return;
      }
      renderPeriods(data.periods || []);
      hoursPanel.hidden = false;
      signedOutPanel.hidden = true;
    } catch {
      showError(T('Unable to reach the server. Please try again.', 'No se pudo conectar con el servidor. Por favor intente de nuevo.'));
    }
  }

  function renderPeriods(periods) {
    if (!periods.length) {
      hoursList.innerHTML = `<p>${T('No hours logged yet.', 'Aún no hay horas registradas.')}</p>`;
      return;
    }
    hoursList.innerHTML = periods.map(periodCard).join('');
  }

  function periodCard(period, index) {
    const rangeLabel = `${formatDate(period.startDate)} – ${formatDate(period.endDate)}`;
    const currentBadge = index === 0 ? ` (${T('current', 'actual')})` : '';
    const rows = period.days.length
      ? period.days.map((d) => `<div class="price-row"><span>${formatDate(d.date)}</span><span>${d.hours.toFixed(2)} ${T('hrs', 'hrs')}</span></div>`).join('')
      : `<div class="price-row price-row-note"><span>${T('No hours logged this period.', 'No hay horas registradas en este período.')}</span><span></span></div>`;

    return `
      <div class="price-result" style="margin-top:0; margin-bottom:1rem;">
        <div class="price-row price-row-total"><span>${rangeLabel}${currentBadge}</span><span>${period.totalHours.toFixed(2)} ${T('hrs', 'hrs')}</span></div>
        ${rows}
      </div>
    `;
  }

  function formatDate(dateStr) {
    const d = new Date(`${dateStr}T00:00`);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString(lang() === 'es' ? 'es' : 'en-US', { dateStyle: 'medium' });
  }

  function showError(msg) { hoursError.textContent = msg; hoursError.hidden = false; }
  function hideError() { hoursError.hidden = true; hoursError.textContent = ''; }

  function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
})();
