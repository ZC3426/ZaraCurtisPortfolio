(function () {
  function init() {
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('header.site-nav nav.links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    Array.prototype.forEach.call(links.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 960) {
        links.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function initStyleToggle() {
    var STORAGE_KEY = 'zc-site-style';
    var root = document.documentElement;
    var toggle = document.querySelector('.style-toggle');
    if (!toggle) return;

    toggle.setAttribute('aria-pressed', root.getAttribute('data-theme') === 'personal' ? 'true' : 'false');

    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'business' ? 'personal' : 'business';
      root.setAttribute('data-theme', next);
      toggle.setAttribute('aria-pressed', next === 'personal' ? 'true' : 'false');
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); initStyleToggle(); });
  } else {
    init();
    initStyleToggle();
  }
})();
