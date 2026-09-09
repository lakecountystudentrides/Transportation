(function () {
  const authPanel = document.getElementById('auth-panel');
  const tripsPanel = document.getElementById('trips-panel');

  const tabSignin = document.getElementById('tab-signin');
  const tabSignup = document.getElementById('tab-signup');
  const signinForm = document.getElementById('signin-form');
  const signupForm = document.getElementById('signup-form');

  const signinBtn = document.getElementById('signin-btn');
  const signinError = document.getElementById('signin-error');
  const signupBtn = document.getElementById('signup-btn');
  const signupError = document.getElementById('signup-error');

  const logoutBtn = document.getElementById('logout-btn');
  const tripList = document.getElementById('trip-list');
  const tripsError = document.getElementById('trips-error');

  const pastDueBanner = document.getElementById('past-due-banner');
  const pastDueText = document.getElementById('past-due-text');
  const payPastDueBtn = document.getElementById('pay-past-due-btn');
  const pastDueError = document.getElementById('past-due-error');

  const STATUS_LABELS = { scheduled: 'Scheduled', started: 'In Progress', arrived: 'Completed' };

  tabSignin.addEventListener('click', () => showTab('signin'));
  tabSignup.addEventListener('click', () => showTab('signup'));

  function showTab(which) {
    const isSignin = which === 'signin';
    signinForm.hidden = !isSignin;
    signupForm.hidden = isSignin;
    tabSignin.className = isSignin ? 'btn btn-primary' : 'btn btn-ghost';
    tabSignup.className = isSignin ? 'btn btn-ghost' : 'btn btn-primary';
  }

  signinBtn.addEventListener('click', async () => {
    hideError(signinError);
    const email = document.getElementById('signinEmail').value.trim();
    const password = document.getElementById('signinPassword').value;
    if (!email || !password) return;

    signinBtn.disabled = true;
    try {
      const res = await fetch('/api/parent-login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showError(signinError, data.error || 'Unable to sign in.');
        return;
      }
      await loadTrips();
    } catch {
      showError(signinError, 'Unable to reach the server. Please try again.');
    } finally {
      signinBtn.disabled = false;
    }
  });

  signupBtn.addEventListener('click', async () => {
    hideError(signupError);
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    if (!email || !password) return;

    signupBtn.disabled = true;
    try {
      const res = await fetch('/api/parent-signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showError(signupError, data.error || 'Unable to create account.');
        return;
      }
      await loadTrips();
    } catch {
      showError(signupError, 'Unable to reach the server. Please try again.');
    } finally {
      signupBtn.disabled = false;
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try { await fetch('/api/parent-logout', { method: 'POST' }); } catch {}
    tripsPanel.hidden = true;
    pastDueBanner.hidden = true;
    authPanel.hidden = false;
    showTab('signin');
  });

  async function loadTrips() {
    hideError(tripsError);
    try {
      const res = await fetch('/api/parent-trips');
      const data = await res.json();
      if (!res.ok || data.error) {
        authPanel.hidden = false;
        tripsPanel.hidden = true;
        return;
      }
      renderTrips(data.trips || []);
      renderPastDue(data.pastDue || 0);
      authPanel.hidden = true;
      tripsPanel.hidden = false;
    } catch {
      showError(tripsError, 'Unable to reach the server. Please try again.');
    }
  }

  function renderPastDue(amount) {
    if (!amount || amount <= 0) {
      pastDueBanner.hidden = true;
      return;
    }
    pastDueText.textContent = `You have a past due balance of $${Number(amount).toFixed(2)} from a failed bank transfer. New bookings are on hold until this is paid.`;
    pastDueBanner.hidden = false;
  }

  payPastDueBtn.addEventListener('click', async () => {
    pastDueError.hidden = true;
    payPastDueBtn.disabled = true;
    payPastDueBtn.textContent = 'Redirecting to payment…';
    try {
      const res = await fetch('/api/pay-past-due', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) {
        showError(pastDueError, data.error || 'Unable to start payment.');
        payPastDueBtn.disabled = false;
        payPastDueBtn.textContent = 'Pay Past Due Balance';
        return;
      }
      window.location.href = data.url;
    } catch {
      showError(pastDueError, 'Unable to reach the server. Please try again.');
      payPastDueBtn.disabled = false;
      payPastDueBtn.textContent = 'Pay Past Due Balance';
    }
  });

  function renderTrips(trips) {
    if (!trips.length) {
      tripList.innerHTML = '<p>No trips yet.</p>';
      return;
    }
    tripList.innerHTML = trips.map(tripCard).join('');
  }

  function tripCard(t) {
    const statusLabel = STATUS_LABELS[t.status] || t.status;
    const date = t.createdAt
      ? new Date(t.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : '—';
    const amount = t.total != null ? `$${Number(t.total).toFixed(2)}` : '—';
    const amountLabel = t.paymentStatus === 'pending' ? 'Amount (bank transfer processing)'
      : t.paymentStatus === 'failed' ? 'Amount (bank transfer failed)'
      : 'Amount Paid';
    return `
      <div class="price-result" style="margin-top:0; margin-bottom:1rem;">
        <div class="price-row price-row-total"><span>${escapeHtml(t.childName) || 'Child'}</span><span>${statusLabel}</span></div>
        <div class="price-row"><span>Date</span><span>${date}</span></div>
        <div class="price-row"><span>Service</span><span>${escapeHtml(t.category) || '—'}</span></div>
        <div class="price-row"><span>Pickup</span><span>${escapeHtml(t.pickupAddress) || '—'}</span></div>
        <div class="price-row"><span>Drop-off</span><span>${escapeHtml(t.dropoffAddress) || '—'}</span></div>
        <div class="price-row price-row-total"><span>${amountLabel}</span><span>${amount}</span></div>
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

  // If a valid session cookie already exists from a previous visit, skip straight to trips.
  loadTrips();
})();
