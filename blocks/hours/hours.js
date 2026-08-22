/**
 * Hours block — schedule table + contact rows (v2 visit layout).
 *
 * One row, two columns:
 *   Left:  h3 sections with day/time paragraphs, optional note
 *   Right: h3 labels with address / phone / email / link values
 */

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

function isHeading(el) {
  return el && /^H[1-6]$/.test(el.tagName);
}

function parseHoursCol(col) {
  const sections = [];
  let note = '';
  let current = null;
  let pendingDay = null;

  [...col.children].forEach((el) => {
    if (isHeading(el)) {
      pendingDay = null;
      current = { title: el.textContent.trim(), rows: [] };
      sections.push(current);
      return;
    }
    if (el.tagName !== 'P' || el.classList.contains('button-container')) return;

    const strong = el.querySelector('strong');
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;

    if (strong) {
      const day = strong.textContent.replace(/\s+/g, ' ').trim();
      const lines = paragraphLines(el);
      // First line is the day label; anything after <br> is the time
      const time = lines.length > 1 ? lines.slice(1).join(' ') : '';
      if (time) {
        current?.rows.push({ day, time });
        pendingDay = null;
      } else {
        pendingDay = day;
      }
      return;
    }

    if (pendingDay && current) {
      current.rows.push({ day: pendingDay, time: text });
      pendingDay = null;
      return;
    }

    note = note ? `${note} ${text}` : text;
  });

  return { sections, note };
}

function parseContactCol(col) {
  const items = [];
  let current = null;

  [...col.children].forEach((el) => {
    if (isHeading(el)) {
      current = {
        label: el.textContent.trim(),
        lines: [],
        href: '',
        external: false,
      };
      items.push(current);
      return;
    }
    if (!current) return;

    const link = el.querySelector('a[href]');
    if (link) {
      const label = link.textContent.replace(/\s+/g, ' ').trim();
      if (label) current.lines.push(label);
      if (!current.href) current.href = link.href;
      if (/^https?:/i.test(link.href)) current.external = true;
      return;
    }

    if (el.tagName !== 'P') return;
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;
    current.lines.push(text);

    if (!current.href) {
      if (/@/.test(text)) current.href = `mailto:${text}`;
      else if (/\d{3}/.test(text) && /[\d()\-\s+]{7,}/.test(text)) {
        current.href = `tel:${text.replace(/[^\d+]/g, '')}`;
      }
    }
  });

  return items.filter((item) => item.label && item.lines.length);
}

const ICONS = {
  address: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>',
  events: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  gift: '<rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M3 12h18M12 8v13"/><path d="M12 8S10 3 7.5 3 5 8 12 8zM12 8s2-5 4.5-5S19 8 12 8z"/>',
};

function iconFor(label) {
  const key = label.toLowerCase();
  if (key.includes('address')) return ICONS.address;
  if (key.includes('call') || key.includes('phone') || key.includes('text')) return ICONS.phone;
  if (key.includes('event')) return ICONS.events;
  if (key.includes('gift')) return ICONS.gift;
  if (key.includes('enquir') || key.includes('email') || key.includes('mail')) return ICONS.mail;
  return ICONS.mail;
}

function buildIcon(label) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '19');
  svg.setAttribute('height', '19');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = iconFor(label);
  return svg;
}

function buildSchedule({ sections, note }) {
  const wrap = document.createElement('div');
  wrap.className = 'hours-schedule';

  const table = document.createElement('table');
  table.className = 'hours-tbl';

  sections.forEach((section) => {
    const body = document.createElement('tbody');
    const head = document.createElement('tr');
    const th = document.createElement('th');
    th.colSpan = 2;
    th.textContent = section.title;
    head.append(th);
    body.append(head);

    section.rows.forEach(({ day, time }) => {
      const tr = document.createElement('tr');
      const tdDay = document.createElement('td');
      tdDay.textContent = day;
      const tdTime = document.createElement('td');
      tdTime.textContent = time;
      tr.append(tdDay, tdTime);
      body.append(tr);
    });

    table.append(body);
  });

  wrap.append(table);

  if (note) {
    const p = document.createElement('p');
    p.className = 'hours-note';
    p.textContent = note;
    wrap.append(p);
  }

  return wrap;
}

function buildContact(items) {
  const wrap = document.createElement('div');
  wrap.className = 'hours-contact';

  items.forEach((item) => {
    const row = item.href ? document.createElement('a') : document.createElement('div');
    row.className = 'hours-cx';
    if (item.href) {
      row.href = item.href;
      if (item.external) {
        row.target = '_blank';
        row.rel = 'noopener';
      }
    }

    row.append(buildIcon(item.label));

    const copy = document.createElement('div');
    const k = document.createElement('div');
    k.className = 'hours-k';
    k.textContent = item.label;
    const v = document.createElement('div');
    v.className = 'hours-v';
    item.lines.forEach((line, i) => {
      if (i) v.append(document.createElement('br'));
      v.append(document.createTextNode(line));
    });
    copy.append(k, v);
    row.append(copy);
    wrap.append(row);
  });

  return wrap;
}

/**
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const row = block.querySelector(':scope > div');
  const cols = row ? [...row.children] : [...block.children];
  if (!cols.length) return;

  const hoursCol = cols[0];
  const contactCol = cols[1];

  const grid = document.createElement('div');
  grid.className = 'hours-grid';
  grid.append(buildSchedule(parseHoursCol(hoursCol)));
  if (contactCol) grid.append(buildContact(parseContactCol(contactCol)));

  block.replaceChildren(grid);
}
