/**
 * Hero — picture + copy, with optional scroll-scrubbed video (12fps).
 *
 * Undecorated shape:
 *   Row 1 (2 cols): [ picture + optional mp4 link ] | [ eyebrow, h1, sub, loc, CTAs ]
 *   Row 2 optional: [ empty ] | [ knockout word, caption ] (scrub heroes only)
 *
 * Scrub is enabled only when an mp4/webm/mov link is present. The authored
 * <picture> stays as a DOM overlay — never flattened into video[poster].
 */

const FPS = 12;

function isVideoHref(href) {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(href || '');
}

function isLinkOnlyParagraph(p) {
  const clone = p.cloneNode(true);
  clone.querySelectorAll('a').forEach((a) => a.remove());
  return !clone.textContent.trim();
}

function contentCell(row) {
  return [...row.children].find((c) => c.textContent.trim())
    || row.querySelector(':scope > div')
    || row;
}

function coverDraw(ctx, source, canvas, focusY = 0.5) {
  const sw = source.videoWidth || source.naturalWidth;
  const sh = source.videoHeight || source.naturalHeight;
  if (!sw || !sh) return;
  ctx.fillStyle = '#0C0A08';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const r = Math.max(canvas.width / sw, canvas.height / sh);
  const w = sw * r;
  const h = sh * r;
  ctx.drawImage(source, (canvas.width - w) / 2, (canvas.height - h) * focusY, w, h);
}

function sizeCanvas(canvas) {
  const box = canvas.parentElement;
  const w = box?.clientWidth || window.innerWidth;
  const h = box?.clientHeight || window.innerHeight;
  if (!w || !h) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}

function sectionProgress(section) {
  const total = section.offsetHeight - window.innerHeight;
  if (total <= 0) return 0;
  const top = section.getBoundingClientRect().top;
  return Math.min(1, Math.max(0, -top / total));
}

function parseHeroRow(row) {
  const picture = row.querySelector('picture');
  const img = !picture ? row.querySelector('img') : null;

  let videoUrl = '';
  row.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (!isVideoHref(href) && !isVideoHref(a.href)) return;
    videoUrl = href || a.href;
    const wrap = a.closest('p') || a.closest('.button-container') || a;
    wrap.remove();
  });

  const cell = [...row.children].find((c) => c.querySelector('h1, h2'))
    || contentCell(row);

  const heading = cell.querySelector('h1, h2');
  let eyebrow = cell.querySelector('.eyebrow');
  if (!eyebrow && heading) {
    const prev = heading.previousElementSibling;
    if (prev?.tagName === 'P' && !prev.querySelector('a, picture, img')) eyebrow = prev;
  }

  const ctaLinks = [];
  const textParas = [];

  [...cell.querySelectorAll(':scope > p')].forEach((p) => {
    if (p === eyebrow || p.classList.contains('eyebrow') || p.classList.contains('button-container')) return;
    if (p.querySelector('picture, img')) return;
    if (isLinkOnlyParagraph(p)) {
      p.querySelectorAll('a[href]').forEach((a) => {
        if (a.textContent.trim()) ctaLinks.push(a);
      });
      return;
    }
    textParas.push(p);
  });

  cell.querySelectorAll('.button-container a[href]').forEach((a) => {
    if (a.textContent.trim() && !ctaLinks.includes(a)) ctaLinks.push(a);
  });

  return {
    picture,
    img,
    videoUrl,
    eyebrow,
    heading,
    sub: textParas[0] || null,
    loc: textParas[1] || null,
    links: ctaLinks,
  };
}

/**
 * Promote the authored <picture> (or lone img) as the cover overlay.
 * Preserves every <source>; never copies a URL onto video.poster.
 */
function preparePictureOverlay(pictureOrImg) {
  if (!pictureOrImg) return null;

  let overlay = pictureOrImg;
  if (overlay.parentElement?.tagName === 'P' && overlay.parentElement.childElementCount === 1) {
    overlay.parentElement.replaceWith(overlay);
  }

  overlay.classList.add('hero-picture');
  return overlay;
}

/**
 * Authored EDS images are loading=lazy. During block decorate the section is
 * still display:none, so the browser never starts that lazy fetch. Moving the
 * node alone does not restart it — force eager and re-assign src.
 */
function forceEagerImageLoad(overlay) {
  if (!overlay) return null;
  const image = overlay.tagName === 'IMG' ? overlay : overlay.querySelector('img');
  if (!image) return null;

  image.loading = 'eager';
  image.setAttribute('loading', 'eager');

  const src = image.getAttribute('src');
  const srcset = image.getAttribute('srcset');
  if (srcset) {
    image.removeAttribute('srcset');
    image.setAttribute('srcset', srcset);
  }
  if (src) {
    image.removeAttribute('src');
    image.setAttribute('src', src);
  }
  return image;
}

function whenPictureReady(overlay) {
  if (!overlay) return Promise.resolve();
  const image = forceEagerImageLoad(overlay);
  if (!image) return Promise.resolve();
  if (image.complete && image.naturalWidth > 0) return Promise.resolve();

  return new Promise((resolve) => {
    const done = () => resolve();
    const timer = setTimeout(done, 5000);
    image.addEventListener('load', () => { clearTimeout(timer); done(); }, { once: true });
    image.addEventListener('error', () => { clearTimeout(timer); done(); }, { once: true });
  });
}

function parseMaskRow(row) {
  if (!row) return null;
  const cell = contentCell(row);
  const paras = [...cell.querySelectorAll('p')].map((p) => p.textContent.trim()).filter(Boolean);
  if (!paras.length) {
    const lines = (cell.textContent || '').split(/\n+/).map((s) => s.trim()).filter(Boolean);
    return lines.length ? { word: lines[0], caption: lines.slice(1).join(' ') } : null;
  }
  return { word: paras[0], caption: paras.slice(1).join(' ') };
}

function buildHeroContent(parsed, { scrub }) {
  const content = document.createElement('div');
  content.className = 'hero-content';

  if (parsed.eyebrow) {
    const el = document.createElement('div');
    el.className = 'hero-eyebrow';
    el.textContent = parsed.eyebrow.textContent.trim();
    content.append(el);
  }

  if (parsed.heading) content.append(parsed.heading);

  if (parsed.sub) {
    const el = document.createElement('div');
    el.className = 'hero-sub';
    el.textContent = parsed.sub.textContent.trim();
    content.append(el);
  }

  if (parsed.loc) {
    const el = document.createElement('div');
    el.className = 'hero-loc';
    el.textContent = parsed.loc.textContent.trim();
    content.append(el);
  }

  if (parsed.links.length) {
    const row = document.createElement('div');
    row.className = 'hero-cta-row';
    parsed.links.forEach((a, i) => {
      const btn = document.createElement('a');
      btn.href = a.href;
      btn.className = i === 0 ? 'button' : 'button secondary hero-btn-over';
      btn.textContent = a.textContent.trim();
      if (a.target) btn.target = a.target;
      if (a.rel || a.target === '_blank') btn.rel = a.rel || 'noopener';
      row.append(btn);
    });
    content.append(row);
  }

  if (scrub) {
    const hint = document.createElement('div');
    hint.className = 'hero-scroll-hint';
    hint.innerHTML = 'Scroll <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';
    content.append(hint);
  }

  return content;
}

function buildMaskStage(mask, uid) {
  const section = document.createElement('div');
  section.className = 'hero-mask';

  const sticky = document.createElement('div');
  sticky.className = 'hero-mask-sticky';

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-mask-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'hero-knockout');
  svg.setAttribute('viewBox', '0 0 1600 900');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('aria-hidden', 'true');
  const safeWord = mask.word.replace(/[<>&"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]
  ));
  svg.innerHTML = `
    <defs>
      <mask id="${uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900">
        <rect x="0" y="0" width="1600" height="900" fill="#ffffff"/>
        <text class="hero-ko-text" x="800" y="450" text-anchor="middle" dominant-baseline="central" fill="#000000">${safeWord}</text>
      </mask>
    </defs>
    <rect x="0" y="0" width="1600" height="900" fill="#0C0A08" mask="url(#${uid})"/>
  `;

  sticky.append(canvas, svg);

  if (mask.caption) {
    const sub = document.createElement('div');
    sub.className = 'hero-mask-sub';
    const p = document.createElement('p');
    p.textContent = mask.caption;
    sub.append(p);
    sticky.append(sub);
  }

  section.append(sticky);
  return { section, canvas, svg };
}

function fitMaskText(svg) {
  const t = svg.querySelector('.hero-ko-text');
  if (!t) return;
  t.style.fontSize = '';
  const base = parseFloat(window.getComputedStyle(t).fontSize);
  if (!base) return;
  const scale = Math.max(window.innerWidth / 1600, window.innerHeight / 900);
  let bb;
  try {
    bb = t.getBBox();
  } catch (e) {
    return;
  }
  if (!bb?.width) return;
  const rendered = bb.width * scale;
  const target = window.innerWidth * 0.86;
  if (rendered > target) t.style.fontSize = `${base * (target / rendered)}px`;
}

function applyMaskProgress(section, progress, coarse) {
  const text = section.querySelector('.hero-ko-text');
  const knockout = section.querySelector('.hero-knockout');
  const sub = section.querySelector('.hero-mask-sub');
  if (!text || !knockout) return;

  const p = progress;
  let scale = 0.82;
  let tracking = 0.18;
  let opacity = 0;
  let koOpacity = 1;
  let subOpacity = 0;
  let subY = 22;

  if (p < 0.22) {
    const t = p / 0.22;
    scale = 0.82 + 0.18 * t;
    tracking = 0.18 - 0.16 * t;
    opacity = t;
  } else if (p < 0.58) {
    const t = (p - 0.22) / 0.36;
    scale = 1 + 0.06 * Math.min(t, 1);
    tracking = 0.02;
    opacity = 1;
    if (p >= 0.3 && p < 0.46) {
      const s = (p - 0.3) / 0.16;
      subOpacity = s;
      subY = 22 * (1 - s);
    } else if (p >= 0.46) {
      subOpacity = 1;
      subY = 0;
    }
  } else {
    tracking = 0.02;
    opacity = 1;
    const swell = coarse ? 9 : 13;
    const t = Math.min(Math.max((p - 0.58) / 0.42, 0), 1);
    scale = 1.06 + (swell - 1.06) * t;
    if (p >= 0.6 && p < 0.74) {
      const s = (p - 0.6) / 0.14;
      subOpacity = 1 - s;
      subY = -22 * s;
    }
    if (p >= 0.78) koOpacity = 1 - Math.min((p - 0.78) / 0.22, 1);
  }

  text.style.transform = `scale(${scale})`;
  text.style.letterSpacing = `${tracking}em`;
  text.style.opacity = String(opacity);
  knockout.style.opacity = String(koOpacity);
  if (sub) {
    sub.style.opacity = String(subOpacity);
    sub.style.transform = `translateY(${subY}px)`;
  }
}

function createVideoScrubber(video, canvases) {
  let ready = false;
  let seeking = false;
  let pending = null;
  let lastFrame = -1;

  const paintAll = () => {
    canvases.forEach(({ canvas, ctx, focusY }) => {
      if (!canvas.width) sizeCanvas(canvas);
      coverDraw(ctx, video, canvas, focusY);
    });
  };

  const seekFrame = (frameIndex) => {
    if (!ready || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const maxFrame = Math.max(0, Math.floor(video.duration * FPS) - 1);
    const frame = Math.min(maxFrame, Math.max(0, frameIndex));
    if (frame === lastFrame && !seeking) return;
    const time = Math.min(frame / FPS, Math.max(video.duration - 0.001, 0));

    if (seeking) {
      pending = { frame, time };
      return;
    }
    if (Math.abs(video.currentTime - time) < 1 / (FPS * 2)) {
      lastFrame = frame;
      paintAll();
      return;
    }
    seeking = true;
    lastFrame = frame;
    video.currentTime = time;
  };

  video.addEventListener('seeked', () => {
    seeking = false;
    paintAll();
    if (pending) {
      const next = pending;
      pending = null;
      lastFrame = next.frame;
      seeking = true;
      video.currentTime = next.time;
    }
  });

  return {
    setReady() {
      ready = true;
      seekFrame(0);
    },
    seekProgress(progress) {
      if (!ready || !video.duration) return;
      const maxFrame = Math.max(0, Math.floor(video.duration * FPS) - 1);
      seekFrame(Math.round(progress * maxFrame));
    },
    paintAll,
    resize() {
      canvases.forEach(({ canvas }) => sizeCanvas(canvas));
      if (ready) paintAll();
    },
  };
}

/**
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const heroRow = rows[0];
  const maskRow = rows[1];
  if (!heroRow) return;

  const parsed = parseHeroRow(heroRow);
  const scrub = Boolean(parsed.videoUrl);
  const mask = scrub ? parseMaskRow(maskRow) : null;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  if (scrub) block.classList.add('has-scrub');

  const heroSection = document.createElement('div');
  heroSection.className = 'hero-stage';
  const sticky = document.createElement('div');
  sticky.className = 'hero-sticky';

  const media = document.createElement('div');
  media.className = 'hero-media';

  const pictureOverlay = preparePictureOverlay(parsed.picture || parsed.img);
  if (pictureOverlay) media.append(pictureOverlay);

  let canvas = null;
  let video = null;
  if (scrub) {
    canvas = document.createElement('canvas');
    canvas.className = 'hero-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    media.append(canvas);

    video = document.createElement('video');
    video.className = 'hero-video';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'none';
    video.loading = 'lazy';
    video.removeAttribute('poster');
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.setAttribute('loading', 'lazy');
    video.tabIndex = -1;
    video.setAttribute('aria-hidden', 'true');
    media.append(video);
  }

  sticky.append(media, buildHeroContent(parsed, { scrub }));
  heroSection.append(sticky);

  const parts = [heroSection];
  let maskStage = null;
  if (mask?.word) {
    const uid = `hero-ko-${Math.random().toString(36).slice(2, 9)}`;
    maskStage = buildMaskStage(mask, uid);
    parts.push(maskStage.section);
  }

  block.replaceChildren(...parts);

  const picture = block.querySelector('.hero-picture');
  forceEagerImageLoad(picture);

  if (!scrub) {
    block.classList.add('is-ready');
    return;
  }

  const canvases = [
    { canvas, ctx: canvas.getContext('2d', { alpha: false }), focusY: 0.5 },
  ];
  if (maskStage) {
    canvases.push({
      canvas: maskStage.canvas,
      ctx: maskStage.canvas.getContext('2d', { alpha: false }),
      focusY: 0.5,
    });
  }

  const scrubber = createVideoScrubber(video, canvases);
  sizeCanvas(canvas);
  if (maskStage) {
    sizeCanvas(maskStage.canvas);
    fitMaskText(maskStage.svg);
    if (document.fonts?.ready) document.fonts.ready.then(() => fitMaskText(maskStage.svg));
  }

  const content = block.querySelector('.hero-content');

  const onScroll = () => {
    const heroP = sectionProgress(heroSection);
    if (content) {
      const fade = Math.min(1, Math.max(0, (heroP - 0.1) / 0.25));
      content.style.opacity = String(1 - fade);
      content.style.transform = `translateY(${-60 * fade}px)`;
    }

    if (maskStage) {
      const maskP = sectionProgress(maskStage.section);
      const maskTop = maskStage.section.getBoundingClientRect().top;
      if (!reduce) {
        if (maskTop < window.innerHeight * 0.55) scrubber.seekProgress(maskP);
        else scrubber.seekProgress(heroP);
      }
      applyMaskProgress(maskStage.section, maskP, coarse);
    } else if (!reduce) {
      scrubber.seekProgress(heroP);
    }
  };

  const revealVideo = () => {
    if (block.classList.contains('is-ready')) return;
    scrubber.setReady();
    requestAnimationFrame(() => {
      block.classList.add('is-ready');
      if (picture) picture.classList.add('is-hidden');
      onScroll();
    });
  };

  const startVideoLoad = () => {
    if (reduce) {
      block.classList.add('is-ready');
      return;
    }
    video.preload = 'auto';
    video.src = parsed.videoUrl;
    video.addEventListener('canplaythrough', revealVideo, { once: true });
    video.load();
  };

  whenPictureReady(picture).then(startVideoLoad);

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    scrubber.resize();
    if (maskStage) fitMaskText(maskStage.svg);
    onScroll();
  });
  onScroll();
}
