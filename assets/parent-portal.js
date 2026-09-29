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
  const pastDueMethodNote = document.getElementById('past-due-method-note');
  const payPastDueBtn = document.getElementById('pay-past-due-btn');
  const pastDueError = document.getElementById('past-due-error');

  const CARD_SURCHARGE_RATE = 0.03; // must match functions/api/pay-past-due.js
  let pastDueAmount = 0;

  const PROFILE_FIELDS = [
    'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship',
    'authorizedPickupName', 'authorizedPickupPhone', 'authorizedPickupRelationship',
  ];
  const saveProfileBtn = document.getElementById('save-profile-btn');
  const profileMessage = document.getElementById('profile-message');
  const profileError = document.getElementById('profile-error');

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
    for (const field of PROFILE_FIELDS) {
      const el = document.getElementById(field);
      if (el) el.value = '';
    }
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
      loadProfile();
    } catch {
      showError(tripsError, 'Unable to reach the server. Please try again.');
    }
  }

  async function loadProfile() {
    try {
      const res = await fetch('/api/parent-profile');
      const data = await res.json();
      if (!res.ok || data.error) return;
      for (const field of PROFILE_FIELDS) {
        const el = document.getElementById(field);
        if (el) el.value = data.profile?.[field] || '';
      }
    } catch {
      // Non-critical -- the form just stays blank if this fails.
    }
  }

  saveProfileBtn.addEventListener('click', async () => {
    profileError.hidden = true;
    profileMessage.hidden = true;
    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = 'Saving…';
    try {
      const body = {};
      for (const field of PROFILE_FIELDS) {
        body[field] = document.getElementById(field).value.trim();
      }
      const res = await fetch('/api/parent-profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showError(profileError, data.error || 'Unable to save. Please try again.');
        return;
      }
      profileMessage.textContent = 'Saved.';
      profileMessage.hidden = false;
    } catch {
      showError(profileError, 'Unable to reach the server. Please try again.');
    } finally {
      saveProfileBtn.disabled = false;
      saveProfileBtn.textContent = 'Save';
    }
  });

  function renderPastDue(amount) {
    if (!amount || amount <= 0) {
      pastDueBanner.hidden = true;
      return;
    }
    pastDueAmount = Number(amount);
    pastDueText.textContent = `You have a past due balance of $${pastDueAmount.toFixed(2)} from a failed bank transfer. New bookings are on hold until this is paid.`;
    updatePastDueMethodNote();
    payPastDueBtn.textContent = pastDuePayButtonLabel();
    pastDueBanner.hidden = false;
  }

  document.querySelectorAll('input[name="pastDuePaymentMethod"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      updatePastDueMethodNote();
      payPastDueBtn.textContent = pastDuePayButtonLabel();
    });
  });

  function selectedPastDuePaymentMethod() {
    const checked = document.querySelector('input[name="pastDuePaymentMethod"]:checked');
    return checked ? checked.value : 'credit_card';
  }

  // Only a credit card carries the surcharge -- Florida law doesn't allow
  // surcharging debit cards.
  function pastDueDisplayTotal() {
    return selectedPastDuePaymentMethod() === 'credit_card'
      ? round2(pastDueAmount * (1 + CARD_SURCHARGE_RATE))
      : pastDueAmount;
  }

  function pastDuePayButtonLabel() {
    return `Pay Past Due Balance ($${pastDueDisplayTotal().toFixed(2)})`;
  }

  function updatePastDueMethodNote() {
    const method = selectedPastDuePaymentMethod();
    if (method === 'credit_card') {
      const fee = round2(pastDueAmount * CARD_SURCHARGE_RATE);
      pastDueMethodNote.textContent = `Credit card payments include a 3% credit card processing fee ($${fee.toFixed(2)}) — your total is $${pastDueDisplayTotal().toFixed(2)}.`;
    } else if (method === 'debit_card') {
      pastDueMethodNote.textContent = `Debit card has no processing fee — your total is $${pastDueDisplayTotal().toFixed(2)}.`;
    } else {
      pastDueMethodNote.textContent = `Bank transfer (ACH) has no processing fee — your total is $${pastDueDisplayTotal().toFixed(2)}. Bank transfers take a few business days to clear.`;
    }
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  payPastDueBtn.addEventListener('click', async () => {
    pastDueError.hidden = true;
    payPastDueBtn.disabled = true;
    payPastDueBtn.textContent = 'Redirecting to payment…';
    try {
      const res = await fetch('/api/pay-past-due', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paymentMethod: selectedPastDuePaymentMethod() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showError(pastDueError, data.error || 'Unable to start payment.');
        payPastDueBtn.disabled = false;
        payPastDueBtn.textContent = pastDuePayButtonLabel();
        return;
      }
      window.location.href = data.url;
    } catch {
      showError(pastDueError, 'Unable to reach the server. Please try again.');
      payPastDueBtn.disabled = false;
      payPastDueBtn.textContent = pastDuePayButtonLabel();
    }
  });

  function renderTrips(trips) {
    if (!trips.length) {
      tripList.innerHTML = '<p>No trips yet.</p>';
      return;
    }
    tripList.innerHTML = trips.map(tripCard).join('');

    tripList.querySelectorAll('[data-cancel-trip-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Cancel this monthly plan? You will not be charged again after the current billing period ends.')) return;
        btn.disabled = true;
        btn.textContent = 'Canceling…';
        try {
          const res = await fetch('/api/cancel-subscription', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ tripId: btn.getAttribute('data-cancel-trip-id') }),
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            showError(tripsError, data.error || 'Unable to cancel this plan.');
            btn.disabled = false;
            btn.textContent = 'Cancel Plan';
            return;
          }
          await loadTrips();
        } catch {
          showError(tripsError, 'Unable to reach the server. Please try again.');
          btn.disabled = false;
          btn.textContent = 'Cancel Plan';
        }
      });
    });
  }

  function tripCard(t) {
    const statusLabel = STATUS_LABELS[t.status] || t.status;
    const amount = t.total != null ? `$${Number(t.total).toFixed(2)}` : '—';
    const amountLabel = t.paymentStatus === 'pending' ? 'Amount (bank transfer processing)'
      : t.paymentStatus === 'failed' ? 'Amount (bank transfer failed)'
      : 'Amount Paid';
    const pickup = (escapeHtml(t.pickupAddress) || '—') + (t.pickupTime ? ' at ' + formatTime(t.pickupTime) : '');
    const dropoff = (escapeHtml(t.dropoffAddress) || '—') + (t.dropoffTime ? ' at ' + formatTime(t.dropoffTime) : '');
    const billingRow = t.subscriptionId
      ? `<div class="price-row"><span>Next Billing Date</span><span>${t.nextBillingDate ? formatFullDate(t.nextBillingDate) : 'Pending'}</span></div>`
      : '';
    const cancelBtn = t.subscriptionId
      ? (t.cancelPending
          ? '<p class="price-note">Auto-pay canceled — this plan will not renew.</p>'
          : `<button class="btn btn-ghost" data-cancel-trip-id="${t.id}" style="margin-top:0.5rem;">Cancel Plan</button>`)
      : '';
    return `
      <div class="price-result" style="margin-top:0; margin-bottom:1rem;">
        <div class="price-row price-row-total"><span>${escapeHtml(t.childName) || 'Child'}</span><span>${statusLabel}</span></div>
        <div class="price-row"><span>Date</span><span>${formatDate(t)}</span></div>
        <div class="price-row"><span>Service</span><span>${escapeHtml(t.category) || '—'}</span></div>
        <div class="price-row"><span>Pickup</span><span>${pickup}</span></div>
        <div class="price-row"><span>Drop-off</span><span>${dropoff}</span></div>
        ${t.activityAddress ? `<div class="price-row"><span>Then to</span><span>${escapeHtml(t.activityAddress)}</span></div>` : ''}
        <div class="price-row price-row-total"><span>${amountLabel}</span><span>${amount}</span></div>
        ${billingRow}
        ${cancelBtn}
      </div>
    `;
  }

  function formatFullDate(isoString) {
    const d = new Date(isoString);
    return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { dateStyle: 'medium' });
  }

  function formatTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
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
