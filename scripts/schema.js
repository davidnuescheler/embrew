/**
 * Per-page JSON-LD.
 *
 * The site-wide Restaurant entity lives in head.html and is served in the
 * initial HTML. Everything here is page-shaped and depends on the authored
 * DOM, so it is emitted from JS and references the site entity by @id.
 */

const ORIGIN = 'https://emigrationbrewing.com';
const ENTITY_ID = `${ORIGIN}/#restaurant`;

function pagePath() {
  return window.location.pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/';
}

function absolute(url) {
  try {
    return new URL(url, ORIGIN).href;
  } catch (e) {
    return undefined;
  }
}

function titleCase(segment) {
  return segment
    .split('-')
    .filter((w) => w)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function emit(data) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.append(script);
}

/**
 * Home -> Journal -> post. Positions are sequential from 1; the last item
 * omits `item` because it is the current page.
 * @param {Element} main The main element
 */
function buildBreadcrumb(main) {
  const path = pagePath();
  if (path === '/') return null;

  const segments = path.split('/').filter((s) => s);
  const h1 = main.querySelector('h1');
  const items = [{
    '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/`,
  }];

  segments.forEach((segment, i) => {
    const last = i === segments.length - 1;
    const name = last && h1 ? h1.textContent.trim() : titleCase(segment);
    const entry = { '@type': 'ListItem', position: i + 2, name };
    if (!last) entry.item = `${ORIGIN}/${segments.slice(0, i + 1).join('/')}`;
    items.push(entry);
  });

  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

/**
 * Prices are bare numbers, sometimes a "cup / bowl" pair -- take the first.
 * @param {string} text
 */
function parsePrice(text) {
  const match = text.trim().match(/^\$?(\d+(?:\.\d{1,2})?)(?:\s*\/\s*\$?\d+(?:\.\d{1,2})?)?$/);
  return match ? match[1] : null;
}

/**
 * Authored dish rows come in two shapes:
 *   <p><strong>Name</strong><br>Description<br>Price</p>
 *   <p><strong>Name</strong></p><p>Description</p><p>Price</p>
 * @param {Element} paragraph
 */
function menuItemFrom(paragraph) {
  const strong = paragraph.querySelector(':scope > strong');
  if (!strong || strong !== paragraph.firstElementChild) return null;

  const name = strong.textContent.trim();
  if (!name) return null;

  const item = { '@type': 'MenuItem', name };
  const lines = [...paragraph.childNodes]
    .filter((n) => n !== strong)
    .map((n) => n.textContent.trim())
    .filter((t) => t);

  // Same-paragraph shape: the remaining lines are description then price.
  if (lines.length) {
    const price = parsePrice(lines[lines.length - 1]);
    if (price) {
      lines.pop();
      item.offers = { '@type': 'Offer', price, priceCurrency: 'USD' };
    }
    if (lines.length) item.description = lines.join(' ');
    return item;
  }

  // Split-paragraph shape: walk forward until the next dish or heading.
  let sibling = paragraph.nextElementSibling;
  const extra = [];
  while (sibling && sibling.tagName === 'P' && !sibling.querySelector(':scope > strong')) {
    const text = sibling.textContent.trim();
    if (text) extra.push(text);
    sibling = sibling.nextElementSibling;
  }
  if (extra.length) {
    const price = parsePrice(extra[extra.length - 1]);
    if (price) {
      extra.pop();
      item.offers = { '@type': 'Offer', price, priceCurrency: 'USD' };
    }
    if (extra.length) item.description = extra.join(' ');
  }
  return item;
}

/**
 * @param {Element} heading An h3 naming a course
 */
function courseSectionFrom(heading) {
  const items = [];
  let sibling = heading.nextElementSibling;
  while (sibling && !/^H[1-3]$/.test(sibling.tagName)) {
    if (sibling.tagName === 'P') {
      const item = menuItemFrom(sibling);
      if (item) items.push(item);
    }
    sibling = sibling.nextElementSibling;
  }
  if (!items.length) return null;
  return { '@type': 'MenuSection', name: heading.textContent.trim(), hasMenuItem: items };
}

/**
 * @param {Element} main The main element
 */
function buildMenu(main) {
  const blocks = [...main.querySelectorAll('.menu')];
  if (!blocks.length) return null;

  const sections = [];
  blocks.forEach((block) => {
    const courses = [...block.querySelectorAll('h3')]
      .map(courseSectionFrom)
      .filter((s) => s);
    if (!courses.length) return;

    // The h2 above the block names the menu (Dinner, Brunch, Drinks, ...).
    const section = block.closest('main > div');
    const heading = section ? section.querySelector('h2') : null;
    if (heading) {
      sections.push({
        '@type': 'MenuSection',
        name: heading.textContent.trim(),
        hasMenuSection: courses,
      });
    } else {
      sections.push(...courses);
    }
  });

  if (!sections.length) return null;

  const h1 = main.querySelector('h1');
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `${ORIGIN}${pagePath()}#menu`,
    name: h1 ? h1.textContent.trim() : 'Menu',
    url: `${ORIGIN}${pagePath()}`,
    inLanguage: 'en-US',
    provider: { '@id': ENTITY_ID },
    hasMenuSection: sections,
  };
}

/**
 * @param {Element} main The main element
 */
function buildArticle(main) {
  const path = pagePath();
  if (!path.startsWith('/journal/')) return null;

  const h1 = main.querySelector('h1');
  if (!h1) return null;

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: h1.textContent.trim(),
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${ORIGIN}${path}` },
    url: `${ORIGIN}${path}`,
    inLanguage: 'en-US',
    author: { '@id': ENTITY_ID },
    publisher: { '@id': ENTITY_ID },
    about: { '@id': ENTITY_ID },
  };

  const description = document.querySelector('meta[name="description"]');
  if (description && description.content) article.description = description.content;

  const image = main.querySelector('img');
  if (image && image.src) article.image = absolute(image.src);

  const published = document.querySelector('meta[name="publisheddate"]');
  if (published && published.content) article.datePublished = published.content;

  return article;
}

/**
 * Emits every page-level graph that applies. Additive only -- a failure here
 * must never break the page.
 *
 * Deliberately no FAQPage: Google retired FAQ rich results on 2026-05-07, and
 * FAQ markup measures at -5.74% on AI-answer visibility, so it is now a cost
 * with no upside. Same reason Service schema is absent -- never supported.
 *
 * @param {Element} main The main element, before block JS has run
 */
export default function decorateSchema(main) {
  try {
    [buildBreadcrumb(main), buildMenu(main), buildArticle(main)]
      .filter((graph) => graph)
      .forEach(emit);
  } catch (e) {
    // schema is additive -- never let it break the page
  }
}
