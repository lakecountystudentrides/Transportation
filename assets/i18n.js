// Lightweight EN/ES toggle. Translatable elements carry the Spanish text
// right on the element via data-i18n-es (innerHTML) or, for attributes
// like placeholder/alt, data-i18n-es-<attr>. The English version is
// captured from the live DOM the first time a page switches to Spanish,
// so there's no separate English dictionary to keep in sync with the HTML.
// The chosen language is remembered (localStorage) and re-applied on every
// page load, so it carries across the site as someone navigates.
(function () {
  const STORAGE_KEY = 'lcsr_lang';

  function currentLang() {
    try { return localStorage.getItem(STORAGE_KEY) || 'en'; } catch { return 'en'; }
  }

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
    applyLang(lang);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => setLang(currentLang() === 'es' ? 'en' : 'es'));
    });
    applyLang(currentLang());
  });
})();
