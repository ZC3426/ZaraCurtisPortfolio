// Soot sprites (My Style, homepage, phones only — a trial).
//
// A few fuzzy soot sprites tumble into the hero on load and hop around
// the title box; as the page scrolls they jump down from ledge to ledge
// (the top edges of the cards and sections in view) and back up again.
//
// The fur is procedural: one shared SVG filter runs fractal noise
// through a displacement map on each black ball, and the noise drifts
// slightly so the fur shimmers. Jumps use real projectile motion
// (constant gravity, sampled into a Web Animations keyframe track) with
// squash on take-off and landing. Everything moves with transforms
// only, the layer never takes pointer events, and nothing runs for
// people who prefer reduced motion.
(function () {
  'use strict';

  var MOBILE = window.matchMedia('(max-width: 700px)');
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  var COUNT = 4, SIZE = 30, GRAVITY = 2300;
  var layer = null, sprites = [], timers = [], running = false, scrollQueued = false;

  function isOn() {
    return document.documentElement.getAttribute('data-theme') === 'personal' &&
      MOBILE.matches && !REDUCED.matches && !!document.querySelector('.hero-textbox') &&
      typeof Element.prototype.animate === 'function';
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function later(fn, ms) {
    var t = setTimeout(function () { timers.splice(timers.indexOf(t), 1); fn(); }, ms);
    timers.push(t);
    return t;
  }

  // ---------- art ----------
  function addDefs() {
    if (document.getElementById('soot-defs')) return;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.id = 'soot-defs';
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML =
      '<defs><filter id="soot-fur" x="-40%" y="-40%" width="180%" height="180%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="noise">' +
      '<animate attributeName="baseFrequency" values="0.82;0.95;0.86;0.82" dur="0.9s" repeatCount="indefinite"/>' +
      '</feTurbulence>' +
      '<feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter></defs>';
    document.body.appendChild(svg);
  }

  function makeSprite(i) {
    var el = document.createElement('div');
    el.className = 'soot';
    el.innerHTML =
      '<div class="soot-shadow"></div>' +
      '<div class="soot-body"><div class="soot-breathe">' +
      '<svg viewBox="0 0 60 60" aria-hidden="true">' +
      '<g filter="url(#soot-fur)"><circle cx="30" cy="32" r="18" fill="#141210"/></g>' +
      '<circle cx="30" cy="32" r="14.5" fill="#141210"/>' +
      '<g class="soot-eyes">' +
      '<ellipse cx="23.5" cy="30" rx="5.6" ry="6.4" fill="#fff"/>' +
      '<ellipse cx="36.5" cy="30" rx="5.6" ry="6.4" fill="#fff"/>' +
      '<g class="soot-pupils"><circle cx="24" cy="31" r="2.7" fill="#141210"/><circle cx="37" cy="31" r="2.7" fill="#141210"/></g>' +
      '</g></svg></div></div>';
    el.style.setProperty('--breathe-delay', (-i * 0.37) + 's');
    layer.appendChild(el);
    return { el: el, body: el.querySelector('.soot-body'), eyes: el.querySelector('.soot-eyes'),
      pupils: el.querySelector('.soot-pupils'), x: 0, y: -80, busy: false, ledge: null, i: i };
  }

  // ---------- ledges: page-coordinate top edges they can stand on ----------
  function ledges() {
    var sy = window.scrollY, vw = document.documentElement.clientWidth, out = [];
    function add(sel, inset, pick) {
      var el = pick ? pick() : document.querySelector(sel);
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      out.push({ key: sel, y: r.top + sy, x0: Math.max(8, r.left + inset), x1: Math.min(vw - SIZE - 8, r.right - SIZE - inset) });
    }
    add('.hero-textbox', 10);
    add('.hero', 14, function () { var h = document.querySelector('.hero'); return h && { getBoundingClientRect: function () { var r = h.getBoundingClientRect(); return { top: r.bottom - 6, left: r.left, right: r.right, width: r.width, height: 1 }; } }; });
    add('.section-head', 0);
    add('.carousel-slide[data-depth="0"]', 12);
    add('.mountain-band', 16);
    add('.mountain-band + section .section-head', 0);
    add('.contact-box', 18);
    add('.site-footer', 20);
    // Don't stand where the floating style toggle would cover them.
    var tg = document.querySelector('.style-toggle');
    if (tg) {
      var tr = tg.getBoundingClientRect(), tTop = tr.top + sy - 4, tBottom = tr.bottom + sy + 4;
      out.forEach(function (l) {
        if (l.y - SIZE < tBottom && l.y > tTop) l.x1 = Math.min(l.x1, tr.left - SIZE - 6);
      });
    }
    out = out.filter(function (l) { return l.x1 >= l.x0; });
    return out.sort(function (a, b) { return a.y - b.y; });
  }
  function spot(ledge, s) {
    var span = ledge.x1 - ledge.x0;
    var slot = (s.i + 0.5) / COUNT;
    return { x: ledge.x0 + span * Math.min(1, Math.max(0, slot + rand(-0.12, 0.12))), y: ledge.y - SIZE + 4 };
  }

  // ---------- motion ----------
  function place(s, x, y) {
    s.x = x; s.y = y;
    s.el.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
  }
  function squash(s, sx, sy, ms) {
    return s.body.animate([{ transform: 'scale(1, 1)' }, { transform: 'scale(' + sx + ', ' + sy + ')' }],
      { duration: ms, easing: 'ease-out', fill: 'forwards' }).finished;
  }
  function land(s) {
    s.body.animate([
      { transform: 'scale(1.32, 0.66)' }, { transform: 'scale(0.92, 1.08)', offset: 0.45 },
      { transform: 'scale(1.03, 0.97)', offset: 0.75 }, { transform: 'scale(1, 1)' }
    ], { duration: 320, easing: 'ease-out' });
  }
  // Projectile from (s.x, s.y) to (x, y), peaking `lift` px above the
  // higher of the two points.
  function jump(s, x, y, lift) {
    s.busy = true;
    var x0 = s.x, y0 = s.y;
    var apex = Math.min(y0, y) - lift;
    var vy0 = -Math.sqrt(2 * GRAVITY * Math.max(1, y0 - apex));
    var disc = vy0 * vy0 - 2 * GRAVITY * (y0 - y);
    var T = (-vy0 + Math.sqrt(Math.max(0, disc))) / GRAVITY;
    var N = 24, frames = [];
    for (var k = 0; k <= N; k++) {
      var t = T * k / N;
      frames.push({ transform: 'translate(' + (x0 + (x - x0) * k / N) + 'px, ' + (y0 + vy0 * t + 0.5 * GRAVITY * t * t) + 'px)' });
    }
    // Pupils glance the way it's heading.
    var look = Math.max(-1.6, Math.min(1.6, (x - x0) / 40));
    s.pupils.style.transform = 'translate(' + look + 'px, ' + (y > y0 ? 1.2 : -1) + 'px)';
    return squash(s, 1.25, 0.72, 110).then(function () {
      s.body.animate([{ transform: 'scale(1.25, 0.72)' }, { transform: 'scale(0.82, 1.22)', offset: 0.18 },
        { transform: 'scale(1, 1)', offset: 0.5 }, { transform: 'scale(0.9, 1.12)', offset: 0.92 }, { transform: 'scale(0.9, 1.12)' }],
        { duration: T * 1000, fill: 'forwards' });
      return s.el.animate(frames, { duration: T * 1000, easing: 'linear', fill: 'forwards' }).finished;
    }).then(function () {
      place(s, x, y);
      s.el.getAnimations().forEach(function (a) { a.cancel(); });
      s.body.getAnimations().forEach(function (a) { a.cancel(); });
      land(s);
      later(function () { s.pupils.style.transform = ''; }, 500);
      s.busy = false;
    });
  }
  function blink(s) {
    s.eyes.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.1)', offset: 0.5 }, { transform: 'scaleY(1)' }], { duration: 160 });
  }

  // ---------- behaviour ----------
  function targetLedge(all) {
    var vh = window.innerHeight, top = window.scrollY;
    var inView = all.filter(function (l) { return l.y > top + vh * 0.28 && l.y < top + vh * 0.9; });
    if (inView.length) return inView[0];
    var mid = top + vh * 0.5, best = all[0];
    all.forEach(function (l) { if (Math.abs(l.y - mid) < Math.abs(best.y - mid)) best = l; });
    return best;
  }
  function follow() {
    scrollQueued = false;
    if (!running) return;
    var all = ledges(), target = targetLedge(all);
    sprites.forEach(function (s, n) {
      if (s.busy || (s.ledge && s.ledge.key === target.key)) return;
      later(function () {
        if (!running || s.busy) return;
        var all2 = ledges(), t2 = targetLedge(all2);
        var p = spot(t2, s);
        var up = p.y < s.y;
        s.ledge = t2;
        jump(s, p.x, p.y, up ? rand(36, 56) : rand(14, 30));
      }, n * 140 + rand(0, 120));
    });
  }
  function onScroll() {
    if (scrollQueued || !running) return;
    scrollQueued = true;
    later(follow, 160);
  }
  // Every so often each one does something small: a hop along its ledge,
  // a hop to the other ledge in the hero, or just a blink.
  function idle(s) {
    if (!running) return;
    later(function () {
      if (!running) return;
      if (!s.busy && s.ledge) {
        var roll = Math.random();
        if (roll < 0.45) {
          var all = ledges(), here = all.filter(function (l) { return l.key === s.ledge.key; })[0] || s.ledge;
          var hero = all.filter(function (l) { return l.key === '.hero-textbox' || l.key === '.hero'; });
          var onHero = s.ledge.key === '.hero-textbox' || s.ledge.key === '.hero';
          var next = (onHero && hero.length === 2 && Math.random() < 0.4) ? hero[s.ledge.key === '.hero' ? 0 : 1] : here;
          var p = { x: rand(next.x0, next.x1), y: next.y - SIZE + 4 };
          s.ledge = next;
          jump(s, p.x, p.y, rand(18, 40));
        } else if (roll < 0.8) {
          blink(s);
        } else {
          s.pupils.style.transform = 'translate(' + rand(-1.6, 1.6) + 'px, 0)';
        }
      }
      idle(s);
    }, rand(1400, 3400));
  }

  function start() {
    if (running || !isOn()) return;
    running = true;
    addDefs();
    layer = document.createElement('div');
    layer.className = 'soot-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    var all = ledges(), heroLedges = all.filter(function (l) { return l.key === '.hero-textbox' || l.key === '.hero'; });
    for (var i = 0; i < COUNT; i++) sprites.push(makeSprite(i));
    // Tumble in from above the hero, one by one.
    sprites.forEach(function (s, n) {
      var ledge = heroLedges[n % heroLedges.length] || all[0];
      var p = spot(ledge, s);
      place(s, p.x + rand(-30, 30), window.scrollY - 60);
      s.ledge = ledge;
      later(function () {
        if (!running) return;
        jump(s, p.x, p.y, 4).then(function () { idle(s); });
      }, 500 + n * 380);
    });
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  function stop() {
    running = false;
    timers.forEach(clearTimeout); timers = [];
    window.removeEventListener('scroll', onScroll);
    if (layer) layer.remove();
    layer = null; sprites = [];
  }
  function refresh() { if (isOn()) start(); else stop(); }

  function boot() {
    // Wait for the hero heading to finish typing so they land on its final shape.
    later(refresh, 1200);
    document.addEventListener('zc-theme-changed', function () { setTimeout(refresh, 80); });
    if (MOBILE.addEventListener) MOBILE.addEventListener('change', refresh);
    document.addEventListener('visibilitychange', function () {
      document.getAnimations().forEach(function (a) {
        if (a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.soot-layer')) {
          if (document.hidden) a.pause(); else a.play();
        }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
