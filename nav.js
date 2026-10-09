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
      if (window.innerWidth > 1120) {
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
      function apply() {
        root.setAttribute('data-theme', next);
        toggle.setAttribute('aria-pressed', next === 'personal' ? 'true' : 'false');
        try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
        // Lets anything theme-dependent that already finished setting
        // itself up on load (like the homepage's typed heading) redo that
        // setup now, rather than sit mismatched with the new theme.
        document.dispatchEvent(new CustomEvent('zc-theme-changed'));
      }
      // Cross-fade the whole page between themes where supported.
      if (document.startViewTransition && !prefersReducedMotion()) document.startViewTransition(apply);
      else apply();
    });
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // Scroll-driven motion for both themes: content blocks fade up as they
  // enter the viewport (grid items staggered), the nav gains depth once
  // the page scrolls under it, and simple percentage figures count up.
  // Only adds classes, so without JS or IntersectionObserver everything
  // is simply visible.
  function initMotion() {
    var header = document.querySelector('header.site-nav');
    if (header) {
      var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;

    // Containers whose children animate individually (staggered) rather
    // than the container moving as one block.
    var STAGGER = '.page-study, .list-cards, .two-col, .stat-row, .trend-cards, .shot-row, .shot-stack, .shot-pair, .shot-duo, .shot-trio, .work-list';
    var targets = [];
    function add(el, delay) {
      if (!el || el.nodeType !== 1 || el.classList.contains('rv')) return;
      el.style.setProperty('--rv-delay', delay + 'ms');
      el.classList.add('rv');
      targets.push(el);
    }
    function collect(parent) {
      Array.prototype.forEach.call(parent.children, function (child) {
        if (child.matches('script, style, .style-toggle, .back, .title-box')) return;
        if (child.matches(STAGGER)) {
          var j = 0;
          Array.prototype.forEach.call(child.children, function (gc) {
            if (gc.matches(STAGGER)) collect(gc);
            else add(gc, Math.min(j++, 5) * 90);
          });
        } else {
          add(child, 0);
        }
      });
    }

    // Case-study hero content arrives in sequence on load (the title types
    // itself in, so it's left alone).
    var heroBits = document.querySelectorAll('.cs-hero .lede, .cs-hero .cs-links, .cs-hero .overview-grid, .cs-hero .device-row > *');
    Array.prototype.forEach.call(heroBits, function (el, k) { add(el, 120 + k * 110); });

    var roots = document.querySelectorAll(
      'main > section:not(.hero):not(.page-hero):not(.cs-hero):not(.mountain-band) > .wrap, main > .wrap'
    );
    Array.prototype.forEach.call(roots, collect);
    if (!targets.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        reveal(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    function reveal(el) {
      el.classList.add('rv-in');
      var delay = parseInt(el.style.getPropertyValue('--rv-delay'), 10) || 0;
      // Hand the element back its own transitions (hover lifts, etc.)
      // once the reveal has finished.
      setTimeout(function () {
        el.classList.remove('rv', 'rv-in');
        el.style.removeProperty('--rv-delay');
      }, delay + 1000);
      countUp(el);
    }

    targets.forEach(function (el) {
      // Anything already scrolled past (e.g. arriving via a back button
      // mid-page) shows immediately rather than waiting off-screen.
      if (el.getBoundingClientRect().bottom < 0) { el.classList.remove('rv'); return; }
      io.observe(el);
    });
  }

  // Counts a plain "NN%" figure up from zero as it's revealed.
  function countUp(scope) {
    var nums = scope.matches('.metrics-table td.num, .stat .num') ? [scope]
      : scope.querySelectorAll('.metrics-table td.num, .stat .num');
    Array.prototype.forEach.call(nums, function (el) {
      var m = /^(\d{1,3})%$/.exec(el.textContent.trim());
      if (!m || el.dataset.counted) return;
      el.dataset.counted = '1';
      var target = parseInt(m[1], 10), start = null, DUR = 1100;
      function frame(t) {
        if (start === null) start = t;
        var p = Math.min((t - start) / DUR, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + '%';
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
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

  // How we worked's five version tiles (V1 -> Final): once the row
  // scrolls into view, a small Snake-style chain slides under them in
  // sequence, and each tile pops up briefly as the head passes beneath
  // it. Segment positions are measured against each tile's real
  // on-screen center, so this only plays on the single-row (desktop)
  // layout .version-row uses above 700px — on the 2-column mobile
  // mosaic the track wouldn't line up under anything, so CSS hides the
  // track there and this skips playing entirely.
  function initVersionSnake() {
    var row = document.querySelector('.version-row');
    if (!row) return;
    var tiles = Array.prototype.slice.call(row.querySelectorAll('.card-mini'));
    if (!tiles.length) return;

    var track = document.createElement('div');
    track.className = 'snake-track';
    var SEGMENTS = 6, SEG_GAP = 13;
    var segs = [];
    for (var i = 0; i < SEGMENTS; i++) {
      var seg = document.createElement('span');
      seg.className = 'snake-seg';
      track.appendChild(seg);
      segs.push(seg);
    }
    row.appendChild(track);

    var played = false;
    function play() {
      if (played) return;
      played = true;
      var rowRect = row.getBoundingClientRect();
      var centers = tiles.map(function (t) {
        var r = t.getBoundingClientRect();
        return (r.left + r.right) / 2 - rowRect.left;
      });
      var startX = -40, endX = rowRect.width + 40 + SEGMENTS * SEG_GAP;
      var DURATION = 2800;

      // Segments start stacked single-file off the left edge, each one
      // trailing the next by SEG_GAP, then all animate the same net
      // distance to the mirrored offset past the right edge — a growing
      // transition-delay per segment is what makes the tail visibly
      // lag the head instead of the whole chain moving as one block.
      segs.forEach(function (seg, i) {
        seg.style.transition = 'none';
        seg.style.transform = 'translateX(' + (startX - i * SEG_GAP) + 'px)';
      });
      void track.offsetWidth;
      requestAnimationFrame(function () {
        segs.forEach(function (seg, i) {
          seg.style.transition = 'transform ' + DURATION + 'ms linear';
          seg.style.transitionDelay = (i * 55) + 'ms';
          seg.style.transform = 'translateX(' + (endX - i * SEG_GAP) + 'px)';
        });
      });

      var totalDist = endX - startX;
      centers.forEach(function (cx, i) {
        var t = ((cx - startX) / totalDist) * DURATION;
        setTimeout(function () {
          tiles[i].classList.add('pop');
          setTimeout(function () { tiles[i].classList.remove('pop'); }, 420);
        }, Math.max(0, t - 150));
      });
    }

    function maybePlay() {
      if (window.innerWidth > 700) play();
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && window.innerWidth > 700) {
            play();
            io.disconnect();
          }
        });
      }, { threshold: 0.4 });
      io.observe(row);
    } else {
      maybePlay();
    }
  }

  // A side column of screenshot thumbnails next to one large viewer.
  // Clicking a thumbnail flies a clone of it — starting at the
  // thumbnail's own on-screen position and size — over to the viewer's
  // position and size, then swaps the viewer's real content in and
  // removes the clone once it arrives, so the image reads as having
  // glided from the thumbnail into the enlarged central view.
  // Old portal "console": three cartridges below a screen. Picking one
  // flies a copy of it up to the slot under the screen, slides it in
  // (the part above the slot line clipped away, so it disappears into
  // the console), switches the screen off and back on with the new page,
  // and drops the previously inserted cartridge back into its bay.
  function initConsole() {
    var consoleEl = document.querySelector('.console');
    if (!consoleEl) return;
    var carts = Array.prototype.slice.call(consoleEl.querySelectorAll('.cartridge'));
    var screenImg = consoleEl.querySelector('.console-display img');
    var slot = consoleEl.querySelector('.console-slot');
    var now = consoleEl.querySelector('.console-now strong');
    if (!carts.length || !screenImg || !slot) return;
    var busy = false;

    function swapScreen(cart) {
      screenImg.src = cart.getAttribute('data-img');
      var label = cart.getAttribute('data-label');
      screenImg.alt = 'Old portal ' + label.toLowerCase() + ' page, anonymised';
      if (now) now.textContent = label;
    }
    function setInserted(cart) {
      carts.forEach(function (c) {
        var wasIn = c.classList.contains('is-in');
        var isIn = c === cart;
        c.classList.toggle('is-in', isIn);
        c.setAttribute('aria-pressed', isIn ? 'true' : 'false');
        if (wasIn && !isIn) {
          c.classList.remove('returning'); void c.offsetWidth; c.classList.add('returning');
          c.addEventListener('animationend', function done() { c.classList.remove('returning'); c.removeEventListener('animationend', done); });
        }
      });
    }
    function screenOn() {
      screenImg.classList.remove('screen-off');
      screenImg.classList.add('screen-on');
      screenImg.addEventListener('animationend', function done() { screenImg.classList.remove('screen-on'); screenImg.removeEventListener('animationend', done); });
    }

    carts.forEach(function (cart) {
      cart.addEventListener('click', function () {
        if (busy || cart.classList.contains('is-in')) return;
        if (prefersReducedMotion()) { swapScreen(cart); setInserted(cart); return; }
        busy = true;
        consoleEl.classList.add('busy');
        var from = cart.getBoundingClientRect();
        var slotRect = slot.getBoundingClientRect();

        var fly = cart.cloneNode(true);
        fly.removeAttribute('aria-label');
        fly.setAttribute('aria-hidden', 'true');
        fly.classList.add('cart-fly');
        fly.style.setProperty('--cart-c', getComputedStyle(cart).getPropertyValue('--cart-c'));
        fly.style.left = from.left + 'px';
        fly.style.top = from.top + 'px';
        fly.style.width = from.width + 'px';
        fly.style.height = from.height + 'px';
        document.body.appendChild(fly);
        setInserted(cart);

        // 1. Travel: the cartridge's top edge lines up with the slot.
        void fly.offsetWidth;
        requestAnimationFrame(function () {
          fly.style.left = (slotRect.left + slotRect.width / 2 - from.width / 2) + 'px';
          fly.style.top = (slotRect.top + slotRect.height / 2) + 'px';
        });
        // 2. Insert: slides up into the slot while the screen goes off.
        setTimeout(function () {
          fly.classList.add('inserting');
          screenImg.classList.remove('screen-on');
          screenImg.classList.add('screen-off');
        }, 470);
        // 3. New page comes on; tidy up.
        setTimeout(function () {
          swapScreen(cart);
          screenOn();
          fly.remove();
          consoleEl.classList.remove('busy');
          busy = false;
        }, 470 + 400);
      });
    });
  }

  // Dense UI screenshots stay hard to read even at full content width on
  // a phone, so any large case-study screenshot opens full-screen.
  function initLightbox() {
    var imgs = document.querySelectorAll('.shot-stack .shot img, .shot-pair .shot img, .shot-duo .shot img, .shot-trio .shot img, .console-display img');
    if (!imgs.length) return;
    var box = null, lastFocus = null;

    function onKey(e) { if (e.key === 'Escape') close(); }
    function close() {
      if (!box) return;
      var b = box; box = null;
      b.classList.remove('open');
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { b.remove(); }, 200);
      if (lastFocus) lastFocus.focus();
    }
    function open(img) {
      lastFocus = img;
      box = document.createElement('div');
      box.className = 'lightbox';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', img.alt || 'Enlarged screenshot');
      var big = document.createElement('img');
      big.src = img.currentSrc || img.src;
      big.alt = img.alt;
      if (img.closest('.shot.phone')) big.className = 'phone';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lightbox-close';
      btn.setAttribute('aria-label', 'Close');
      btn.textContent = '×';
      box.appendChild(big);
      box.appendChild(btn);
      box.addEventListener('click', close);
      document.addEventListener('keydown', onKey);
      document.body.appendChild(box);
      var opened = box;
      requestAnimationFrame(function () { opened.classList.add('open'); });
      btn.focus();
    }

    Array.prototype.forEach.call(imgs, function (img) {
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.addEventListener('click', function () { open(img); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); initStyleToggle(); initPageHeadingTyping(); initWideCards(); initVersionSnake(); initConsole(); initLightbox(); initMotion(); });
  } else {
    init();
    initStyleToggle();
    initPageHeadingTyping();
    initWideCards();
    initVersionSnake();
    initConsole();
    initLightbox();
    initMotion();
  }
})();
