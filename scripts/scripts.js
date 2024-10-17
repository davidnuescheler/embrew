import {
  sampleRUM,
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateBlocks,
  decorateSections,
  decorateTemplateAndTheme,
  waitForImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

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
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
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
 * Decorates the main element.
 * @param {Element} main The main element
 */
function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decoratePhoneLinks(main);
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  window.setTimeout(() => sampleRUM.observe(main.querySelectorAll('picture > img')), 1000);
  document.querySelectorAll('picture').forEach((picture) => {
    const section = picture.closest('main > div');
    if (!section.textContent.trim() && !section.querySelector('.block')) {
      section.classList.add('image-only');
    }
  });
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
    await loadSection(main.querySelector('.section'), waitForImage);
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
