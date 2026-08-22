/**
 * Footer block — site chrome built in code (not content-editable yet).
 * EDS DOM: <footer><div class="footer block">…</div></footer>
 */

const LOGO_SRC = '/assets/logo-white.png';

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  block.innerHTML = `
    <div class="foot-grid">
      <div class="foot-brand">
        <div class="brand">
          <img src="${LOGO_SRC}" alt="" width="26" height="26">
          <span>EMIGRATION BREWING CO.</span>
        </div>
        <p>Craft canyon dining in Emigration Canyon since 2019. Wood-fired, seasonally driven, locally poured.</p>
        <div class="socials">
          <a href="https://www.instagram.com/emigrationbrewing/" target="_blank" rel="noopener" aria-label="Instagram">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
          </a>
          <a href="https://goo.gl/maps/TyKiLTS6rXe1pPtcA" target="_blank" rel="noopener" aria-label="Directions">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </a>
        </div>
        <span class="foot-label">Seasonal Menus &amp; Specials</span>
        <p class="foot-note">Four menus a year, monthly specials. No more than one email a month.</p>
        <form class="signup" action="https://squareup.com/outreach/MuiIHL/subscribe" method="POST" target="_blank">
          <label class="hp" for="footer-email">Email address</label>
          <input id="footer-email" type="email" name="email_address" placeholder="Your Email Address" autocomplete="email" required>
          <input type="hidden" name="embed" value="true">
          <button type="submit">Join Now</button>
        </form>
      </div>
      <div class="foot-explore">
        <span class="foot-label">Explore</span>
        <a href="/menu">Menu</a>
        <a href="/gallery">Gallery</a>
        <a href="/story">Our Story</a>
        <a href="/private-events">Private Events</a>
        <a href="/visit">Visit</a>
        <a href="https://squareup.com/gift/7K7NMVAGPW6BC/order" target="_blank" rel="noopener">Gift Cards</a>
      </div>
      <div class="foot-visit">
        <span class="foot-label">Visit</span>
        <a href="https://goo.gl/maps/TyKiLTS6rXe1pPtcA" target="_blank" rel="noopener">4170 Emigration Canyon Rd<br>Salt Lake City, UT 84108</a>
        <a href="tel:3853585605">(385) 358-5605</a>
        <a href="mailto:info@emigrationbrewing.com">info@emigrationbrewing.com</a>
      </div>
    </div>
    <div class="foot-bot">
      <div>&copy; <span class="year"></span> Emigration Brewing Co. All rights reserved.</div>
      <div>Celebrating the brewing history of Utah since 1865.</div>
    </div>
  `;

  const year = block.querySelector('.year');
  if (year) year.textContent = String(new Date().getFullYear());
}
