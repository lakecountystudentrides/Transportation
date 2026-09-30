(function () {
  const form = document.getElementById('booking-form');
  const btn = document.getElementById('get-price-btn');
  const resultEl = document.getElementById('price-result');
  const errorEl = document.getElementById('price-error');

  const CARD_SURCHARGE_RATE = 0.03; // must match functions/api/checkout.js

  // Falls back to English if i18n.js somehow hasn't loaded yet.
  function T(en, es) { return window.LCSR_T ? window.LCSR_T(en, es) : en; }
  function lang() { return window.LCSR_LANG || 'en'; }

  // The "category" sent to /api/checkout is stored on the trip record and
  // matched later by English regex (isRoundTrip/isRecurring in webhook.js,
  // driver.js, manage-drivers.js, trip-status.js) -- it must always be this
  // canonical English label regardless of the page's current display
  // language, never read from the <option>'s live (possibly Spanish) text.
  const CATEGORY_LABELS_EN = {
    oneway: 'One-way',
    roundtrip: 'Round trip',
    'weekly-oneway': 'Weekly, one-way only',
    'weekly-roundtrip': 'Weekly, round trip',
    'monthly-oneway': 'Monthly, one route/day',
    'monthly-roundtrip': 'Monthly, two routes/day (round trip)',
  };

  let lastQuote = null; // { total, category, breakdown } once a price has been fetched
  let stage = 'quote'; // 'quote' -> 'pay'
  let isMonthly = false;

  // Fail closed: assume bookings are closed until /api/booking-status says
  // otherwise, so a slow or failed request never lets someone through.
  let bookingsOpen = false;
  const closedBanner = document.getElementById('booking-closed-banner');
  fetch('/api/booking-status')
    .then((r) => r.json())
    .then((d) => {
      bookingsOpen = !!d.open;
      closedBanner.hidden = bookingsOpen;
      if (stage === 'pay') setLoading(false, payButtonLabel());
    })
    .catch(() => { closedBanner.hidden = false; });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError();

    // The form has novalidate (so we can control error placement/timing
    // ourselves), which means the browser never automatically enforces the
    // "required" attributes -- reportValidity() runs that same check on
    // demand instead, showing the browser's normal "please fill this out"
    // prompt pointing at whichever required field (child's name included)
    // is still empty.
    if (!form.reportValidity()) return;

    if (stage === 'quote') {
      await getPrice();
    } else {
      if (!bookingsOpen) {
        showError(T(
          "We're not accepting bookings yet. Please contact us and we'll let you know as soon as we open.",
          'Aún no estamos aceptando reservas. Por favor contáctenos y le avisaremos en cuanto abramos.'
        ));
        return;
      }
      if (!document.getElementById('agreeCheckbox').checked) {
        showError(T(
          'Please check the box certifying you are the parent/guardian and agree to the Parent Transportation Agreement, Terms & Conditions, Liability Waiver, Emergency Medical Authorization, and Privacy Policy before booking.',
          'Por favor marque la casilla certificando que usted es el padre/madre o tutor y que está de acuerdo con el Acuerdo de Transporte para Padres, los Términos y Condiciones, la Exención de Responsabilidad, la Autorización Médica de Emergencia y la Política de Privacidad antes de reservar.'
        ));
        return;
      }
      await goToCheckout();
    }
  });

  // If they already have a price and then change the service or number of
  // children, refresh the price automatically instead of silently charging
  // them for whatever they originally picked.
  form.category.addEventListener('change', refreshPriceIfAlreadyQuoted);
  form.numChildren.addEventListener('change', refreshPriceIfAlreadyQuoted);

  // Re-fetch (so the server-generated breakdown labels come back in the new
  // language too) whenever the language toggle is used after a quote exists.
  document.addEventListener('lcsr:langchange', refreshPriceIfAlreadyQuoted);

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
      showError(T('Please enter a pickup address.', 'Por favor ingrese una dirección de recogida.'));
      return;
    }

    setLoading(true, T('Calculating…', 'Calculando…'));
    try {
      const res = await fetch('/api/price', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pickupAddress, category, children: numChildren, lang: lang() }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        showError(data.error || T('Unable to calculate a price right now.', 'No se pudo calcular un precio en este momento.'));
        setLoading(false, T('Get Price', 'Obtener Precio'));
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
      showError(T('Something went wrong calculating your price. Please try again.', 'Algo salió mal al calcular su precio. Por favor intente de nuevo.'));
      setLoading(false, T('Get Price', 'Obtener Precio'));
    }
  }

  async function goToCheckout() {
    if (!lastQuote) return;

    const parentEmail = form.parentEmail.value.trim();
    const category = CATEGORY_LABELS_EN[form.category.value] || form.category.value;
    const childName = form.childName.value.trim();

    setLoading(true, T('Redirecting to payment…', 'Redirigiendo al pago…'));
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
          lang: lang(),
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        showError(
          data.error ||
            T(
              'Online payment is temporarily unavailable. Please email transportation@lakecountystudentrides.com with your quoted price to complete booking.',
              'El pago en línea no está disponible temporalmente. Por favor envíe un correo a transportation@lakecountystudentrides.com con su precio cotizado para completar la reserva.'
            )
        );
        setLoading(false, payButtonLabel());
        return;
      }

      window.location.href = data.url;
    } catch {
      showError(T('Unable to reach the payment processor. Please try again, or email us to complete your booking.', 'No se pudo conectar con el procesador de pagos. Por favor intente de nuevo, o envíenos un correo para completar su reserva.'));
      setLoading(false, payButtonLabel());
    }
  }

  function payButtonLabel() {
    if (!bookingsOpen) return T('Bookings Not Open Yet', 'Reservas Aún No Disponibles');
    const label = isMonthly && isAutoPayChecked() ? T('Subscribe & Pay', 'Suscribirse y Pagar') : T('Book & Pay', 'Reservar y Pagar');
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
      : `<p class="price-note">${T('Pickup is', 'La recogida está a')} ${data.distanceMiles} ${T('mi from our base — a small distance add-on is included above.', 'millas de nuestra base — un pequeño cargo por distancia adicional está incluido arriba.')}</p>`;

    const paymentMethodSection = `
      <div class="form-row" style="margin-top:0.75rem;">
        <label style="font-weight:600; display:block; margin-bottom:0.4rem;">${T('How would you like to pay?', '¿Cómo le gustaría pagar?')}</label>
        <label style="display:flex; align-items:center; gap:0.5rem; font-weight:400; margin-bottom:0.35rem;">
          <input type="radio" name="paymentMethod" value="credit_card" style="width:auto;" checked />
          ${T('Credit Card (+3% credit card processing fee)', 'Tarjeta de Crédito (+3% de cargo por procesamiento)')}
        </label>
        <label style="display:flex; align-items:center; gap:0.5rem; font-weight:400; margin-bottom:0.35rem;">
          <input type="radio" name="paymentMethod" value="debit_card" style="width:auto;" />
          ${T('Debit Card (no fee)', 'Tarjeta de Débito (sin cargo)')}
        </label>
        <label style="display:flex; align-items:center; gap:0.5rem; font-weight:400;">
          <input type="radio" name="paymentMethod" value="bank_transfer" style="width:auto;" />
          ${T('Bank transfer / ACH (no fee, takes a few business days)', 'Transferencia bancaria / ACH (sin cargo, tarda unos días hábiles)')}
        </label>
        <p class="price-note" id="paymentMethodNote">${paymentMethodMessageFor(data.total, 'credit_card')}</p>
      </div>
    `;

    const autoPaySection = isMonthly ? `
      <div class="form-row" style="margin-top:0.75rem;">
        <label style="display:flex; align-items:center; gap:0.5rem; font-weight:600;">
          <input type="checkbox" id="autoPayCheckbox" style="width:auto;" />
          ${T('Set up automatic monthly payments', 'Configurar pagos mensuales automáticos')}
        </label>
        <p class="price-note" id="autoPayNote">${autoPayMessage(data.total, false)}</p>
      </div>
    ` : '';

    resultEl.innerHTML = `
      <h3>${T('Your Price', 'Su Precio')}</h3>
      ${rows}
      <div class="price-row price-row-total"><span>${T('Total', 'Total')}</span><span>$${data.total.toFixed(2)}</span></div>
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
      return T(
        `Credit card payments include a 3% credit card processing fee ($${fee.toFixed(2)}) — your total is $${total.toFixed(2)}.`,
        `Los pagos con tarjeta de crédito incluyen un cargo del 3% por procesamiento ($${fee.toFixed(2)}) — su total es $${total.toFixed(2)}.`
      );
    }
    if (method === 'debit_card') {
      return T(
        `Debit card has no processing fee — your total is $${baseTotal.toFixed(2)}.`,
        `La tarjeta de débito no tiene cargo por procesamiento — su total es $${baseTotal.toFixed(2)}.`
      );
    }
    return T(
      `Bank transfer (ACH) has no processing fee — your total is $${baseTotal.toFixed(2)}. Bank transfers take a few business days to clear.`,
      `La transferencia bancaria (ACH) no tiene cargo por procesamiento — su total es $${baseTotal.toFixed(2)}. Las transferencias bancarias tardan unos días hábiles en procesarse.`
    );
  }

  function autoPayMessage(total, checked) {
    const startDateVal = form.startDate.value;
    const startDate = startDateVal
      ? new Date(`${startDateVal}T00:00`).toLocaleDateString(lang() === 'es' ? 'es' : 'en-US', { dateStyle: 'medium' })
      : T('your start date', 'su fecha de inicio');
    if (checked) {
      return T(
        `You'll be automatically charged $${total.toFixed(2)} starting ${startDate}, then on that same date every month until you cancel from the parent portal.`,
        `Se le cobrará automáticamente $${total.toFixed(2)} a partir del ${startDate}, y luego en esa misma fecha cada mes hasta que cancele desde el portal de padres.`
      );
    }
    return T(
      `This charges $${total.toFixed(2)} for this month only — you'll need to come back and book (and pay) again next month. Check the box above to have it charged automatically every month instead.`,
      `Esto cobra $${total.toFixed(2)} solo por este mes — tendrá que volver a reservar (y pagar) de nuevo el próximo mes. Marque la casilla de arriba para que se cobre automáticamente cada mes en su lugar.`
    );
  }

  function setLoading(isLoading, label) {
    btn.disabled = isLoading || (stage === 'pay' && !bookingsOpen);
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
