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

  // Every non-homepage page (About, Case studies, each project) types
  // its heading out on open too, same as the homepage hero. Plain text,
  // no typos — just a quick character-by-character reveal.
  function initPageHeadingTyping() {
    var h1 = document.querySelector('.page-hero .title-box h1');
    if (!h1) return;
    var box = h1.closest('.title-box');
    var text = h1.textContent;

    function start() {
      if (box) {
        var rect = box.getBoundingClientRect();
        box.style.minWidth = rect.width + 'px';
        box.style.minHeight = rect.height + 'px';
      }
      h1.textContent = '';
      var cursor = document.createElement('span');
      cursor.className = 'type-cursor';
      cursor.textContent = '|';
      h1.appendChild(cursor);

      var per = 32;
      if (text.length * per > 1300) per = 1300 / text.length;
      var i = 0;
      function step() {
        if (i >= text.length) { cursor.remove(); return; }
        cursor.insertAdjacentText('beforebegin', text[i]);
        i++;
        setTimeout(step, per * (0.7 + Math.random() * 0.6));
      }
      setTimeout(step, 150);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(start);
    } else {
      start();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); initStyleToggle(); initPageHeadingTyping(); });
  } else {
    init();
    initStyleToggle();
    initPageHeadingTyping();
  }
})();
