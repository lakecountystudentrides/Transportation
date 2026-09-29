(function () {
  const form = document.getElementById('booking-form');
  const btn = document.getElementById('get-price-btn');
  const resultEl = document.getElementById('price-result');
  const errorEl = document.getElementById('price-error');

  const CARD_SURCHARGE_RATE = 0.03; // must match functions/api/checkout.js

  let lastQuote = null; // { total, category, breakdown } once a price has been fetched
  let stage = 'quote'; // 'quote' -> 'pay'
  let isMonthly = false;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError();

    if (stage === 'quote') {
      await getPrice();
    } else {
      await goToCheckout();
    }
  });

  // If they already have a price and then change the service or number of
  // children, refresh the price automatically instead of silently charging
  // them for whatever they originally picked.
  form.category.addEventListener('change', refreshPriceIfAlreadyQuoted);
  form.numChildren.addEventListener('change', refreshPriceIfAlreadyQuoted);

  async function refreshPriceIfAlreadyQuoted() {
    if (!lastQuote) return;
    stage = 'quote';
    await getPrice();
  }

  async function getPrice() {
    const pickupAddress = form.pickupAddress.value.trim();
    const category = form.category.value;
    const numChildren = form.numChildren.value;

    if (!pickupAddress) {
      showError('Please enter a pickup address.');
      return;
    }

    setLoading(true, 'Calculating…');
    try {
      const res = await fetch('/api/price', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pickupAddress, category, children: numChildren }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        showError(data.error || 'Unable to calculate a price right now.');
        setLoading(false, 'Get Price');
        return;
      }

      lastQuote = data;
      isMonthly = category.startsWith('monthly');
      renderQuote(data, category);
      wirePaymentMethodRadios();
      wireAutoPayCheckbox();
      stage = 'pay';
      setLoading(false, payButtonLabel());
    } catch {
      showError('Something went wrong calculating your price. Please try again.');
      setLoading(false, 'Get Price');
    }
  }

  async function goToCheckout() {
    if (!lastQuote) return;

    const parentEmail = form.parentEmail.value.trim();
    const category = form.category.options[form.category.selectedIndex].text.split(' — ')[0];
    const childName = form.childName.value.trim();

    setLoading(true, 'Redirecting to payment…');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          amount: lastQuote.total,
          description: `${category} for ${childName || 'your child'}`,
          customerEmail: parentEmail,
          category,
          childName,
          childAge: form.childAge.value,
          childGrade: form.childGrade.value,
          parentName: form.parentName.value.trim(),
          parentPhone: form.parentPhone.value.trim(),
          pickupAddress: form.pickupAddress.value.trim(),
          dropoffAddress: form.dropoffAddress.value.trim(),
          activityAddress: form.activityAddress.value.trim(),
          startDate: form.startDate.value,
          pickupTime: form.pickupTime.value,
          dropoffTime: form.dropoffTime.value,
          instructions: form.instructions.value.trim(),
          autoPay: isAutoPayChecked(),
          paymentMethod: selectedPaymentMethod(),
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        showError(
          data.error ||
            'Online payment is temporarily unavailable. Please email transportation@lakecountystudentrides.com with your quoted price to complete booking.'
        );
        setLoading(false, payButtonLabel());
        return;
      }

      window.location.href = data.url;
    } catch {
      showError('Unable to reach the payment processor. Please try again, or email us to complete your booking.');
      setLoading(false, payButtonLabel());
    }
  }

  function payButtonLabel() {
    const label = isMonthly && isAutoPayChecked() ? 'Subscribe & Pay' : 'Book & Pay';
    return `${label} $${displayTotal().toFixed(2)}`;
  }

  function isAutoPayChecked() {
    const cb = document.getElementById('autoPayCheckbox');
    return !!(cb && cb.checked);
  }

  function selectedPaymentMethod() {
    const checked = document.querySelector('input[name="paymentMethod"]:checked');
    return checked ? checked.value : 'credit_card';
  }

  // Mirrors the surcharge functions/api/checkout.js actually applies -- shown
  // here only so the parent sees the real total before paying, never charged
  // client-side. Only a credit card carries the surcharge -- Florida law
  // doesn't allow surcharging debit cards.
  function displayTotal() {
    return selectedPaymentMethod() === 'credit_card'
      ? round2(lastQuote.total * (1 + CARD_SURCHARGE_RATE))
      : lastQuote.total;
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function wirePaymentMethodRadios() {
    document.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        document.getElementById('paymentMethodNote').textContent = paymentMethodMessage();
        if (isMonthly) {
          document.getElementById('autoPayNote').textContent = autoPayMessage(displayTotal(), isAutoPayChecked());
        }
        setLoading(false, payButtonLabel());
      });
    });
  }

  function paymentMethodMessage() {
    return paymentMethodMessageFor(lastQuote.total, selectedPaymentMethod());
  }

  function wireAutoPayCheckbox() {
    const cb = document.getElementById('autoPayCheckbox');
    if (!cb) return;
    cb.addEventListener('change', () => {
      document.getElementById('autoPayNote').textContent = autoPayMessage(displayTotal(), cb.checked);
      setLoading(false, payButtonLabel());
    });
  }

  function renderQuote(data, category) {
    const rows = data.breakdown
      .map((b) => `<div class="price-row${b.note ? ' price-row-note' : ''}"><span>${escapeHtml(b.label)}</span><span>$${b.amount.toFixed(2)}</span></div>`)
      .join('');
    const radiusNote = data.withinFlatRadius
      ? ''
      : `<p class="price-note">Pickup is ${data.distanceMiles} mi from our base — a small distance add-on is included above.</p>`;

    const paymentMethodSection = `
      <div class="form-row" style="margin-top:0.75rem;">
        <label style="font-weight:600; display:block; margin-bottom:0.4rem;">How would you like to pay?</label>
        <label style="display:flex; align-items:center; gap:0.5rem; font-weight:400; margin-bottom:0.35rem;">
          <input type="radio" name="paymentMethod" value="credit_card" style="width:auto;" checked />
          Credit Card (+3% credit card processing fee)
        </label>
        <label style="display:flex; align-items:center; gap:0.5rem; font-weight:400; margin-bottom:0.35rem;">
          <input type="radio" name="paymentMethod" value="debit_card" style="width:auto;" />
          Debit Card (no fee)
        </label>
        <label style="display:flex; align-items:center; gap:0.5rem; font-weight:400;">
          <input type="radio" name="paymentMethod" value="bank_transfer" style="width:auto;" />
          Bank transfer / ACH (no fee, takes a few business days)
        </label>
        <p class="price-note" id="paymentMethodNote">${paymentMethodMessageFor(data.total, 'credit_card')}</p>
      </div>
    `;

    const autoPaySection = isMonthly ? `
      <div class="form-row" style="margin-top:0.75rem;">
        <label style="display:flex; align-items:center; gap:0.5rem; font-weight:600;">
          <input type="checkbox" id="autoPayCheckbox" style="width:auto;" />
          Set up automatic monthly payments
        </label>
        <p class="price-note" id="autoPayNote">${autoPayMessage(data.total, false)}</p>
      </div>
    ` : '';

    resultEl.innerHTML = `
      <h3>Your Price</h3>
      ${rows}
      <div class="price-row price-row-total"><span>Total</span><span>$${data.total.toFixed(2)}</span></div>
      ${radiusNote}
      ${paymentMethodSection}
      ${autoPaySection}
    `;
    resultEl.hidden = false;
  }

  function paymentMethodMessageFor(baseTotal, method) {
    if (method === 'credit_card') {
      const fee = round2(baseTotal * CARD_SURCHARGE_RATE);
      const total = round2(baseTotal * (1 + CARD_SURCHARGE_RATE));
      return `Credit card payments include a 3% credit card processing fee ($${fee.toFixed(2)}) — your total is $${total.toFixed(2)}.`;
    }
    if (method === 'debit_card') {
      return `Debit card has no processing fee — your total is $${baseTotal.toFixed(2)}.`;
    }
    return `Bank transfer (ACH) has no processing fee — your total is $${baseTotal.toFixed(2)}. Bank transfers take a few business days to clear.`;
  }

  function autoPayMessage(total, checked) {
    const startDateVal = form.startDate.value;
    const startDate = startDateVal
      ? new Date(`${startDateVal}T00:00`).toLocaleDateString('en-US', { dateStyle: 'medium' })
      : 'your start date';
    if (checked) {
      return `You'll be automatically charged $${total.toFixed(2)} starting ${startDate}, then on that same date every month until you cancel from the parent portal.`;
    }
    return `This charges $${total.toFixed(2)} for this month only — you'll need to come back and book (and pay) again next month. Check the box above to have it charged automatically every month instead.`;
  }

  function setLoading(isLoading, label) {
    btn.disabled = isLoading;
    btn.textContent = label;
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function hideError() {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
