/*
 * Copyright 2020 Emigration Brewing . All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-disable no-console */
/* global window performance fetch document localStorage */

function stamp(message) {
  if (window.name.includes('performance')) {
    console.log(`${new Date() - performance.timing.navigationStart}:${message}`);
  }
}

stamp('start');

function createTag(name, attrs) {
  const el = document.createElement(name);
  if (typeof attrs === 'object') {
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }
  return el;
}

function wrapSections(element) {
  document.querySelectorAll(element).forEach(($div) => {
    if (!$div.id) {
      const $wrapper = createTag('div', { class: 'section-wrapper' });
      $div.parentNode.appendChild($wrapper);
      $wrapper.appendChild($div);
    }
  });
}

async function getConfig() {
  if (!window.embrew.config) {
    const config = {};
    const resp = await fetch('/configuration.json');
    let rawJSON = await resp.json();
    if (rawJSON.data) rawJSON = rawJSON.data;
    let waitingForCategory = true;
    let currentCategory;
    rawJSON.forEach((row) => {
      if (row.name) {
        if (row.value) {
          const keyName = row.name;
          currentCategory[keyName] = row.value;
        } else {
          if (waitingForCategory) {
            const categoryName = row.name.replace(':', '');
            if (!config[categoryName]) config[categoryName] = {};
            currentCategory = config[categoryName];
          }
          waitingForCategory = false;
        }
      } else {
        waitingForCategory = true;
      }
    });
    window.embrew.config = config;
  }

  return (window.embrew.config);
}

function isSameDate(date1, date2) {
  return (date1.getDate() === date2.getDate()
        && date1.getFullYear() === date2.getFullYear()
        && date1.getMonth() === date2.getMonth());
}

// eslint-disable-next-line no-unused-vars
function timeToHours(time) {
  const timeSegs = time.split(' ');
  const hoursMins = timeSegs[0].split(':');

  const hour = ((+hoursMins[0]) % 12) + (timeSegs[1] === 'PM' ? 12 : 0);
  const mins = +hoursMins[1];
  return (hour + mins / 60);
}

function getDate(date, time) {
  if (Number.isNaN(date)) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateSegs = date.split(' ');
    const timeSegs = time.split(' ');
    const hoursMins = timeSegs[0].split(':');

    const hour = ((+hoursMins[0]) % 12) + (timeSegs[1] === 'PM' ? 12 : 0);
    const mins = +hoursMins[1];

    const dateAndTime = new Date(+dateSegs[3], months.indexOf(dateSegs[1]),
      +dateSegs[2], hour, mins);
    console.log(dateAndTime, `${date}->${time}`);

    return (dateAndTime);
  }
  const serial = date;
  const utcDays = Math.floor(serial - 25569) + 1; // hack for negative UTC
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);

  return new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate());
}

async function areWeClosed(someDate) {
  const config = await getConfig();
  const closedOn = config['Closed on'];
  const days = Object.keys(closedOn);
  const stop = config.Stop['Orders and Reservations for Today'];
  if (stop && isSameDate(someDate, new Date())) {
    return ('Today');
  }
  let closed = '';
  days.forEach((day) => {
    const closedDate = getDate(closedOn[day]);
    if (isSameDate(someDate, closedDate)) closed = day;
  });
  // console.log(closed);
  return closed;
}

// eslint-disable-next-line no-unused-vars
function decorateBackgroundSections() {
  document.querySelectorAll('main div.section-wrapper>div>:first-child>img').forEach(($headerImg) => {
    if ($headerImg) {
      const src = $headerImg.getAttribute('src');
      const $wrapper = $headerImg.closest('.section-wrapper');
      $wrapper.style.backgroundImage = `url(${src})`;
      $headerImg.parentNode.remove();
      $wrapper.classList.add('bg-image');
    }
  });

  const $hero = document.querySelector('main>div.section-wrapper');
  if ($hero && $hero.classList.contains('bg-image')) $hero.classList.add('hero');
}

function decorateImageOnlySections() {
  document.querySelectorAll('main div.section-wrapper>div>picture, main div.section-wrapper>div>img').forEach(($img) => {
    const $wrapper = $img.closest('.section-wrapper');
    $wrapper.classList.add('image-only');
  });
}

// eslint-disable-next-line no-unused-vars
function stashForm(ids) {
  ids.forEach((id) => {
    const { value } = document.getElementById(id);
    localStorage.setItem(id, value);
  });
}

// eslint-disable-next-line no-unused-vars
function getOpeningHours(section) {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const openingHours = weekdays.map((day) => {
    const usTime = section[day];
    const ampms = usTime.split('-');
    const [from, to] = ampms.map((ampm) => {
      let plus = 0;
      if (ampm.includes('pm')) plus = 12;
      return (+ampm.replace(/\D+/g, '') + plus);
    });
    return ({ from, to });
  });
  return openingHours;
}

// eslint-disable-next-line no-unused-vars
function generateId() {
  let id = '';
  const chars = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < 5; i += 1) {
    id += chars.substr(Math.floor(Math.random() * chars.length), 1);
  }
  return id;
}

// eslint-disable-next-line no-unused-vars
function populateForm($form) {
  $form.querySelectorAll('input').forEach(($input) => {
    const { id } = $input;
    if (id) {
      const value = localStorage.getItem(id);
      if (value) $input.value = value;
    }
  });
}

// eslint-disable-next-line no-unused-vars
function toClassName(name) {
  return (name.toLowerCase().replace(/[^0-9a-z]/gi, '-'));
}

function decorateSquareLinks() {
  document.querySelectorAll('main a[href^="https://squareup.com/dashboard/items/library/"]').forEach(($a) => {
    const href = $a.getAttribute('href');
    const splits = href.split('/');
    const itemId = splits[6];
    $a.removeAttribute('href');
    $a.classList.add('add-to-order');
    $a.addEventListener('click', () => {
      // eslint-disable-next-line no-undef
      addToCart(itemId);
    });
  });
}

function hideTitle() {
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    document.querySelector('main h1').remove();
  }
}

function decoratePhoneLinks() {
  ['tel', 'sms'].forEach((p) => {
    document.querySelectorAll(`a[href*="/${p}/"]`).forEach(($a) => {
      $a.href = `${p}:${$a.href.split(`/${p}/`)[1]}`;
    });
  });
}
async function addBanner() {
  const l = window.location.pathname;
  if (l.endsWith('/') || l.endsWith('order') || l.endsWith('reservation')) {
    const config = await getConfig();
    const upcomingClosed = [];
    for (let daysOut = 0; daysOut < 10; daysOut += 1) {
      const day = new Date();
      day.setDate(day.getDate() + daysOut);
      let prefix = '';
      if (daysOut === 0) prefix = 'Today';
      if (daysOut === 1) prefix = 'Tomorrow';
      // eslint-disable-next-line no-await-in-loop
      const closedOn = await areWeClosed(day);
      if (closedOn) upcomingClosed.push((prefix ? `${prefix} ` : '') + closedOn);
    }
    if (upcomingClosed.length) {
      const $header = document.querySelector('header');
      const $banner = createTag('div', { class: 'banner' });
      const bannerTemplate = config['Banner Templates'].Closed;
      $banner.innerHTML = bannerTemplate.replace('...', upcomingClosed.join(' & '));
      $header.append($banner);
      setTimeout(() => { $banner.classList.add('appear'); }, 100);
    }
  }
}

function decoratePictures() {
  if (!document.querySelector('picture')) {
    const helixImages = document.querySelectorAll('main>div:nth-of-type(n+2) img[src^="/hlx_"');
    helixImages.forEach(($img) => {
      const $pic = createTag('picture');
      const $parent = $img.parentNode;
      $pic.appendChild($img);
      $parent.appendChild($pic);
    });
  }
}

/**
 * Loads a CSS file.
 * @param {string} href The path to the CSS file
 */
function loadCSS(href) {
  const link = document.createElement('link');
  link.setAttribute('rel', 'stylesheet');
  link.setAttribute('href', href);
  document.head.appendChild(link);
}

function checkLCPProxy() {
  const $heroImage = document.querySelector('img');
  if (!$heroImage || $heroImage.complete) {
    loadCSS('/lazy-styles.css');
    stamp('loading CSS');
  } else {
    $heroImage.addEventListener('load', checkLCPProxy);
    stamp('registered LCP Proxy listener');
  }
}

function decoratePage() {
  checkLCPProxy();
  stamp('decoratePage start');
  decoratePictures();
  wrapSections('main>div:nth-of-type(n+2)');
  // decorateBackgroundSections();
  decorateImageOnlySections();
  decorateSquareLinks();
  decoratePhoneLinks();
  hideTitle();
  addBanner();
  stamp('decoratePage end');
}

window.embrew = {};

decoratePage();
