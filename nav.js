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
    var h1 = document.querySelector('.page-hero .title-box h1, .cs-hero .title-box h1');
    if (!h1) return;
    var box = h1.closest('.title-box');
    var text = h1.textContent;

    // Measures the full heading on an offscreen clone — never the live
    // h1 — so it's safe to call again later without disturbing whatever
    // is on screen mid-animation.
    function lockBoxSize() {
      if (!box) return;
      var clone = box.cloneNode(false);
      clone.style.position = 'absolute';
      clone.style.visibility = 'hidden';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.minWidth = '0';
      clone.style.minHeight = '0';
      var h1clone = document.createElement('h1');
      h1clone.className = h1.className;
      h1clone.textContent = text;
      clone.appendChild(h1clone);
      document.body.appendChild(clone);
      var rect = clone.getBoundingClientRect();
      document.body.removeChild(clone);
      // +10px covers the blinking cursor glyph that always trails the
      // last typed character, which this text-only measurement doesn't.
      box.style.minWidth = (rect.width + 10) + 'px';
      box.style.minHeight = rect.height + 'px';
    }

    // Lock the box and clear the heading immediately, not after
    // fonts/anything else load — otherwise the full static heading (baked
    // into the HTML for no-JS/SEO) sits there at full size for a moment,
    // then suddenly snaps down to start typing.
    lockBoxSize();
    // The heading font can load late on a cold cache (e.g. a hard
    // refresh), so that first lock was measured against the fallback
    // font. Re-measuring once the real font is ready — still on an
    // invisible clone — corrects it without any visible flash.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(lockBoxSize);
    }
    h1.textContent = '';
    var cursor = document.createElement('span');
    cursor.className = 'type-cursor';
    cursor.textContent = '|';
    h1.appendChild(cursor);

    var per = 60;
    if (text.length * per > 1900) per = 1900 / text.length;
    var i = 0;
    function step() {
      if (i >= text.length) { cursor.remove(); return; }
      cursor.insertAdjacentText('beforebegin', text[i]);
      i++;
      setTimeout(step, per * (0.7 + Math.random() * 0.6));
    }
    setTimeout(step, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); initStyleToggle(); initPageHeadingTyping(); });
  } else {
    init();
    initStyleToggle();
    initPageHeadingTyping();
  }
})();
