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
  // Old portal "console" (My Style): three cartridges below a screen.
  // Picking one plays it like real hardware:
  //   1. eject: the screen goes black and the inserted cartridge slides
  //      down out of the slot (bottom first), tips upright and settles
  //      back into its bay;
  //   2. insert: the new one lifts out of its bay, is carried upright to
  //      just under the slot, leans back a little, dips (anticipation)
  //      and is pushed in, top edge first. It keeps its colour; the slot
  //      (a mask cut at the slot line) covers it, and only a thin shadow
  //      from the slot falls on the part at its mouth;
  //   3. the screen holds black a moment, then the page comes on.
  // A real cartridge and its moving copy are never visible together: the
  // bay copy hides on the frame the moving one appears, and reappears on
  // the frame the moving one lands. Professional shows the same markup
  // as a plain gallery that just cross-fades.
  // Video players: a bar with play/pause, a scrubber, the time and a
  // 1x/2x speed toggle. The hero one autoplays muted on a loop, but stays
  // paused for reduced-motion users and pauses while off-screen.
  function initVideoPlayers() {
    Array.prototype.forEach.call(document.querySelectorAll('.vid-player'), function (fig) {
      var v = fig.querySelector('video'), play = fig.querySelector('.vid-play'), seek = fig.querySelector('.vid-seek');
      var cur = fig.querySelector('.vid-time'), dur = fig.querySelector('.vid-dur'), speed = fig.querySelector('.vid-speed');
      if (!v || !play || !seek) return;
      var auto = fig.hasAttribute('data-autoplay');
      var userPaused = !auto || prefersReducedMotion();
      var dragging = false, raf = 0;
      function fmt(t) { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }
      function paint() {
        var d = isFinite(v.duration) ? v.duration : +seek.max;
        var t = dragging ? +seek.value : v.currentTime;
        if (!dragging) seek.value = t;
        seek.style.setProperty('--p', d ? Math.min(100, t / d * 100) + '%' : '0%');
        if (cur) cur.textContent = fmt(t);
        seek.setAttribute('aria-valuetext', fmt(t) + ' of ' + fmt(d));
      }
      function loop() { paint(); raf = v.paused ? 0 : requestAnimationFrame(loop); }
      function meta() {
        if (isFinite(v.duration) && v.duration > 0) { seek.max = v.duration; if (dur) dur.textContent = fmt(v.duration); }
        paint();
      }
      function sync() {
        var paused = v.paused;
        play.classList.toggle('is-paused', paused);
        play.setAttribute('aria-label', paused ? 'Play video' : 'Pause video');
        if (!paused && !raf) raf = requestAnimationFrame(loop);
        paint();
      }
      function tryPlay() { var p = v.play(); if (p && p.catch) p.catch(function () { sync(); }); }
      function toggle() { if (v.paused) { userPaused = false; tryPlay(); } else { userPaused = true; v.pause(); } }
      if (auto && userPaused) { v.removeAttribute('autoplay'); v.pause(); }
      v.addEventListener('loadedmetadata', meta);
      v.addEventListener('durationchange', meta);
      v.addEventListener('play', sync);
      v.addEventListener('pause', sync);
      v.addEventListener('seeked', paint);
      v.addEventListener('timeupdate', function () { if (v.paused) paint(); });
      v.addEventListener('click', toggle);
      play.addEventListener('click', toggle);
      seek.addEventListener('input', function () { dragging = true; v.currentTime = +seek.value; paint(); });
      seek.addEventListener('change', function () { dragging = false; v.currentTime = +seek.value; paint(); });
      seek.addEventListener('keydown', function (e) {        // arrows jump 5 seconds
        var step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 5 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -5 : 0;
        if (!step) return;
        e.preventDefault();
        v.currentTime = Math.max(0, Math.min(+seek.max, v.currentTime + step));
        paint();
      });
      if (speed) speed.addEventListener('click', function () {
        var fast = v.playbackRate < 2;
        v.defaultPlaybackRate = v.playbackRate = fast ? 2 : 1;
        speed.textContent = fast ? '2\u00d7' : '1\u00d7';
        speed.setAttribute('aria-pressed', fast ? 'true' : 'false');
      });
      if (auto && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) { if (!userPaused && v.paused) tryPlay(); }
            else if (!v.paused) v.pause();
          });
        }, { threshold: 0.15 }).observe(v);
      }
      if (v.readyState >= 1) meta();
      sync();
    });
  }

  function initConsole() {
    var consoleEl = document.querySelector('.console');
    if (!consoleEl) return;
    var carts = Array.prototype.slice.call(consoleEl.querySelectorAll('.cartridge'));
    var display = consoleEl.querySelector('.console-display');
    var screenImg = display && display.querySelector('img');
    var slot = consoleEl.querySelector('.console-slot');
    var now = consoleEl.querySelector('.console-now strong');
    if (!carts.length || !screenImg || !slot) return;
    var busy = false;
    var canAnimate = typeof Element.prototype.animate === 'function';
    var LAY = 24, INSERT_MS = 1050, EJECT_MS = 700, BLACK = 110, HOLD = 250, ON = 140;

    // Decode every cartridge label and screen image up front, so the
    // first insert is as smooth as the rest (no decode stall mid-flight).
    if (canAnimate) {
      carts.forEach(function (c) {
        var pre = new Image();
        pre.src = c.getAttribute('data-img');
        if (pre.decode) pre.decode().catch(function () {});
        var lab = c.querySelector('img');
        if (lab) { lab.loading = 'eager'; if (lab.decode) lab.decode().catch(function () {}); }
      });
    }

    function isBusiness() { return document.documentElement.getAttribute('data-theme') === 'business'; }

    // Toggle a cartridge's "in the console" state with no transition, so
    // it hides/reappears on exactly this frame.
    function setIn(c, isIn) {
      c.style.transition = 'none';
      c.classList.toggle('is-in', isIn);
      c.setAttribute('aria-pressed', isIn ? 'true' : 'false');
      void c.offsetWidth;
      c.style.transition = '';
    }
    function label(c) { return c.getAttribute('data-label'); }
    function setScreen(c) {
      screenImg.src = c.getAttribute('data-img');
      screenImg.alt = 'Old portal ' + label(c).toLowerCase() + ' page, anonymised';
      if (now) now.textContent = label(c);
    }

    // Professional: a plain gallery that cross-fades.
    function crossFade(c) {
      var next = new Image();
      next.className = 'console-fade';
      next.alt = '';
      next.src = c.getAttribute('data-img');
      if (now) now.textContent = label(c);
      var ready = next.decode ? next.decode().catch(function () {}) : Promise.resolve();
      ready.then(function () {
        display.appendChild(next);
        next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out', fill: 'forwards' }).onfinish = function () {
          setScreen(c);
          var settle = screenImg.decode ? screenImg.decode().catch(function () {}) : Promise.resolve();
          settle.then(function () { next.remove(); });
        };
      });
    }

    function blackScreen() {
      var boot = display.querySelector('.console-boot');
      if (!boot) {
        boot = document.createElement('div');
        boot.className = 'console-boot';
        boot.setAttribute('aria-hidden', 'true');
        display.appendChild(boot);
      }
      boot.getAnimations().forEach(function (x) { x.cancel(); });
      boot.style.opacity = '0';
      boot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: BLACK, easing: 'ease-in', fill: 'forwards' }).onfinish = function (e) {
        boot.style.opacity = '1';
        e.target.cancel();
      };
      return boot;
    }
    function screenOn(boot, c, done) {
      var pre = new Image();
      pre.src = c.getAttribute('data-img');
      var ready = pre.decode ? pre.decode().catch(function () {}) : Promise.resolve();
      ready.then(function () {
        setScreen(c);
        return screenImg.decode ? screenImg.decode().catch(function () {}) : null;
      }).then(function () {
        setTimeout(function () {
          boot.getAnimations().forEach(function (x) { x.cancel(); });
          boot.style.opacity = '1';
          boot.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ON, easing: 'ease-out', fill: 'forwards' }).onfinish = function (e) {
            boot.style.opacity = '0';
            e.target.cancel();
            done();
          };
        }, HOLD);
      });
    }

    // Geometry shared by insert and eject: everything is measured in the
    // console's own coordinates, so scrolling mid-animation can't break it.
    // The slot is vertical beside the screen on laptops (the CD slides in
    // sideways) and horizontal under it on phones (the CD goes in upwards).
    // Paths are written along the slot's axis ("along" = towards the slot,
    // "across" = sideways to line up with it) and mapped onto x/y here.
    function geometry(c) {
      var box = consoleEl.getBoundingClientRect();
      var bay = c.parentNode.getBoundingClientRect();     // the CD's resting box
      var to = slot.getBoundingClientRect();
      var v = to.height > to.width;
      var g = { box: box, bay: bay, to: to, v: v, w: bay.width, h: bay.height,
                left: bay.left - box.left, top: bay.top - box.top };
      if (v) {
        g.line = to.left + to.width / 2 - box.left;      // clip line, console x
        g.rest = (to.left + to.width / 2 + 3) - bay.left; // leading edge just past the line
        g.across = (to.top + to.height / 2) - (bay.top + bay.height / 2);
        g.size = bay.width;
      } else {
        g.line = to.top + to.height / 2 - box.top;       // clip line, console y
        g.rest = (to.top + to.height / 2 + 3) - bay.top;
        g.across = (to.left + to.width / 2) - (bay.left + bay.width / 2);
        g.size = bay.height;
      }
      return g;
    }
    // A masked moving copy of a CD. The mask covers the console (and
    // reaches below it) and cuts away only the slot's far side, so the
    // copy can travel anywhere else freely but disappears into the slot.
    function makeFly(c, g) {
      var mask = document.createElement('div');
      mask.className = 'cart-mask' + (g.v ? ' v' : '');
      mask.style.bottom = (-(g.h + 60)) + 'px';
      var clip;
      if (g.v) {
        var lx = g.line + 12, y0 = g.to.top - g.box.top - 2, y1 = g.to.bottom - g.box.top + 2;
        clip = 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ' + y1 + 'px, ' + lx + 'px ' + y1 + 'px, ' + lx + 'px ' + y0 + 'px, 0 ' + y0 + 'px)';
        mask.style.perspectiveOrigin = lx + 'px ' + ((y0 + y1) / 2) + 'px';
      } else {
        var sx0 = g.to.left - g.box.left + 12, sx1 = g.to.right - g.box.left + 12, sy = g.line;
        clip = 'polygon(0 0, ' + sx0 + 'px 0, ' + sx0 + 'px ' + sy + 'px, ' + sx1 + 'px ' + sy + 'px, ' + sx1 + 'px 0, 100% 0, 100% 100%, 0 100%)';
        mask.style.perspectiveOrigin = ((sx0 + sx1) / 2) + 'px ' + sy + 'px';
      }
      mask.style.webkitClipPath = clip;
      mask.style.clipPath = clip;
      var fly = c.cloneNode(true);
      fly.removeAttribute('aria-label');
      fly.removeAttribute('aria-pressed');
      fly.setAttribute('aria-hidden', 'true');
      fly.setAttribute('tabindex', '-1');
      fly.classList.remove('is-in', 'returning');
      fly.classList.add('cart-fly');
      var cs = getComputedStyle(c);
      fly.style.setProperty('--cart-c', cs.getPropertyValue('--cart-c'));
      fly.style.setProperty('--tape', cs.getPropertyValue('--tape'));
      fly.style.transformOrigin = g.v ? '100% 50%' : '50% 100%';   // pivot on the trailing edge
      fly.style.left = (g.left + 12) + 'px';   // the mask reaches 12px past the console each side
      fly.style.top = g.top + 'px';
      fly.style.width = g.w + 'px';
      fly.style.height = g.h + 'px';
      var shade = document.createElement('span');
      shade.className = 'cart-shade';
      fly.appendChild(shade);
      mask.appendChild(fly);
      consoleEl.appendChild(mask);
      return { mask: mask, fly: fly, shade: shade };
    }
    // Plays a path of [offset, along, across, tilt, scale, easing-to-next]
    // on the copy. Tilt leans the leading edge away from the viewer; the
    // slot's shadow stays on the slot line throughout.
    function play(f, g, path, ms) {
      function xy(p) { return g.v ? [p[1], p[2]] : [p[2], p[1]]; }
      var frames = path.map(function (p) {
        var t = xy(p);
        var k = { offset: p[0], transform: 'translate(' + t[0] + 'px, ' + t[1] + 'px) ' +
          (g.v ? 'rotateY(' + (-p[3]) + 'deg)' : 'rotateX(' + p[3] + 'deg)') + ' scale(' + p[4] + ')' };
        if (p[5]) k.easing = p[5];
        return k;
      });
      var shadeFrames = path.map(function (p) {
        var d = g.line - (g.v ? g.left : g.top) - p[1];
        var k = { offset: p[0], transform: g.v ? 'translateX(' + d + 'px)' : 'translateY(' + d + 'px)', opacity: p[3] > 0 ? 1 : 0 };
        if (p[5]) k.easing = p[5];
        return k;
      });
      f.shade.animate(shadeFrames, { duration: ms, fill: 'forwards' });
      return f.fly.animate(frames, { duration: ms, fill: 'forwards' }).finished;
    }

    function eject(c) {
      var g = geometry(c);
      var inside = g.rest - g.size - 14;     // fully inside the slot
      var f = makeFly(c, g);
      var path = [
        [0,    inside, g.across, LAY, 1, 'cubic-bezier(0.3, 0.4, 0.35, 1)'],
        [0.36, g.rest, g.across, LAY, 1, 'ease-in-out'],
        [0.46, g.rest, g.across, 0,   1, 'cubic-bezier(0.45, 0, 0.2, 1)'],
        [1,    0,      0,        0,   1]
      ];
      return play(f, g, path, EJECT_MS).then(function () {
        setIn(c, false);                     // the real one reappears where the copy landed
        f.mask.remove();
      });
    }
    function insert(c) {
      var g = geometry(c);
      var f = makeFly(c, g);
      setIn(c, true);                        // hide the bay copy on the same frame
      var path = [
        [0,    0,                   0,        0,   1,    'cubic-bezier(0.3, 0, 0.3, 1)'],
        [0.12, -12,                 0,        0,   1.04, 'cubic-bezier(0.45, 0, 0.25, 1)'],
        [0.42, g.rest,              g.across, 0,   1,    'cubic-bezier(0.4, 0, 0.3, 1)'],
        [0.55, g.rest,              g.across, LAY, 1,    'ease-in-out'],
        [0.62, g.rest + 3,          g.across, LAY, 1,    'cubic-bezier(0.55, 0, 0.85, 0.35)'],
        [1,    g.rest - g.size - 14, g.across, LAY, 1]
      ];
      return play(f, g, path, INSERT_MS).then(function () {
        f.mask.remove();
        // The drive gives a small click as the disc seats.
        var base = slot.parentNode;
        var nudge = g.v ? 'translateX(-2px)' : 'translateY(2px)';
        base.animate([{ transform: 'none' }, { transform: nudge }, { transform: 'none' }], { duration: 140, easing: 'ease-out' });
      });
    }

    // Warm up: build the moving copy (mask, perspective, tilt) once,
    // invisibly, so the browser has its layers ready before the first tap.
    function warmUp() {
      if (!canAnimate || isBusiness() || busy) return;
      var c = carts.filter(function (x) { return !x.classList.contains('is-in'); })[0];
      if (!c) return;
      var g = geometry(c), f = makeFly(c, g);
      f.mask.style.opacity = '0';
      play(f, g, [[0, 0, 0, 0, 1], [1, g.rest, g.across, LAY, 1]], 120).then(function () { f.mask.remove(); });
    }
    if ('requestIdleCallback' in window) requestIdleCallback(function () { setTimeout(warmUp, 300); });
    else setTimeout(warmUp, 1200);

    carts.forEach(function (cart) {
      cart.addEventListener('click', function () {
        if (busy || cart.classList.contains('is-in')) return;
        var current = carts.filter(function (c) { return c.classList.contains('is-in'); })[0];
        if (isBusiness()) {
          if (current) setIn(current, false);
          setIn(cart, true);
          if (prefersReducedMotion() || !canAnimate) setScreen(cart); else crossFade(cart);
          return;
        }
        if (prefersReducedMotion() || !canAnimate) {
          if (current) setIn(current, false);
          setIn(cart, true);
          setScreen(cart);
          return;
        }
        busy = true;
        consoleEl.classList.add('busy');
        var boot = blackScreen();
        (current ? eject(current) : Promise.resolve()).then(function () {
          return insert(cart);
        }).then(function () {
          screenOn(boot, cart, function () {
            consoleEl.classList.remove('busy');
            busy = false;
          });
        });
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
    document.addEventListener('DOMContentLoaded', function () { init(); initStyleToggle(); initPageHeadingTyping(); initWideCards(); initVersionSnake(); initConsole(); initLightbox(); initMotion(); initVideoPlayers(); });
  } else {
    init();
    initStyleToggle();
    initPageHeadingTyping();
    initWideCards();
    initVersionSnake();
    initConsole();
    initLightbox();
    initMotion();
    initVideoPlayers();
  }
})();
