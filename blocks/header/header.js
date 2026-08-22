/**
 * Header block — site chrome built in code (not content-editable yet).
 * EDS DOM: <header><div class="header block">…</div></header>
 */

const LOGO_SRC = '/v2/assets/logo-white.png';
const RESERVE_URL = 'https://www.opentable.com/r/emigration-brewing-company-reservations-salt-lake-city';

const NAV_LINKS = [
  { href: '/menu', label: 'Menu' },
  { href: '/brunch', label: 'Brunch' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/story', label: 'Story' },
  { href: '/private-events', label: 'Private Events' },
  { href: '/visit', label: 'Visit' },
  { href: '/journal/', label: 'Journal' },
];

function isCurrentPath(href) {
  const path = window.location.pathname.replace(/\.html$/, '');
  const normalized = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
  const target = href.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  if (target === '/') return normalized === '/' || normalized === '';
  return normalized === target || normalized.startsWith(`${target}/`);
}

function linkAttrs(href) {
  return isCurrentPath(href) ? ' aria-current="page"' : '';
}

function buildDesktopLinks() {
  const items = NAV_LINKS.map(
    ({ href, label }) => `<a href="${href}"${linkAttrs(href)}>${label}</a>`,
  ).join('');
  return `${items}<a class="nav-cta" href="${RESERVE_URL}" target="_blank" rel="noopener">Reserve</a>`;
}

function buildMobileLinks() {
  const home = `<a href="/"${linkAttrs('/')}>Home</a>`;
  const items = NAV_LINKS.map(
    ({ href, label }) => `<a href="${href}"${linkAttrs(href)}>${label}</a>`,
  ).join('');
  return `${home}${items}<a class="mnav-cta" href="${RESERVE_URL}" target="_blank" rel="noopener">Reserve a Table
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>`;
}

function wireInteractions(block) {
  const nav = block.querySelector('.nav');
  const burger = block.querySelector('.burger');
  const mnav = block.querySelector('.mnav');

  const onScroll = () => {
    if (nav) nav.classList.toggle('solid', window.scrollY > 70);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const openMenu = () => {
    if (!mnav) return;
    mnav.classList.add('is-open');
    document.body.classList.add('mnav-open');
    if (burger) burger.setAttribute('aria-expanded', 'true');
    const first = mnav.querySelector('.mnav-links a');
    if (first) setTimeout(() => first.focus(), 60);
  };

  const closeMenu = () => {
    if (!mnav) return;
    mnav.classList.remove('is-open');
    document.body.classList.remove('mnav-open');
    if (burger) {
      burger.setAttribute('aria-expanded', 'false');
      burger.focus();
    }
  };

  if (burger && mnav) {
    burger.addEventListener('click', (e) => {
      e.preventDefault();
      if (mnav.classList.contains('is-open')) closeMenu();
      else openMenu();
    });
    mnav.querySelectorAll('[data-close]').forEach((el) => {
      el.addEventListener('click', closeMenu);
    });
    mnav.querySelectorAll('a[href]').forEach((a) => {
      a.addEventListener('click', closeMenu);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mnav.classList.contains('is-open')) closeMenu();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && mnav.classList.contains('is-open')) closeMenu();
    });
  }
}

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  block.innerHTML = `
    <nav class="nav" aria-label="Primary">
      <a class="brand" href="/">
        <img src="${LOGO_SRC}" alt="" width="26" height="26">
        <span>EMIGRATION BREWING CO.</span>
      </a>
      <div class="navlinks">${buildDesktopLinks()}</div>
      <button class="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mnav">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>
      </button>
    </nav>
    <div class="mnav" id="mnav" role="dialog" aria-modal="true" aria-label="Site menu">
      <div class="mnav-scrim" data-close></div>
      <div class="mnav-panel">
        <button class="mnav-close" data-close type="button" aria-label="Close menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
        </button>
        <div class="mnav-links">${buildMobileLinks()}</div>
        <div class="mnav-contact">
          <a href="tel:3853585605">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
            <span>(385) 358-5605</span>
          </a>
          <a href="https://goo.gl/maps/TyKiLTS6rXe1pPtcA" target="_blank" rel="noopener">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>4170 Emigration Canyon Rd</span>
          </a>
          <a href="https://squareup.com/gift/7K7NMVAGPW6BC/order" target="_blank" rel="noopener">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M3 12h18M12 8v13"/><path d="M12 8S10 3 7.5 3 5 8 12 8zM12 8s2-5 4.5-5S19 8 12 8z"/></svg>
            <span>Gift Cards</span>
          </a>
          <a href="https://www.instagram.com/emigrationbrewing/" target="_blank" rel="noopener">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
            <span>@emigrationbrewing</span>
          </a>
          <div class="mnav-hours">
            <b>Brunch</b>Sat &ndash; Sun &middot; 10:00am &ndash; 2:00pm
            <b>Dinner</b>Mon &ndash; Thu &middot; 5:00pm &ndash; 9:00pm<br>Fri &ndash; Sat &middot; 4:00pm &ndash; 9:00pm<br>Sun &middot; 4:00pm &ndash; 8:00pm
          </div>
        </div>
      </div>
    </div>
  `;

  wireInteractions(block);
}
