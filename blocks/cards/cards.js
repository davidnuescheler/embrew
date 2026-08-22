/**
 * Cards block — v2 spotlight cards.
 * Rows: [ optional tag text + picture ] | [ heading, body, price or link ]
 * A card with a link becomes fully clickable (stretched first href).
 */

function isCoarsePointer() {
  return window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

function buildMedia(col) {
  const media = document.createElement('div');
  media.className = 'cards-card-image';

  const picture = col.querySelector('picture');
  const img = col.querySelector('img');

  // Text ahead of the image becomes a tag pill (e.g. "Signature").
  const clone = col.cloneNode(true);
  clone.querySelectorAll('picture, img').forEach((el) => el.remove());
  const tagText = clone.textContent.replace(/\s+/g, ' ').trim();
  if (tagText) {
    const tag = document.createElement('span');
    tag.className = 'cards-tag';
    tag.textContent = tagText;
    media.append(tag);
  }

  if (picture) media.append(picture);
  else if (img) media.append(img);

  return media;
}

function isLinkOnlyParagraph(p) {
  const link = p.querySelector('a[href]');
  if (!link) return false;
  if (p.classList.contains('button-container')) return true;
  const leftover = p.cloneNode(true);
  leftover.querySelectorAll('a').forEach((a) => a.remove());
  return !leftover.textContent.trim();
}

function buildBody(col) {
  const body = document.createElement('div');
  body.className = 'cards-card-body';

  const heading = col.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) body.append(heading);

  const paras = [...col.querySelectorAll(':scope > p')];
  let priceEl = null;
  if (paras.length > 1) priceEl = paras.pop();
  paras.forEach((p) => body.append(p));

  if (priceEl) {
    const price = document.createElement('div');
    price.className = 'cards-price';
    const link = priceEl.querySelector('a[href]');
    if (link && isLinkOnlyParagraph(priceEl)) {
      link.classList.remove('button', 'primary', 'secondary', 'accent');
      price.append(link);
    } else {
      price.textContent = priceEl.textContent.trim();
    }
    body.append(price);
  }

  return body;
}

function wireCardLink(card, fallback) {
  let link = card.querySelector('a[href]');
  if (!link && fallback?.href) {
    link = document.createElement('a');
    link.href = fallback.href;
    if (fallback.target) link.target = fallback.target;
    const label = card.querySelector('h1, h2, h3, h4, h5, h6');
    link.setAttribute('aria-label', label?.textContent.trim() || 'Open');
    card.append(link);
  }
  if (!link) return;
  card.classList.add('cards-card-linked');
  link.classList.add('cards-card-link');
}

function wireTilt(list) {
  if (isCoarsePointer()) return;

  list.addEventListener('mousemove', (e) => {
    list.querySelectorAll('.cards-card').forEach((card) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  list.querySelectorAll('.cards-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(700px) rotateY(${px * 7}deg) rotateX(${-py * 7}deg) scale(1.02)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

/**
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const cols = [...row.children];
    const mediaCol = cols.find((c) => c.querySelector('picture, img')) || cols[0];
    const bodyCol = cols.find((c) => c !== mediaCol) || cols[1];

    const fallbackLink = bodyCol?.querySelector('a[href]') || mediaCol?.querySelector('a[href]');
    const li = document.createElement('li');
    li.className = 'cards-card';
    if (mediaCol) li.append(buildMedia(mediaCol));
    if (bodyCol) li.append(buildBody(bodyCol));
    wireCardLink(li, fallbackLink);
    ul.append(li);
  });

  block.replaceChildren(ul);
  wireTilt(ul);
}
