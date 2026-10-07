(function () {
  const signedOutPanel = document.getElementById('signed-out-panel');
  const w4Panel = document.getElementById('w4-panel');
  const w4Form = document.getElementById('w4-form');
  const w4Error = document.getElementById('w4-error');
  const w4Success = document.getElementById('w4-success');
  const alreadySubmittedNote = document.getElementById('already-submitted-note');
  const generateBtn = document.getElementById('generate-w4-btn');

  const STORAGE_KEY = 'lcsr_driver_token'; // same key driver.js stores the access code under

  function T(en, es) { return window.LCSR_T ? window.LCSR_T(en, es) : en; }
  function lang() { return window.LCSR_LANG || 'en'; }

  const token = safeStorageGet(STORAGE_KEY);
  if (!token) {
    signedOutPanel.hidden = false;
  } else {
    init(token);
  }

  async function init(token) {
    w4Panel.hidden = false;
    signedOutPanel.hidden = true;
    setupSignaturePad();
    wireDependentsTotal();
    checkStatus(token);
  }

  async function checkStatus(token) {
    try {
      const res = await fetch('/api/w4-status', { headers: { 'x-driver-token': token } });
      const data = await res.json();
      if (res.ok && data.w4?.submitted) {
        const date = formatDate(data.w4.submittedAt.slice(0, 10));
        alreadySubmittedNote.textContent = T(
          `You already generated a W-4 on ${date}. You can fill this out again any time your info changes.`,
          `Ya generó un W-4 el ${date}. Puede completarlo de nuevo cuando su información cambie.`
        );
        alreadySubmittedNote.hidden = false;
      }
    } catch {
      // Non-critical -- the form still works without this status check.
    }
  }

  // --- Step 3 dependents total, per the IRS worksheet math ---
  function wireDependentsTotal() {
    const childrenInput = document.getElementById('w4QualifyingChildren');
    const otherInput = document.getElementById('w4OtherDependents');
    const totalEl = document.getElementById('w4DependentsTotal');
    function update() {
      const children = Math.max(0, parseInt(childrenInput.value, 10) || 0);
      const other = Math.max(0, parseInt(otherInput.value, 10) || 0);
      totalEl.textContent = (children * 2000 + other * 500).toFixed(0);
    }
    childrenInput.addEventListener('input', update);
    otherInput.addEventListener('input', update);
    update();
  }

  // --- Signature pad ---
  let signaturePadHasInk = false;
  function setupSignaturePad() {
    const canvas = document.getElementById('signature-pad');
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#16324f';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    let drawing = false;

    function pos(e) {
      const rect = canvas.getBoundingClientRect();
      const point = e.touches ? e.touches[0] : e;
      return {
        x: (point.clientX - rect.left) * (canvas.width / rect.width),
        y: (point.clientY - rect.top) * (canvas.height / rect.height),
      };
    }
    function start(e) {
      e.preventDefault();
      drawing = true;
      signaturePadHasInk = true;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
    function move(e) {
      if (!drawing) return;
      e.preventDefault();
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    function end() { drawing = false; }

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start);
    canvas.addEventListener('touchmove', move);
    canvas.addEventListener('touchend', end);

    document.getElementById('clear-signature-btn').addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      signaturePadHasInk = false;
    });
  }

  w4Form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideMessages();

    if (!w4Form.reportValidity()) return;

    const ssn = document.getElementById('w4Ssn').value.trim();
    if (!/^\d{3}-?\d{2}-?\d{4}$/.test(ssn)) {
      showError(T('Please enter a valid Social Security Number (XXX-XX-XXXX).', 'Por favor ingrese un Número de Seguro Social válido (XXX-XX-XXXX).'));
      return;
    }
    if (!signaturePadHasInk) {
      showError(T('Please sign in the signature box before generating the PDF.', 'Por favor firme en el cuadro de firma antes de generar el PDF.'));
      return;
    }

    generateBtn.disabled = true;
    try {
      generatePdf(ssn);
      await markSubmitted();
      w4Success.textContent = T(
        'Your W-4 PDF has been downloaded. Please email it or hand it to your manager to complete your records.',
        'Su PDF del W-4 ha sido descargado. Por favor envíelo por correo electrónico o entréguelo a su gerente para completar sus registros.'
      );
      w4Success.hidden = false;
    } catch (err) {
      showError(T('Unable to generate the PDF. Please try again.', 'No se pudo generar el PDF. Por favor intente de nuevo.'));
    } finally {
      generateBtn.disabled = false;
    }
  });

  async function markSubmitted() {
    try {
      await fetch('/api/w4-status', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-driver-token': token },
        body: JSON.stringify({ lang: lang() }),
      });
    } catch {
      // Non-critical -- the driver already has their PDF either way.
    }
  }

  function generatePdf(ssn) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const left = 54;
    let y = 54;
    const lineHeight = 16;

    function heading(text) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(text, left, y);
      y += lineHeight + 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    }
    function field(label, value) {
      doc.text(`${label}: ${value || ''}`, left, y);
      y += lineHeight;
    }
    function spacer(extra) { y += extra || 10; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text("Form W-4 — Employee's Withholding Certificate", left, y);
    y += 22;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Department of the Treasury — Internal Revenue Service', left, y);
    y += 10;
    doc.text('Generated via Lake County Student Rides driver portal', left, y);
    y += 20;

    const firstName = document.getElementById('w4FirstName').value.trim();
    const lastName = document.getElementById('w4LastName').value.trim();
    const address = document.getElementById('w4Address').value.trim();
    const city = document.getElementById('w4City').value.trim();
    const filingStatus = document.querySelector('input[name="filingStatus"]:checked').value;
    const filingStatusLabel = {
      single: 'Single or Married filing separately',
      joint: 'Married filing jointly (or Qualifying surviving spouse)',
      hoh: 'Head of household',
    }[filingStatus];

    heading('Step 1: Personal Information');
    field('(a) Name', `${firstName} ${lastName}`);
    field('Address', address);
    field('City/State/ZIP', city);
    field('(b) Social Security Number', ssn);
    field('(c) Filing Status', filingStatusLabel);
    spacer();

    heading('Step 2: Multiple Jobs or Spouse Works');
    field('Use simpler calculation (only two jobs total)', document.getElementById('w4MultipleJobs').checked ? 'Yes' : 'No');
    spacer();

    const children = Math.max(0, parseInt(document.getElementById('w4QualifyingChildren').value, 10) || 0);
    const otherDeps = Math.max(0, parseInt(document.getElementById('w4OtherDependents').value, 10) || 0);
    const dependentsTotal = children * 2000 + otherDeps * 500;

    heading('Step 3: Claim Dependents');
    field('Qualifying children under 17 (x $2,000)', `${children} = $${(children * 2000).toFixed(2)}`);
    field('Other dependents (x $500)', `${otherDeps} = $${(otherDeps * 500).toFixed(2)}`);
    field('Total', `$${dependentsTotal.toFixed(2)}`);
    spacer();

    const otherIncome = parseFloat(document.getElementById('w4OtherIncome').value) || 0;
    const deductions = parseFloat(document.getElementById('w4Deductions').value) || 0;
    const extraWithholding = parseFloat(document.getElementById('w4ExtraWithholding').value) || 0;

    heading('Step 4: Other Adjustments (optional)');
    field('(a) Other income (not from jobs)', `$${otherIncome.toFixed(2)}`);
    field('(b) Deductions', `$${deductions.toFixed(2)}`);
    field('(c) Extra withholding', `$${extraWithholding.toFixed(2)}`);
    spacer();

    const signDate = document.getElementById('w4SignDate').value;
    heading('Step 5: Employee Signature');
    const canvas = document.getElementById('signature-pad');
    const sigDataUrl = canvas.toDataURL('image/png');
    doc.addImage(sigDataUrl, 'PNG', left, y, 180, 60);
    y += 70;
    field('Date Signed', formatDateForPdf(signDate));
    spacer(14);

    heading('Employer (completed by employer)');
    field("Employer's name and address", 'Lake County Student Rides');
    field('Employer identification number (EIN)', '_______________________');
    field('First date of employment', '_______________________');
    field('Date received', '_______________________');

    const fileName = `W4-${(lastName || 'driver').replace(/[^a-z0-9]/gi, '')}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  }

  function formatDateForPdf(dateStr) {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T00:00`);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-US', { dateStyle: 'medium' });
  }

  function formatDate(dateStr) {
    const d = new Date(`${dateStr}T00:00`);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString(lang() === 'es' ? 'es' : 'en-US', { dateStyle: 'medium' });
  }

  function showError(msg) { w4Error.textContent = msg; w4Error.hidden = false; }
  function hideMessages() {
    w4Error.hidden = true; w4Error.textContent = '';
    w4Success.hidden = true; w4Success.textContent = '';
  }

  function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
})();
