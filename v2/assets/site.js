/* ============================================================
   Emigration Brewing Co. — shared behaviour
   ============================================================ */
(function () {
  'use strict';
  gsap.registerPlugin(ScrollTrigger);

  var isCoarse = window.matchMedia('(hover:none)').matches;
  var isSmall = window.innerWidth < 760;
  var conn = navigator.connection || {};
  var saveData = conn.saveData === true || /2g/.test(conn.effectiveType || '');
  var reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* --------------------------------------------------------
     Frame sequence loader — shared by hero + mask section.
     On small screens / save-data we load every 3rd frame:
     ~41 images instead of 121 (9.3MB -> ~3MB) and it still
     scrubs smoothly because we scrub over the loaded set.
     -------------------------------------------------------- */
  /* Pick the source directory and sampling step for a canvas.
     Phones get a 640x360 set instead of 1280x720, which is ~3x cheaper per
     frame — so we can afford EVERY frame rather than every 3rd. Skipping
     frames is what makes a scrub look steppy (each held frame had to cover
     ~60px of scroll); full density at lower resolution looks far smoother
     for slightly fewer bytes overall. */
  function pickSource(el) {
    var full = el.dataset.dir;      /* 1280x720 landscape */
    var portrait = el.dataset.dirPt; /* 720x1280, centre-cropped to 9:16 */
    /* A 16:9 frame cover-fitted into a 9:19.5 phone screen gets upscaled
       roughly 3x vertically — the single biggest cause of a soft-looking
       hero on a phone. A pre-cropped portrait source is both sharper and
       better framed, and it is lighter than the landscape set. */
    var isPortrait = window.innerHeight > window.innerWidth;
    if ((isSmall || saveData) && portrait && isPortrait) {
      return { dir: portrait, step: 1 };
    }
    if (isSmall || saveData) return { dir: full, step: 2 };
    return { dir: full, step: 1 };
  }

  function FrameSet(dir, total, step, onProgress, onReady) {
    step = step || 1;
    var idxs = [];
    for (var i = 1; i <= total; i += step) idxs.push(i);
    if (idxs[idxs.length - 1] !== total) idxs.push(total);

    this.images = [];
    this.count = idxs.length;
    var loaded = 0, self = this, fired = false;

    function tick() {
      loaded++;
      if (onProgress) onProgress(loaded / self.count);
      if (!fired && loaded >= Math.max(2, Math.floor(self.count * 0.4))) {
        fired = true;
        if (onReady) onReady();
      }
    }
    idxs.forEach(function (n) {
      var img = new Image();
      img.decoding = 'async';
      img.src = dir + '/frame-' + String(n).padStart(4, '0') + '.jpg';
      /* decode() up front so the first drawImage of each frame isn't paying
         JPEG decode cost mid-scroll — that shows up as a hitch on the exact
         frame you scroll onto. Fall back to load events where unsupported. */
      if (img.decode) {
        img.decode().then(tick, function () { img.complete ? tick() : (img.onload = tick, img.onerror = tick); });
      } else {
        img.onload = tick;
        img.onerror = tick;
      }
      self.images.push(img);
    });
  }

  /* Draw a frame cover-fit. Canvas is sized in real pixels — never
     via CSS width/height percentages (that causes scaling mismatch). */
  function makeCanvasPainter(canvas, frameset) {
    var ctx = canvas.getContext('2d', { alpha: false });
    var cur = -1; /* -1 so the very first paint(0) is never skipped */
    /* vertical crop anchor: 0 = keep the top, 0.5 = centre, 1 = keep the
       bottom. Lets a hero keep the base of a glass in frame on wide,
       short viewports where cover-fit would otherwise slice it off. */
    var focusY = parseFloat(canvas.dataset.focus);
    if (isNaN(focusY)) focusY = 0.5;
    focusY = Math.min(1, Math.max(0, focusY));

    var lastW = 0, lastH = 0;
    function size() {
      var box = canvas.parentElement;
      var w = box ? box.clientWidth : window.innerWidth;
      var h = box ? box.clientHeight : window.innerHeight;
      if (!w || !h) { w = window.innerWidth; h = window.innerHeight; }
      /* Mobile browsers fire resize constantly as the URL bar hides and
         shows, which would re-alloc the canvas and repaint mid-scroll —
         the main source of scroll jank. Ignore height-only changes small
         enough to be browser chrome; width changes are always real. */
      if (isCoarse && w === lastW && Math.abs(h - lastH) < 140) return;
      lastW = w; lastH = h;
      /* Allocate the backing store in DEVICE pixels, not CSS pixels.
         Sizing it at CSS px meant a DPR-3 phone upscaled the whole canvas
         3x and everything looked soft no matter how good the source was.
         Capped at 2 — beyond that the pixel count costs more than it
         visibly gains while scrubbing. Style stays in CSS px so there is
         no scaling mismatch. */
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      paint(cur, true);
    }
    function paint(i, force) {
      /* the scrub fires per rAF; skip redundant redraws of the same frame */
      if (i === cur && !force) return;
      var f = frameset.images[i];
      /* only record it as the current frame once we know we can actually
         draw it — otherwise a frame requested before it finished loading
         would be marked drawn and never repainted when it arrives */
      if (!f || !f.complete || !f.naturalWidth) return;
      cur = i;
      ctx.fillStyle = '#0C0A08';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      var r = Math.max(canvas.width / f.naturalWidth, canvas.height / f.naturalHeight);
      var w = f.naturalWidth * r, h = f.naturalHeight * r;
      ctx.drawImage(f, (canvas.width - w) / 2, (canvas.height - h) * focusY, w, h);
    }
    window.addEventListener('resize', size);
    window.addEventListener('orientationchange', size);
    size();
    return { paint: paint, size: size };
  }

  /* --------------------------------------------------------
     LOADER
     -------------------------------------------------------- */
  var loaderEl = document.getElementById('loader');
  var lbar = document.getElementById('lbar');
  var loaderDone = false;
  function hideLoader() {
    if (loaderDone || !loaderEl) return;
    loaderDone = true;
    loaderEl.style.opacity = '0';
    setTimeout(function () { loaderEl.style.display = 'none'; ScrollTrigger.refresh(); }, 600);
  }
  setTimeout(hideLoader, 8000); /* safety net — never trap the user */

  /* --------------------------------------------------------
     HOME HERO — scroll-scrubbed frame sequence
     -------------------------------------------------------- */
  var heroCanvas = document.getElementById('heroCanvas');
  if (heroCanvas) {
    var total = parseInt(heroCanvas.dataset.frames, 10) || 121;
    var hSrc = pickSource(heroCanvas);
    var fs = new FrameSet(hSrc.dir, total, hSrc.step,
      function (p) { if (lbar) lbar.style.width = Math.round(p * 100) + '%'; },
      hideLoader);
    var painter = makeCanvasPainter(heroCanvas, fs);
    fs.images[0].addEventListener('load', function () { painter.paint(0); });

    gsap.to({ f: 0 }, {
      f: fs.count - 1,
      snap: 'f',
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.3 },
      onUpdate: function () { painter.paint(Math.round(this.targets()[0].f)); }
    });

    gsap.to('.hero-content', {
      opacity: 0, y: -60, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: '10% top', end: '35% top', scrub: true }
    });
  } else {
    hideLoader();
  }

  /* --------------------------------------------------------
     SUBPAGE HERO — gentle drift on a still frame sequence
     -------------------------------------------------------- */
  var pheroCanvas = document.getElementById('pheroCanvas');
  if (pheroCanvas) {
    var ptotal = parseInt(pheroCanvas.dataset.frames, 10) || 121;
    var pSrc = pickSource(pheroCanvas);
    var pfs = new FrameSet(pSrc.dir, ptotal, pSrc.step, null, null);
    var ppaint = makeCanvasPainter(pheroCanvas, pfs);
    pfs.images[0].addEventListener('load', function () { ppaint.paint(0); });
    if (reduce) {
      pfs.images[0].addEventListener('load', function () { ppaint.paint(0); });
    } else {
      gsap.to({ f: 0 }, {
        f: pfs.count - 1, snap: 'f', ease: 'none',
        scrollTrigger: { trigger: '.phero', start: 'top top', end: 'bottom top', scrub: 0.4 },
        onUpdate: function () { ppaint.paint(Math.round(this.targets()[0].f)); }
      });
    }
  }

  /* --------------------------------------------------------
     GENERIC SCRUB SECTION — any canvas[data-scrub] scrubs its
     frame sequence across the height of its .scrub-sec parent.
     Used for the craft beer pour on the story page.
     -------------------------------------------------------- */
  document.querySelectorAll('canvas[data-scrub]').forEach(function (cv) {
    var sec = cv.closest('.scrub-sec');
    if (!sec) return;
    var total = parseInt(cv.dataset.frames, 10) || 121;
    var cSrc = pickSource(cv);
    var sfs = new FrameSet(cSrc.dir, total, cSrc.step, null, null);
    var sp = makeCanvasPainter(cv, sfs);
    sfs.images[0].addEventListener('load', function () { sp.paint(0); });

    gsap.to({ f: 0 }, {
      f: sfs.count - 1, snap: 'f', ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.35 },
      onUpdate: function () { sp.paint(Math.round(this.targets()[0].f)); }
    });

    /* copy rides in, holds, then clears so the pour finishes clean */
    var copy = sec.querySelector('.scrub-content');
    if (copy && !reduce) {
      gsap.fromTo(copy, { opacity: 0, y: 34 }, {
        opacity: 1, y: 0, ease: 'power2.out',
        scrollTrigger: { trigger: sec, start: 'top top', end: '22% top', scrub: true }
      });
      gsap.to(copy, {
        opacity: 0, y: -34, ease: 'power2.in',
        scrollTrigger: { trigger: sec, start: '72% top', end: 'bottom bottom', scrub: true }
      });
    }
  });

  /* --------------------------------------------------------
     TEXT MASK — the letterforms are a WINDOW onto the fire.
     A solid backdrop sits over the canvas with the word
     knocked out of it via an SVG mask, so the live frames show
     through the glyphs only. On scroll the word scales up until
     it swallows the screen, then the backdrop dissolves.
     -------------------------------------------------------- */
  /* The knockout SVG uses a fixed 1600x900 viewBox with preserveAspectRatio
     "slice", so in portrait the scale is driven by HEIGHT and the word's
     width is never constrained by the viewport — on a 390px phone
     "EMIGRATION" rendered ~998px wide, i.e. 600px of it off-screen.
     Measure the real glyph box and set font-size so it always fits. */
  function fitMaskText() {
    var t = document.querySelector('.ko-text');
    if (!t) return;
    t.style.fontSize = '';
    var base = parseFloat(window.getComputedStyle(t).fontSize);
    if (!base) return;
    var scale = Math.max(window.innerWidth / 1600, window.innerHeight / 900);
    var bb;
    try { bb = t.getBBox(); } catch (e) { return; }
    if (!bb || !bb.width) return;
    var rendered = bb.width * scale;
    var target = window.innerWidth * 0.86; /* leave a margin either side */
    if (rendered > target) t.style.fontSize = (base * (target / rendered)) + 'px';
  }
  fitMaskText();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitMaskText); /* webfont changes the metrics */
  }

  var maskSec = document.querySelector('.mask-sec');
  if (maskSec) {
    var mCanvas = document.getElementById('maskCanvas');
    var mfs = null, mpaint = null;
    if (mCanvas) {
      var mtotal = parseInt(mCanvas.dataset.frames, 10) || 121;
      var mSrc = pickSource(mCanvas);
      mfs = new FrameSet(mSrc.dir, mtotal, mSrc.step, null, null);
      mpaint = makeCanvasPainter(mCanvas, mfs);
      mfs.images[0].addEventListener('load', function () { mpaint.paint(0); });
    }

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: maskSec,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.45
      }
    });

    /* fire keeps moving behind the letters the whole way */
    if (mfs && mpaint) {
      tl.to({ f: 0 }, {
        f: mfs.count - 1, snap: 'f', ease: 'none', duration: 1,
        onUpdate: function () { mpaint.paint(Math.round(this.targets()[0].f)); }
      }, 0);
    }

    /* letters breathe in, then swell through the viewport */
    tl.fromTo('.ko-text',
      { scale: 0.82, letterSpacing: '0.18em', opacity: 0 },
      { scale: 1, letterSpacing: '0.02em', opacity: 1, ease: 'power2.out', duration: 0.22 }, 0);
    tl.to('.ko-text', { scale: 1.06, ease: 'none', duration: 0.36 }, 0.22);
    /* scaling a live SVG mask is GPU-heavy; a smaller final swell still
       clears the frame on a phone and costs far less to composite */
    tl.to('.ko-text', { scale: isCoarse ? 9 : 13, ease: 'power2.in', duration: 0.42 }, 0.58);
    /* backdrop dissolves as the glyphs engulf the frame */
    tl.to('.knockout', { opacity: 0, ease: 'power1.in', duration: 0.22 }, 0.78);
    /* caption rides in mid-section and clears before the swell */
    tl.fromTo('.mask-sub', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.16 }, 0.3);
    tl.to('.mask-sub', { opacity: 0, y: -22, duration: 0.14 }, 0.6);
  }

  /* --------------------------------------------------------
     KINETIC MARQUEE — scroll velocity feeds the speed
     -------------------------------------------------------- */
  var track = document.getElementById('mtrack');
  if (track) {
    var content = track.querySelector('.marquee-content');
    for (var c = 0; c < 3; c++) track.appendChild(content.cloneNode(true));
    var x = 0, vel = 0, base = 40, w = content.offsetWidth;
    ScrollTrigger.create({ onUpdate: function (self) { vel = self.getVelocity() / 180; } });
    function measure() { w = content.offsetWidth; }
    window.addEventListener('load', measure);
    window.addEventListener('resize', measure);
    (function tick() {
      vel *= 0.92;
      x -= (base + Math.abs(vel)) / 60;
      if (w && x <= -w) x += w;
      track.style.transform = 'translateX(' + x + 'px)';
      requestAnimationFrame(tick);
    })();
  }

  /* --------------------------------------------------------
     ODOMETER — separators stay put, digits roll
     -------------------------------------------------------- */
  document.querySelectorAll('.odometer').forEach(function (odo) {
    var val = odo.dataset.value, suffix = odo.dataset.suffix || '';
    var targets = [];
    val.split('').forEach(function (ch) {
      if (ch >= '0' && ch <= '9') targets.push(parseInt(ch, 10));
    });
    odo.innerHTML = '';

    /* one layer is the unfilled glass, the other the beer; identical
       markup so the digits roll in lockstep behind the clip */
    function buildLayer(cls) {
      var layer = document.createElement('div');
      layer.className = 'odo-layer ' + cls;
      layer.setAttribute('aria-hidden', cls === 'odo-full' ? 'true' : 'false');
      val.split('').forEach(function (ch) {
        if (ch < '0' || ch > '9') {
          var sep = document.createElement('span');
          sep.className = 'odo-sep'; sep.textContent = ch; layer.appendChild(sep); return;
        }
        var digit = document.createElement('div'); digit.className = 'odo-digit';
        var strip = document.createElement('div'); strip.className = 'odo-strip';
        for (var n = 0; n <= 9; n++) { var s = document.createElement('span'); s.textContent = n; strip.appendChild(s); }
        digit.appendChild(strip); layer.appendChild(digit);
      });
      if (suffix) {
        var sf = document.createElement('span');
        sf.className = 'stat-suffix'; sf.textContent = suffix; layer.appendChild(sf);
      }
      return layer;
    }

    var empty = buildLayer('odo-empty');
    var full = buildLayer('odo-full');
    var foam = document.createElement('i');
    foam.className = 'odo-foam';
    odo.appendChild(empty); odo.appendChild(full); odo.appendChild(foam);

    ScrollTrigger.create({
      trigger: odo, start: 'top 88%', once: true, onEnter: function () {
        [empty, full].forEach(function (layer) {
          layer.querySelectorAll('.odo-strip').forEach(function (strip, i) {
            var h = strip.children[0].offsetHeight;
            strip.style.transitionDelay = (i * 0.12) + 's';
            strip.style.transform = 'translateY(-' + (targets[i] * h) + 'px)';
          });
        });
        /* pour the glass — a class flip, since GSAP would not reliably
           tween the custom property but @property + transition does */
        odo.classList.add('poured');
      }
    });
  });

  /* --------------------------------------------------------
     SPOTLIGHT BORDER + 3D TILT
     -------------------------------------------------------- */
  document.querySelectorAll('.spot-grid').forEach(function (grid) {
    if (isCoarse) return;
    grid.addEventListener('mousemove', function (e) {
      grid.querySelectorAll('.spot-card').forEach(function (cd) {
        var r = cd.getBoundingClientRect();
        cd.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        cd.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    grid.querySelectorAll('.spot-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(700px) rotateY(' + (px * 7) + 'deg) rotateX(' + (-py * 7) + 'deg) scale(1.02)';
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
  });

  /* --------------------------------------------------------
     ACCORDION
     -------------------------------------------------------- */
  document.querySelectorAll('.acc').forEach(function (acc) {
    var panels = acc.querySelectorAll('.acc-panel');
    function activate(p) {
      panels.forEach(function (o) { o.classList.remove('active'); });
      p.classList.add('active');
    }
    panels.forEach(function (p) {
      if (!isCoarse) p.addEventListener('mouseenter', function () { activate(p); });
      p.addEventListener('click', function () { activate(p); });
    });
  });

  /* --------------------------------------------------------
     MENU TABS
     -------------------------------------------------------- */
  document.querySelectorAll('.tabs').forEach(function (bar) {
    var tabs = bar.querySelectorAll('.tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var id = tab.dataset.panel;
        tabs.forEach(function (t) {
          t.classList.toggle('on', t === tab);
          t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
        });
        document.querySelectorAll('.tabpanel').forEach(function (p) {
          p.classList.toggle('on', p.id === id);
        });
        ScrollTrigger.refresh();
      });
    });
  });


  /* deep-link: /menu.html#brunch (or #drinks, #coffee) opens that tab, so the
     brunch landing page can point at the full list without duplicating it */
  function openTabFromHash() {
    var h = (location.hash || '').replace('#', '');
    if (!h) return;
    var tab = document.querySelector('.tab[data-panel="p-' + h + '"]');
    if (tab) { tab.click(); tab.scrollIntoView({ block: 'center' }); }
  }
  openTabFromHash();
  window.addEventListener('hashchange', openTabFromHash);

  /* --------------------------------------------------------
     CURSOR GLOW
     -------------------------------------------------------- */
  var glow = document.getElementById('glow');
  if (glow) {
    if (isCoarse) { glow.style.display = 'none'; }
    else {
      var mx = window.innerWidth / 2, my = window.innerHeight / 2, gx = mx, gy = my;
      document.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; });
      (function loop() {
        gx += (mx - gx) * 0.12; gy += (my - gy) * 0.12;
        glow.style.transform = 'translate(' + (gx - 250) + 'px,' + (gy - 250) + 'px)';
        requestAnimationFrame(loop);
      })();
    }
  }

  /* --------------------------------------------------------
     MAGNETIC BUTTONS (pointer only)
     -------------------------------------------------------- */
  if (!isCoarse) {
    document.querySelectorAll('.magnetic').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        btn.style.transform = 'translate(' + ((e.clientX - cx) * 0.22) + 'px,' + ((e.clientY - cy) * 0.32) + 'px)';
      });
      btn.addEventListener('mouseleave', function () { btn.style.transform = 'translate(0,0)'; });
    });
  }

  /* --------------------------------------------------------
     NAV — solid on scroll, slide-out drawer on mobile
     -------------------------------------------------------- */
  var nav = document.getElementById('nav');
  function navState() { if (nav) nav.classList.toggle('solid', window.scrollY > 70); }
  window.addEventListener('scroll', navState, { passive: true });
  navState();

  /* ---- mobile menu (standalone component, sibling of <nav>) ---- */
  var burger = document.getElementById('burger');
  var mnav = document.getElementById('mnav');

  function openMenu() {
    if (!mnav) return;
    mnav.classList.add('is-open');
    document.body.classList.add('mnav-open');
    if (burger) burger.setAttribute('aria-expanded', 'true');
    var first = mnav.querySelector('.mnav-links a');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }
  function closeMenu() {
    if (!mnav) return;
    mnav.classList.remove('is-open');
    document.body.classList.remove('mnav-open');
    if (burger) {
      burger.setAttribute('aria-expanded', 'false');
      burger.focus();
    }
  }
  if (burger && mnav) {
    burger.setAttribute('aria-expanded', 'false');
    burger.addEventListener('click', function (e) {
      e.preventDefault();
      mnav.classList.contains('is-open') ? closeMenu() : openMenu();
    });
    /* scrim, the X, and any link all dismiss it */
    mnav.querySelectorAll('[data-close]').forEach(function (el) {
      el.addEventListener('click', closeMenu);
    });
    mnav.querySelectorAll('a[href]').forEach(function (a) {
      a.addEventListener('click', function () { closeMenu(); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mnav.classList.contains('is-open')) closeMenu();
    });
    /* if the viewport grows past the breakpoint while open, drop it */
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900 && mnav.classList.contains('is-open')) closeMenu();
    });
  }

  /* mark the current page in both the desktop bar and the mobile menu */
  var here = location.pathname.split('/').pop() || 'index.html';
  if (here === '') here = 'index.html';
  document.querySelectorAll('.navlinks a[href], .mnav-links a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href && href.split('/').pop() === here) a.setAttribute('aria-current', 'page');
  });

  /* --------------------------------------------------------
     FADE UPS
     -------------------------------------------------------- */
  gsap.utils.toArray('.fade-up').forEach(function (el) {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.85, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  /* --------------------------------------------------------
     Late-loading images shift the page — remeasure or every
     scroll trigger fires at the wrong position.
     -------------------------------------------------------- */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
  /* Same guard as the canvas: on touch devices the URL bar showing/hiding
     fires resize mid-scroll. Refreshing ScrollTrigger there recalculates
     every trigger and visibly jerks the scrub, so only refresh when the
     width actually changed (or on a real orientation change). */
  var rt, lastVW = window.innerWidth;
  function onResize() {
    if (isCoarse && window.innerWidth === lastVW) return;
    lastVW = window.innerWidth;
    clearTimeout(rt);
    rt = setTimeout(function () { fitMaskText(); ScrollTrigger.refresh(); }, 250);
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', function () {
    lastVW = -1; onResize();
  });

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();
})();
