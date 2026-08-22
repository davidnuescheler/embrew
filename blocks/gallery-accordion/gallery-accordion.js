/**
 * Gallery accordion — expanding image panels from v2 `.acc`.
 * Rows: image | eyebrow + heading + body + optional price
 */

function isCoarsePointer() {
  return window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

function buildPanel(row, index) {
  const cols = [...row.children];
  const mediaCol = cols.find((c) => c.querySelector('picture, img')) || cols[0];
  const copyCol = cols.find((c) => c !== mediaCol) || cols[1];

  const panel = document.createElement('div');
  panel.className = 'acc-panel';
  if (index === 0) panel.classList.add('active');
  panel.setAttribute('role', 'button');
  panel.setAttribute('tabindex', '0');

  const picture = mediaCol?.querySelector('picture');
  const img = mediaCol?.querySelector('img');
  if (picture) panel.append(picture);
  else if (img) panel.append(img);

  const eyebrow = copyCol?.querySelector('.eyebrow, p.eyebrow');
  const heading = copyCol?.querySelector('h1, h2, h3, h4, h5, h6');
  const paras = [...(copyCol?.querySelectorAll(':scope > p') || [])].filter(
    (p) => !p.classList.contains('eyebrow') && !p.classList.contains('button-container'),
  );

  const labelText = (eyebrow?.textContent || heading?.textContent || '').trim();
  if (labelText) {
    const vlabel = document.createElement('div');
    vlabel.className = 'vlabel';
    vlabel.textContent = labelText;
    panel.append(vlabel);
  }

  const body = document.createElement('div');
  body.className = 'acc-body';

  if (heading) body.append(heading);

  let priceEl = null;
  if (paras.length > 1) priceEl = paras.pop();
  paras.forEach((p) => body.append(p));

  if (priceEl) {
    const pr = document.createElement('div');
    pr.className = 'pr';
    pr.textContent = priceEl.textContent.trim();
    body.append(pr);
  }

  panel.append(body);
  return panel;
}

function wireAccordion(acc) {
  const panels = [...acc.querySelectorAll('.acc-panel')];
  const coarse = isCoarsePointer();

  const activate = (panel) => {
    panels.forEach((p) => {
      p.classList.toggle('active', p === panel);
      p.setAttribute('aria-expanded', p === panel ? 'true' : 'false');
    });
  };

  panels.forEach((panel) => {
    panel.setAttribute('aria-expanded', panel.classList.contains('active') ? 'true' : 'false');
    if (!coarse) {
      panel.addEventListener('mouseenter', () => activate(panel));
    }
    panel.addEventListener('click', () => activate(panel));
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate(panel);
      }
    });
  });
}

/**
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const acc = document.createElement('div');
  acc.className = 'acc';

  rows.forEach((row, i) => {
    acc.append(buildPanel(row, i));
  });

  block.replaceChildren(acc);
  wireAccordion(acc);
}
