/**
 * Menu block — category columns of name / description / price items.
 *
 * Rows are pairs of category cells (h3 + items). Items arrive as either:
 *   <p><strong>Name</strong><br>desc<br>price</p>
 * or split across paragraphs when Word/Docs breaks on soft returns.
 */

const PRICE_RE = /^\d+(\.\d+)?(\s*\/\s*\d+(\.\d+)?)?$/;
const TAG_RE = /\s+\b(GF|V|VG|DF)\b/gi;

function isPrice(text) {
  return PRICE_RE.test((text || '').trim());
}

function paragraphLines(p) {
  return p.innerHTML
    .split(/<br\s*\/?>/i)
    .map((chunk) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = chunk;
      return tmp.textContent.replace(/\s+/g, ' ').trim();
    })
    .filter(Boolean);
}

function parseName(raw) {
  const tags = [];
  const name = raw
    .replace(TAG_RE, (_, tag) => {
      tags.push(tag.toUpperCase());
      return '';
    })
    .replace(/\s+/g, ' ')
    .trim();
  return { name, tags };
}

function buildItem({ name, tags, description, price }) {
  const mi = document.createElement('div');
  mi.className = 'menu-item';

  const copy = document.createElement('div');
  copy.className = 'menu-item-copy';

  const title = document.createElement('div');
  title.className = 'menu-item-name';
  title.append(document.createTextNode(name));
  tags.forEach((tag) => {
    const em = document.createElement('em');
    em.textContent = tag;
    title.append(em);
  });
  copy.append(title);

  if (description) {
    const desc = document.createElement('div');
    desc.className = 'menu-item-desc';
    desc.textContent = description;
    copy.append(desc);
  }

  mi.append(copy);

  if (price) {
    const pr = document.createElement('div');
    pr.className = 'menu-item-price';
    pr.textContent = price;
    mi.append(pr);
  }

  return mi;
}

function parseItems(paras, startIndex) {
  const items = [];
  let i = startIndex;

  while (i < paras.length) {
    const p = paras[i];
    const strong = p.querySelector('strong');
    if (!strong) {
      i += 1;
      continue;
    }

    const lines = paragraphLines(p);
    const { name, tags } = parseName(strong.textContent);
    let description = '';
    let price = '';

    if (lines.length >= 2) {
      // Compact: name (+ desc)* + price in one paragraph
      const rest = lines.slice(1);
      if (rest.length && isPrice(rest[rest.length - 1])) {
        price = rest.pop();
      }
      description = rest.join(' ').trim();
      i += 1;
    } else {
      // Split: name alone, following plain paragraphs are desc / price
      i += 1;
      while (i < paras.length && !paras[i].querySelector('strong')) {
        const t = paras[i].textContent.replace(/\s+/g, ' ').trim();
        if (isPrice(t)) price = t;
        else description = description ? `${description} ${t}` : t;
        i += 1;
      }
    }

    if (name) items.push({ name, tags, description, price });
  }

  return items;
}

function buildCategory(col) {
  const heading = col.querySelector('h2, h3, h4');
  if (!heading && !col.textContent.trim()) return null;

  const cat = document.createElement('div');
  cat.className = 'menu-category';
  if (heading) cat.append(heading);

  const paras = [...col.querySelectorAll(':scope > p')];
  let firstItem = paras.findIndex((p) => p.querySelector('strong'));
  if (firstItem < 0) firstItem = paras.length;

  // Lead copy before the first <strong> item — keep as description text
  paras.slice(0, firstItem).forEach((p) => {
    const text = p.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;
    const lead = document.createElement('p');
    lead.className = 'menu-lead';
    lead.textContent = text;
    cat.append(lead);
  });

  parseItems(paras, firstItem).forEach((item) => cat.append(buildItem(item)));
  return cat;
}

/**
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const grid = document.createElement('div');
  grid.className = 'menu-cols';

  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const cat = buildCategory(col);
      if (cat) grid.append(cat);
    });
  });

  block.replaceChildren(grid);
}
