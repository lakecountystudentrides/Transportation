(function () {
  const form = document.getElementById('booking-form');
  const btn = document.getElementById('get-price-btn');
  const resultEl = document.getElementById('price-result');
  const errorEl = document.getElementById('price-error');

  let lastQuote = null; // { total, category, breakdown } once a price has been fetched
  let stage = 'quote'; // 'quote' -> 'pay'

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError();

    if (stage === 'quote') {
      await getPrice();
    } else {
      await goToCheckout();
    }
  });

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
      renderQuote(data, category);
      stage = 'pay';
      setLoading(false, `Book & Pay $${data.total.toFixed(2)}`);
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
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        showError(
          data.error ||
            'Online payment is temporarily unavailable. Please email transportation@lakecountystudentrides.com with your quoted price to complete booking.'
        );
        setLoading(false, `Book & Pay $${lastQuote.total.toFixed(2)}`);
        return;
      }

      window.location.href = data.url;
    } catch {
      showError('Unable to reach the payment processor. Please try again, or email us to complete your booking.');
      setLoading(false, `Book & Pay $${lastQuote.total.toFixed(2)}`);
    }
  }

  function renderQuote(data, category) {
    const rows = data.breakdown
      .map((b) => `<div class="price-row${b.note ? ' price-row-note' : ''}"><span>${escapeHtml(b.label)}</span><span>$${b.amount.toFixed(2)}</span></div>`)
      .join('');
    const radiusNote = data.withinFlatRadius
      ? ''
      : `<p class="price-note">Pickup is ${data.distanceMiles} mi from our base — a small distance add-on is included above.</p>`;

    resultEl.innerHTML = `
      <h3>Your Price</h3>
      ${rows}
      <div class="price-row price-row-total"><span>Total</span><span>$${data.total.toFixed(2)}</span></div>
      ${radiusNote}
    `;
    resultEl.hidden = false;
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
