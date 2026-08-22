/**
 * Figures block — stat cards with beer-fill odometer animation.
 * Each cell: value + label (two paragraphs, or value<br>label).
 */

function readCell(col) {
  const paras = [...col.querySelectorAll(':scope > p')];
  if (paras.length >= 2) {
    return {
      rawValue: paras[0].textContent.trim(),
      label: paras
        .slice(1)
        .map((p) => p.textContent.trim())
        .filter(Boolean)
        .join(' '),
    };
  }

  if (col.querySelector('br')) {
    const parts = col.innerHTML
      .split(/<br\s*\/?>/i)
      .map((chunk) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = chunk;
        return tmp.textContent.trim();
      })
      .filter(Boolean);
    return { rawValue: parts[0] || '', label: parts.slice(1).join(' ') };
  }

  const lines = (col.textContent || '')
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { rawValue: lines[0] || '', label: lines.slice(1).join(' ') };
}

function parseValue(raw) {
  const m = raw.match(/^([\d,]+)(?:\s*(.*))?$/);
  if (!m) return { value: raw, suffix: '' };
  return { value: m[1], suffix: (m[2] || '').trim() };
}

function buildLayer(value, suffix, cls) {
  const layer = document.createElement('div');
  layer.className = `odo-layer ${cls}`;
  layer.setAttribute('aria-hidden', cls === 'odo-full' ? 'true' : 'false');

  [...value].forEach((ch) => {
    if (ch < '0' || ch > '9') {
      const sep = document.createElement('span');
      sep.className = 'odo-sep';
      sep.textContent = ch;
      layer.append(sep);
      return;
    }
    const digit = document.createElement('div');
    digit.className = 'odo-digit';
    const strip = document.createElement('div');
    strip.className = 'odo-strip';
    for (let n = 0; n <= 9; n += 1) {
      const s = document.createElement('span');
      s.textContent = String(n);
      strip.append(s);
    }
    digit.append(strip);
    layer.append(digit);
  });

  if (suffix) {
    const sf = document.createElement('span');
    sf.className = 'stat-suffix';
    sf.textContent = suffix;
    layer.append(sf);
  }

  return layer;
}

function buildOdometer(value, suffix) {
  const odo = document.createElement('div');
  odo.className = 'odometer';
  odo.dataset.value = value;
  if (suffix) odo.dataset.suffix = suffix;
  odo.setAttribute('aria-label', `${value}${suffix}`);

  const empty = buildLayer(value, suffix, 'odo-empty');
  const full = buildLayer(value, suffix, 'odo-full');
  const foam = document.createElement('i');
  foam.className = 'odo-foam';

  odo.append(empty, full, foam);
  return { odo, empty, full };
}

function pour(odo, empty, full, targets) {
  [empty, full].forEach((layer) => {
    layer.querySelectorAll('.odo-strip').forEach((strip, i) => {
      const h = strip.children[0]?.offsetHeight || 0;
      strip.style.transitionDelay = `${i * 0.12}s`;
      strip.style.transform = `translateY(-${targets[i] * h}px)`;
    });
  });
  odo.classList.add('poured');
}

function observeOdometer(odo, empty, full, value) {
  const targets = [];
  [...value].forEach((ch) => {
    if (ch >= '0' && ch <= '9') targets.push(parseInt(ch, 10));
  });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    pour(odo, empty, full, targets);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        pour(odo, empty, full, targets);
        io.disconnect();
      });
    },
    { threshold: 0.35, rootMargin: '0px 0px -12% 0px' },
  );
  io.observe(odo);
}

/**
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;

  const cols = [...row.children];
  const list = document.createElement('div');
  list.className = 'figures-grid';

  cols.forEach((col) => {
    const { rawValue, label } = readCell(col);
    if (!rawValue) return;

    const { value, suffix } = parseValue(rawValue);
    const card = document.createElement('div');
    card.className = 'figure';

    const { odo, empty, full } = buildOdometer(value, suffix);
    card.append(odo);

    if (label) {
      const lbl = document.createElement('div');
      lbl.className = 'figure-label';
      lbl.textContent = label;
      card.append(lbl);
    }

    list.append(card);
    observeOdometer(odo, empty, full, value);
  });

  block.replaceChildren(list);
}
