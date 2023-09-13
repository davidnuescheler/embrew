import {
  sampleRUM,
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcon,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
} from './lib-franklin.js';

const LCP_BLOCKS = []; // add your LCP blocks to the list

sampleRUM('top');

window.addEventListener('load', () => sampleRUM('load'));

window.addEventListener('unhandledrejection', (event) => {
  sampleRUM('error', { source: event.reason.sourceURL, target: event.reason.line });
});

window.addEventListener('error', (event) => {
  sampleRUM('error', { source: event.filename, target: event.lineno });
});

function addQuickNav() {
  const h3s = [...document.querySelectorAll('main h3')];
  const h4 = document.querySelector('main h4');
  if (h4 && h3s.length) {
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
async function spriteIcon(icon) {
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

      const svg = await response.text();
      const parser = new DOMParser();
      const svgDOM = parser.parseFromString(svg, 'image/svg+xml');
      const svgElem = svgDOM.querySelector('svg');

      // only sprite icons that use currentColor
      if (svg.toLowerCase().includes('currentcolor')) {
        const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
        symbol.id = `icons-sprite-${iconName}`;
        symbol.setAttribute('viewBox', svgElem.getAttribute('viewBox'));
        while (svgElem.firstChild) symbol.append(svgElem.firstChild);
        ICONS_CACHE[iconName] = {
          symbol,
        };
        svgSprite.append(symbol);
      } else {
        icon.alt = svgElem.querySelector('title') ? svgElem.querySelector('title').textContent : iconName;
        ICONS_CACHE[iconName] = { };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  if (document.getElementById(`icons-sprite-${iconName}`)) {
    const span = icon.closest('span.icon');
    if (span) span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><use href="#icons-sprite-${iconName}"/></svg>`;
  }
}

/**
 * Add intersection observer to all icons in an element, to sprite them if possible
 * @param {Element} element element that contains icons
 * @param {string} prefix prefix for icon names
 */

// eslint-disable-next-line import/prefer-default-export
export function spriteIcons(element, prefix = '') {
  const icons = [...element.querySelectorAll('span.icon')];
  icons.forEach((span) => {
    if (!span.firstElementChild) decorateIcon(span, prefix);
    const img = span.querySelector('img');
    if (img) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            spriteIcon(img);
            io.disconnect();
          }
        });
      });
      io.observe(img);
    }
  });
}

function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    const existingSection = h1.closest('div');
    const overlay = document.createElement('div');
    overlay.classList.add('hero-overlay');
    [...existingSection.children].forEach((e) => overlay.append(e));
    section.append(buildBlock('hero', { elems: [picture, overlay] }));
    main.prepend(section);
    existingSection.remove();
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
    document.querySelectorAll('picture').forEach((picture) => {
      const section = picture.closest('main > div');
      if (!section.textContent.trim()) {
        section.classList.add('image-only');
      }
    });
    document.querySelectorAll('a[href^="https://squareup"]').forEach((a) => {
      a.remove();
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  spriteIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  window.setTimeout(() => sampleRUM.observe(main.querySelectorAll('picture > img')), 1000);
}

/**
 * loads everything needed to get to LCP.
 */
async function loadEager(doc) {
  doc.body.classList.add('appear');
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    await waitForLCP(LCP_BLOCKS);
  }
}

/**
 * loads everything that doesn't need to be delayed.
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? main.querySelector(hash) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  sampleRUM('lazy');
  addQuickNav();

  if (window.location.hostname.endsWith('hlx.page') || window.location.hostname === ('localhost')) {
    // eslint-disable-next-line import/no-cycle
    import('../tools/preview/preview.js');
  }
  document.documentElement.lang = 'en';
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
