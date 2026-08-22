/**
 * Gallery — dense mosaic grid, edge-to-edge rows.
 *
 * Each cell: caption + picture. Spans use a 6-col track (2 or 4 only)
 * so every row stays flush left/right; images cover their cells.
 */

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function parseCell(cell) {
  const picture = cell.querySelector('picture');
  const img = cell.querySelector('img');
  if (!picture && !img) return null;

  const clone = cell.cloneNode(true);
  clone.querySelectorAll('picture, img').forEach((el) => el.remove());
  const caption = clone.textContent.replace(/\s+/g, ' ').trim()
    || img?.alt?.trim()
    || '';

  const w = Number(img?.getAttribute('width')) || img?.naturalWidth || 4;
  const h = Number(img?.getAttribute('height')) || img?.naturalHeight || 3;

  return { picture, img, caption, w, h };
}

function pickFeatured(items) {
  const target = Math.max(1, Math.round(items.length / 3));
  const ranked = items
    .map((item, index) => ({
      index,
      score: hashString(`${item.caption}|${item.img?.src || ''}|${index}`),
    }))
    .sort((a, b) => a.score - b.score);

  const featured = new Set();
  ranked.forEach(({ index }, i) => {
    if (featured.size >= target) return;
    if (featured.has(index - 1) || featured.has(index + 1)) {
      if (i < ranked.length - 2) return;
    }
    featured.add(index);
  });
  return featured;
}

function buildFigure(item, featured) {
  const figure = document.createElement('figure');
  figure.className = 'gallery-item';

  const ar = item.w / item.h;
  const portrait = ar <= 0.9;
  const landscape = ar >= 1.2;

  if (featured) figure.classList.add('is-featured');
  if (portrait) figure.classList.add('is-portrait');
  if (landscape) figure.classList.add('is-landscape');

  // Wide = 4/6 cols; tall = 2 rows. Only 2|4 col spans so rows fill flush.
  if (featured && landscape) figure.classList.add('is-wide');
  if (portrait || (featured && !landscape)) figure.classList.add('is-tall');

  const media = document.createElement('div');
  media.className = 'gallery-media';
  if (item.picture) media.append(item.picture);
  else if (item.img) media.append(item.img);
  figure.append(media);

  if (item.caption) {
    const cap = document.createElement('figcaption');
    cap.textContent = item.caption;
    figure.append(cap);
  }

  return figure;
}

function wireReveal(mosaic) {
  const items = [...mosaic.querySelectorAll('.gallery-item')];
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  items.forEach((el, i) => {
    el.style.setProperty('--delay', `${(i % 6) * 55}ms`);
    io.observe(el);
  });
}

/**
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const items = [];
  [...block.children].forEach((row) => {
    [...row.children].forEach((cell) => {
      const parsed = parseCell(cell);
      if (parsed) items.push(parsed);
    });
  });

  const featured = pickFeatured(items);
  const mosaic = document.createElement('div');
  mosaic.className = 'gallery-mosaic';

  items.forEach((item, index) => {
    mosaic.append(buildFigure(item, featured.has(index)));
  });

  block.replaceChildren(mosaic);
  wireReveal(mosaic);
}
