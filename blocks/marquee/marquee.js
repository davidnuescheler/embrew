/**
 * Marquee block
 * Undecorated: one cell of items separated by " - "
 * Decorated: looping kinetic track with alternating highlights
 */

function parseItems(text) {
  return text
    .split(/\s*[-–—]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildContent(items) {
  const content = document.createElement('div');
  content.className = 'marquee-content';

  items.forEach((item, i) => {
    const span = document.createElement('span');
    if (i % 2 === 0) span.className = 'hl';
    span.textContent = item;
    content.append(span);

    const dot = document.createElement('i');
    content.append(dot);
  });

  return content;
}

function startMarquee(track, content) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  for (let c = 0; c < 3; c += 1) {
    track.append(content.cloneNode(true));
  }

  let x = 0;
  let vel = 0;
  const base = 40;
  let w = content.offsetWidth;
  let lastScrollY = window.scrollY;
  let lastTs = performance.now();

  const measure = () => {
    w = content.offsetWidth;
  };
  window.addEventListener('load', measure);
  window.addEventListener('resize', measure);

  window.addEventListener(
    'scroll',
    () => {
      const now = performance.now();
      const dt = Math.max(now - lastTs, 1);
      const dy = window.scrollY - lastScrollY;
      vel = (dy / dt) * (1000 / 180);
      lastScrollY = window.scrollY;
      lastTs = now;
    },
    { passive: true },
  );

  const tick = () => {
    vel *= 0.92;
    x -= (base + Math.abs(vel)) / 60;
    if (w && x <= -w) x += w;
    track.style.transform = `translateX(${x}px)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const cell = block.querySelector(':scope > div > div') || block;
  const items = parseItems(cell.textContent || '');
  if (!items.length) return;

  const track = document.createElement('div');
  track.className = 'marquee-track';
  const content = buildContent(items);
  track.append(content);

  block.replaceChildren(track);
  startMarquee(track, content);
}
