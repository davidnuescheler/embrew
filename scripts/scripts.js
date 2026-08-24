import {
  loadHeader,
  loadFooter,
  decorateBlocks,
  decorateSections,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  buildBlock,
} from './aem.js';

function addQuickNav() {
  const h3s = [...document.querySelectorAll('main h3')];
  const h4 = document.querySelector('main h4');
  const h1 = document.querySelector('main h1').textContent;
  if (h4 && h3s.length && h1.includes('menu')) {
    const div = document.createElement('div');
    div.className = 'menu-switcher';
    const select = document.createElement('select');
    const pl = document.createElement('option');
    pl.textContent = 'Browse the menu ...';
    pl.selected = true;
    pl.disabled = true;
    select.append(pl);
    h3s.forEach((h3) => {
      const option = document.createElement('option');
      option.textContent = h3.textContent;
      option.value = h3.id;
      select.append(option);
    });
    div.append(select);
    h3s[0].parentNode.insertBefore(div, h3s[0]);
    select.addEventListener('change', () => {
      window.location.hash = `#${select.value}`;
    });
  }
}

const ICONS_CACHE = {};

/**
 * Attempt to replace <img> with <svg><use> to allow styling based on use of current color
 * @param {icon} icon <img> element
 */
export async function spriteIcon(icon) {
  const span = icon.closest('span.icon');
  if (span) {
  // Prepare the inline sprite
    let svgSprite = document.getElementById('franklin-svg-sprite');
    if (!svgSprite) {
      const div = document.createElement('div');
      div.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" id="franklin-svg-sprite" style="display: none"></svg>';
      svgSprite = div.firstElementChild;
      document.body.append(div.firstElementChild);
    }

    const { iconName } = icon.dataset;
    if (!ICONS_CACHE[iconName]) {
      try {
        const response = await fetch(icon.src);
        // cowardly refusing to load large icons
        if (response.contentLength > 10240) {
          ICONS_CACHE[iconName] = { };
          return;
        }
        if (!response.ok) {
          return;
        }

        // only sprite icons that use currentColor
        const svg = await response.text();
        if (svg.toLowerCase().includes('currentcolor')) {
          const symbol = svg
            .replace('<svg', `<symbol id="icons-sprite-${iconName}"`)
            .replace(/ width=".*?"/, '')
            .replace(/ height=".*?"/, '')
            .replace('</svg>', '</symbol>');
          ICONS_CACHE[iconName] = {
            html: symbol,
          };
          svgSprite.innerHTML += symbol;
        } else {
          ICONS_CACHE[iconName] = { };
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }

    if (document.getElementById(`icons-sprite-${iconName}`)) {
      const titleEl = document.querySelector(`#icons-sprite-${iconName} title`);
      const title = titleEl ? titleEl.textContent : '';
      span.innerHTML = `<svg title="${title}" xmlns="http://www.w3.org/2000/svg"><use href="#icons-sprite-${iconName}"/></svg>`;
    }
  }
}

/**
 * Add <img> for icons, prefixed with codeBasePath and optional prefix.
 * @param {Element} [element] Element containing icons
 * @param {string} [prefix] prefix to be added to icon the src
 */

export async function decorateIcons(element, prefix = '') {
  const icons = [...element.querySelectorAll('span.icon')];
  icons.forEach((span) => {
    const iconName = Array.from(span.classList).find((c) => c.startsWith('icon-')).substring(5);
    const img = document.createElement('img');
    img.dataset.iconName = iconName;
    img.src = `${prefix}/icons/${iconName}.svg`;
    img.loading = 'lazy';

    span.append(img);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          spriteIcon(img);
          io.disconnect();
        }
      });
    });
    io.observe(img);
  });
}

export function decoratePhoneLinks(elem) {
  const isMobile = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  const isMac = (navigator.appVersion.indexOf('Mac') !== -1);
  elem.querySelectorAll('a[href^="https://sms/"]').forEach((a) => {
    a.title = `text us at 385-358-5605`;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const body = new URL(a.href).searchParams.get('body');
      // TODO: Make this configurable
      if (isMobile || isMac) {
        window.open(`sms:+13853585605?&body=${body}`);
      } else {
        window.open(`mailto:events@emigrationbrewing.com?subject=${body}`);
      }
    });
  });
}

/**
 * Whether a tab link matches the current page (and hash, when relevant).
 * Same-document `#hash` links require a hash match; path links match on
 * pathname, and on hash only when the location already has one.
 * @param {HTMLAnchorElement} a
 */
function isActiveTabLink(a) {
  const href = a.getAttribute('href') || '';
  const url = new URL(a.href, window.location.href);
  const norm = (p) => p.replace(/\/+$/, '') || '/';

  if (href.startsWith('#')) return true;
  if (url.pathname === window.location.pathname) return true;
  
  return false;
}

/**
 * Auto-detects paragraphs that contain only links (menu section switchers)
 * and styles them as v2-style tabs. Marks the current page/hash with `.on`.
 * @param {Element} element
 */
export function decorateLinkTabs(element) {
  element.querySelectorAll('p').forEach((p) => {
    if (p.classList.contains('tabs') || p.classList.contains('button-container')) return;
    const links = [...p.querySelectorAll(':scope > a')];
    if (links.length < 2) return;
    if ([...p.children].some((el) => el.tagName !== 'A')) return;

    const leftover = p.cloneNode(true);
    leftover.querySelectorAll('a').forEach((a) => a.remove());
    if (leftover.textContent.trim()) return;

    p.classList.add('tabs');
    p.setAttribute('role', 'tablist');
    links.forEach((a) => {
      a.classList.remove('button', 'primary', 'secondary');
      a.classList.add('tab');
      a.setAttribute('role', 'tab');
      const on = isActiveTabLink(a);
      a.classList.toggle('on', on);
      a.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  });
}

/**
 * Turns a short plain paragraph at the top of a content container,
 * immediately ahead of a heading, into an eyebrow label.
 * Runs after section decoration so default content after a section break
 * (and after blocks) sits at the start of its wrapper.
 * @param {Element} element
 */
export function decorateEyebrows(element) {
  element.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    const prev = heading.previousElementSibling;
    if (!prev || prev.tagName !== 'P') return;
    // Must lead its container (section, block cell, or default-content-wrapper)
    if (prev !== prev.parentElement?.firstElementChild) return;
    if (prev.querySelector('a, picture, img, button')) return;
    if (prev.classList.contains('button-container') || prev.classList.contains('eyebrow')) return;
    const text = prev.textContent.trim();
    if (!text || text.length > 80) return;
    prev.classList.add('eyebrow');
  });
}

/**
 * Applies section metadata backgrounds (data-background → full-bleed image).
 * Uses only the path (+ query) so the asset resolves on the current origin.
 * @param {Element} main
 */
export function decorateSectionBackgrounds(main) {
  main.querySelectorAll('[data-background]').forEach((el) => {
    const raw = el.dataset.background?.trim();
    if (!raw || el.querySelector(':scope > .section-background')) return;

    let src = raw;
    try {
      const url = new URL(raw, window.location.origin);
      src = `${url.pathname}${url.search}`;
    } catch (e) {
      // already a path
    }

    el.classList.add('has-background');
    const bg = document.createElement('div');
    bg.className = 'section-background';
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.loading = 'lazy';
    bg.append(img);
    el.prepend(bg);
  });
}

/**
 * Turns `/widgets/...` links into widget blocks.
 * @param {Element} main The container element
 */
function buildWidgetAutoBlocks(main) {
  const widgetLinks = [...main.querySelectorAll('a[href*="/widgets/"]')];
  widgetLinks.forEach((link) => {
    if (link.closest('.widget')) return;
    const newLink = link.cloneNode(true);
    const widgetBlock = buildBlock('widget', { elems: [newLink] });
    const p = link.closest('p');
    if (
      p
      && p.querySelectorAll('a').length === 1
      && p.querySelector('a') === link
      && p.textContent.trim() === link.textContent.trim()
    ) {
      p.replaceWith(widgetBlock);
    } else {
      link.replaceWith(widgetBlock);
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildWidgetAutoBlocks(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links as buttons (from aem-boilerplate).
 * Also supports link-only paragraphs with a bold + italic pair
 * as primary / secondary buttons side by side.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  // Two-link CTA rows: <p><strong><a>…</a></strong> <em><a>…</a></em></p>
  main.querySelectorAll('p').forEach((p) => {
    if (p.classList.contains('button-container') || p.classList.contains('tabs')) return;
    const links = [...p.querySelectorAll('a')].filter((a) => !a.querySelector('img'));
    if (links.length !== 2) return;

    if ([...p.children].some((el) => {
      if (el.tagName === 'A') return false;
      if (el.tagName === 'STRONG' || el.tagName === 'EM') {
        return el.childElementCount !== 1 || el.firstElementChild?.tagName !== 'A';
      }
      return true;
    })) return;

    const leftover = p.cloneNode(true);
    leftover.querySelectorAll('a').forEach((a) => a.remove());
    if (leftover.textContent.trim()) return;

    p.className = 'button-container';
    links.forEach((a) => {
      a.title = a.title || a.textContent;
      const strong = a.closest('strong');
      const em = a.closest('em');
      a.className = 'button';
      if (strong && em) a.classList.add('accent');
      else if (strong) a.classList.add('primary');
      else if (em) a.classList.add('secondary');
      const wrap = strong || em;
      if (wrap) wrap.replaceWith(a);
    });
  });

  // Single formatted links (boilerplate)
  main.querySelectorAll('p a[href]').forEach((a) => {
    if (a.closest('.button-container') || a.classList.contains('button')) return;
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    if (!p) return;
    const text = a.textContent.trim();

    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-container';
    a.className = 'button';
    if (strong && em) {
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
function decorateMain(main) {
  buildAutoBlocks(main);
  decorateIcons(main);
  decorateSections(main);
  decorateSectionBackgrounds(main);
  decorateBlocks(main);
  decorateButtons(main);
  decorateLinkTabs(main);
  decorateEyebrows(main);
  decoratePhoneLinks(main);
  document.querySelectorAll('picture').forEach((picture) => {
    const section = picture.closest('main > div');
    if (!section.textContent.trim() && !section.querySelector('.block')) {
      section.classList.add('image-only');
    }
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * loads everything needed to get to LCP.
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  doc.body.classList.add('appear');
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * loads everything that doesn't need to be delayed.
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? main.querySelector(hash) : false;
  if (hash && element) element.scrollIntoView();

  await loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
  addQuickNav();

  if (window.location.hostname.endsWith('aem.page') || window.location.hostname === ('localhost')) {
    // eslint-disable-next-line import/no-cycle
    import('../tools/preview/preview.js');
  }
}

/**
 * loads everything that happens a lot later, without impacting
 * the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  // handle 404 from document
  if (window.errorCode === '404') {
    const resp = await fetch('/global/404.plain.html');
    if (resp.status === 200) {
      const html = await resp.text();
      const main = document.querySelector('main');
      main.innerHTML = html;
      main.classList.remove('error');
    }
  }
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
