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
      // Lets anything theme-dependent that already finished setting
      // itself up on load (like the homepage's typed heading) redo that
      // setup now, rather than sit mismatched with the new theme.
      document.dispatchEvent(new CustomEvent('zc-theme-changed'));
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

    // The clone below is position:absolute, whose containing block is
    // its positioned ancestor's PADDING box — so appending it straight
    // to document.body (with no side padding of its own) let it measure
    // against the full viewport width, wider than the space .wrap's own
    // padding actually leaves the live box. On narrow phones with a long
    // heading, that let the locked box come out wider than it could
    // really show, overflowing past the page edge.
    function availWidth() {
      var cs = getComputedStyle(box.parentNode);
      return box.parentNode.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    }

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
      clone.style.maxWidth = availWidth() + 'px';
      var h1clone = document.createElement('h1');
      h1clone.className = h1.className;
      h1clone.textContent = text;
      clone.appendChild(h1clone);
      box.parentNode.appendChild(clone);
      var rect = clone.getBoundingClientRect();
      box.parentNode.removeChild(clone);
      // +10px covers the blinking cursor glyph that always trails the
      // last typed character, which this text-only measurement doesn't.
      // Clamped to availWidth() as a safety net for that same cushion.
      box.style.minWidth = Math.min(rect.width + 10, availWidth()) + 'px';
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

  // On a phone, the 2-column card mosaic squeezes a long point into a
  // tall, narrow sliver — five-plus wrapped lines in a ~170px column.
  // Past that length a card reads better full-width (stacked alone if
  // need be) than crammed into half the screen. CSS alone can't measure
  // how many lines something actually wrapped to, so this checks each
  // card's rendered paragraph height against its line-height and
  // promotes the long ones with a "wide" class (styles.css gives that
  // grid-column: 1 / -1 at the same narrow breakpoint this only runs at).
  function initWideCards() {
    var groups = document.querySelectorAll('.two-col, .list-cards, .trend-cards');
    if (!groups.length) return;

    function measure() {
      var narrow = window.innerWidth <= 700;
      Array.prototype.forEach.call(groups, function (group) {
        Array.prototype.forEach.call(group.children, function (card) {
          card.classList.remove('wide');
          if (!narrow) return;
          var p = card.querySelector('p');
          if (!p) return;
          var cs = getComputedStyle(p);
          var lineHeight = parseFloat(cs.lineHeight);
          if (!lineHeight || isNaN(lineHeight)) lineHeight = parseFloat(cs.fontSize) * 1.4;
          var lines = Math.round(p.getBoundingClientRect().height / lineHeight);
          if (lines >= 5) card.classList.add('wide');
        });
      });
    }

    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    document.addEventListener('zc-theme-changed', function () { setTimeout(measure, 50); });
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 150);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); initStyleToggle(); initPageHeadingTyping(); initWideCards(); });
  } else {
    init();
    initStyleToggle();
    initPageHeadingTyping();
    initWideCards();
  }
})();
