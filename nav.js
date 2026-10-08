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
      var startX = -40, endX = rowRect.width + 40;
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
  function initPortalGallery() {
    var gallery = document.querySelector('.portal-gallery');
    if (!gallery) return;
    var thumbs = Array.prototype.slice.call(gallery.querySelectorAll('.portal-thumb'));
    var viewerImg = gallery.querySelector('.portal-viewer-img img');
    if (!thumbs.length || !viewerImg) return;

    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        if (thumb.classList.contains('active')) return;
        var thumbImg = thumb.querySelector('.portal-thumb-img img');
        var src = thumb.getAttribute('data-img');
        var alt = thumbImg.alt;
        var startRect = thumbImg.getBoundingClientRect();
        var endRect = gallery.querySelector('.portal-viewer-img').getBoundingClientRect();

        var fly = document.createElement('div');
        fly.className = 'portal-fly';
        var flyImg = document.createElement('img');
        flyImg.src = src;
        flyImg.alt = '';
        fly.appendChild(flyImg);
        fly.style.left = startRect.left + 'px';
        fly.style.top = startRect.top + 'px';
        fly.style.width = startRect.width + 'px';
        fly.style.height = startRect.height + 'px';
        document.body.appendChild(fly);

        // Flip from the start rect to the end rect — forcing a reflow
        // between setting the start position and the end position is
        // what makes the transition actually animate between them,
        // rather than jumping straight to the final state.
        void fly.offsetWidth;
        requestAnimationFrame(function () {
          fly.style.left = endRect.left + 'px';
          fly.style.top = endRect.top + 'px';
          fly.style.width = endRect.width + 'px';
          fly.style.height = endRect.height + 'px';
        });

        thumbs.forEach(function (t) { t.classList.remove('active'); });
        thumb.classList.add('active');

        setTimeout(function () {
          viewerImg.src = src;
          viewerImg.alt = alt;
          fly.remove();
        }, 460);
      });
    });
  }

  // Dense UI screenshots stay hard to read even at full content width on
  // a phone, so any large case-study screenshot opens full-screen.
  function initLightbox() {
    var imgs = document.querySelectorAll('.shot-stack .shot img, .shot-pair .shot img');
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
    document.addEventListener('DOMContentLoaded', function () { init(); initStyleToggle(); initPageHeadingTyping(); initWideCards(); initVersionSnake(); initPortalGallery(); initLightbox(); });
  } else {
    init();
    initStyleToggle();
    initPageHeadingTyping();
    initWideCards();
    initVersionSnake();
    initPortalGallery();
    initLightbox();
  }
})();
