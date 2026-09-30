// Lightweight EN/ES toggle. Translatable static HTML carries the Spanish
// text right on the element via data-i18n-es (innerHTML) or
// data-i18n-es-placeholder for inputs. The English version is captured
// from the live DOM the first time a page switches to Spanish, so there's
// no separate English dictionary to keep in sync with the HTML.
//
// Dynamically-generated text (built in JS -- price breakdowns, trip cards,
// error messages) can't carry a data attribute before it exists, so those
// scripts call window.LCSR_T(en, es) at the point they build each string,
// and re-run their own render function on the 'lcsr:langchange' event this
// file dispatches on `document` whenever the language changes -- see
// booking.js, driver.js, manage-drivers.js, parent-portal.js.
//
// The chosen language is remembered (localStorage) and re-applied on every
// page load, so it carries across the site as someone navigates.
(function () {
  const STORAGE_KEY = 'lcsr_lang';

  function currentLang() {
    try { return localStorage.getItem(STORAGE_KEY) || 'en'; } catch { return 'en'; }
  }

  window.LCSR_LANG = currentLang();
  window.LCSR_T = function (en, es) {
    return window.LCSR_LANG === 'es' ? es : en;
  };

  function applyLang(lang) {
    document.querySelectorAll('[data-i18n-es]').forEach((el) => {
      if (!el.hasAttribute('data-i18n-en')) el.setAttribute('data-i18n-en', el.innerHTML);
      el.innerHTML = lang === 'es' ? el.getAttribute('data-i18n-es') : el.getAttribute('data-i18n-en');
    });

    document.querySelectorAll('[data-i18n-es-placeholder]').forEach((el) => {
      if (!el.hasAttribute('data-i18n-en-placeholder')) el.setAttribute('data-i18n-en-placeholder', el.getAttribute('placeholder') || '');
      el.setAttribute('placeholder', lang === 'es' ? el.getAttribute('data-i18n-es-placeholder') : el.getAttribute('data-i18n-en-placeholder'));
    });

    document.documentElement.setAttribute('lang', lang);

    document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
      btn.textContent = lang === 'es' ? 'English' : 'Español';
    });
  }

  function setLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    window.LCSR_LANG = lang;
    applyLang(lang);
    document.dispatchEvent(new CustomEvent('lcsr:langchange', { detail: { lang } }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => setLang(currentLang() === 'es' ? 'en' : 'es'));
    });
    applyLang(currentLang());
  });
})();
