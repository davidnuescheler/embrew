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
/* global window fetch document */

import {
  wrapSections,
  getConfig,
  getDate,
  createTag,
} from '../scripts.js';

const $section = document.querySelector('script[src="/components/host-reservations.js"').closest('div');
const $endpoint = $section.querySelector('a');
const endpoint = $endpoint.href;

window.embrew.reservationsEndpoint = endpoint;

$endpoint.parentNode.remove();

// eslint-disable-next-line no-unused-vars
function shortTime(date) {
  const today = new Date();
  const isToday = (date.getDate() === today.getDate()
      && date.getMonth() === today.getMonth()
      && date.getFullYear() === today.getFullYear());
  const thisWeek = (today - date) / 1000 < 7 * 86400;
  if (isToday) {
    return (date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
  } if (thisWeek) {
    return (date.toLocaleDateString([], { weekday: 'long' }).split(',')[0]);
  }
  return (date.toLocaleDateString());
}

const isToday = (someDate) => {
  const today = new Date();
  return someDate.getDate() === today.getDate()
      && someDate.getMonth() === today.getMonth()
      && someDate.getFullYear() === today.getFullYear();
};

// eslint-disable-next-line no-unused-vars
function formatPhoneNumber(number) {
  if (number.startsWith('+1')) {
    return (`(${number.substr(2, 3)}) ${number.substr(5, 3)}-${number.substr(8, 4)}`);
  }
  return (number);
}

async function fetchReservations() {
  wrapSections('main>div:first-of-type');
  document.querySelector('main>div:first-of-type').classList.add('section-wrapper', 'text-only-header');

  const resp = await fetch(`${endpoint}?FetchAs=${window.googleUser.email}`);
  const data = await resp.json();
  data.actions.sort((a, b) => {
    if (!a.Time) return (-1);
    if (!b.Time) return (1);
    const aDate = getDate(a.Date, a.Time);
    const bDate = getDate(b.Date, b.Time);
    return aDate - bDate;
  });

  /*
  data.actions.forEach((d) => {
    console.log(d.Date, d.Time);
  });
  */
  return (data.actions);
}

async function fetchReservation(reservation) {
  let qs = `?UpdatedBy=${window.googleUser.email}&`;

  Object.keys(reservation).forEach((a) => {
    const v = reservation[a];
    qs += `${a}=${encodeURIComponent(v)}&`;
  });

  const reservationEndpoint = 'https://thinktanked.org/cgi-bin/reservations';

  const resp = await fetch(reservationEndpoint + qs);
  const confirmed = await resp.json();
  console.log(confirmed);
  return confirmed;
}

async function updateStatus(res, status) {
  const conf = await fetchReservation({ ID: res.ID, Status: status });
  return conf;
}

// eslint-disable-next-line no-unused-vars
function hide(qs) {
  document.querySelector(qs).classList.add('hidden');
}

function show(qs) {
  document.querySelector(qs).classList.remove('hidden');
}

// eslint-disable-next-line no-unused-vars
function toggleArchive() {
  document.getElementById('reservations').classList.toggle('archive');
}

async function displayReservations() {
  const $upcoming = document.getElementById('upcoming');
  $upcoming.innerHTML = '';
  const now = new Date();
  window.embrew.reservations.forEach((r) => {
    if (r.Name) {
      if (!r.Status) r.Status = 'Not Arrived Yet';
      const status = r.Status;
      const statusClass = status.toLowerCase().replace(' ', '-');
      let timeStr = r.Time;
      let error = false;
      if (!r.Time) {
        error = 'error-time';
        timeStr = 'Error: No time set, please confirm';
        r.Time = '01:23 AM';
      }
      const today = isToday(getDate(r.Date, r.Time));
      const future = !!((today || getDate(r.Date, r.Time) > now));
      const $row = createTag('div', { class: `row ${statusClass} ${error} ${future ? 'future' : 'archive'}`, id: `res-${r.ID}` });
      $row.innerHTML = `
            <div class="status">
                ${status}
            </div>
            <div class="description">
                <span class="name">${r.Name}</span>
                <span class="party">(Party of ${r.Party})</span>
                <span class="message">${r.Message ? '&#11044;' : ''}</span><br>
                <span class="seating">${r.Seating === 'No Preference' ? '' : r.Seating}</span>
                <span class="date">${today ? 'Today' : r.Date} ${timeStr} </span>
            </div>
            `;
      $row.querySelector('.description').addEventListener('click', () => {
        // eslint-disable-next-line no-use-before-define
        editReservation(r);
      });
      $row.querySelector('.status').addEventListener('click', async (evt) => {
        const statuses = ['Not Arrived Yet', 'Arrived', 'Seated'];
        const nextStatus = statuses[(statuses.indexOf(r.Status) + 1) % statuses.length];

        if (nextStatus === 'Arrived' && r.Message) {
          show('#reservation-message');
          document.querySelector('#reservation-message .message-text').innerHTML = r.Message.replace(/\n/g, '<br>');
        }

        const $status = evt.currentTarget;
        $status.innerHTML = `
                <div class="spinner">
                    <div class="bounce1"></div>
                    <div class="bounce2"></div>
                    <div class="bounce3"></div>
                </div>`;

        const conf = await updateStatus(r, nextStatus);
        r.Status = conf.reservation.Status;
        displayReservations();
      });

      $upcoming.appendChild($row);
    }
  });
}

async function updateReservation($form) {
  const res = {};
  Array.from($form.elements).forEach(($e) => {
    res[$e.name] = $e.value;
  });
  const conf = await fetchReservation(res);
  return conf;
}

async function editReservation(res) {
  show('#reservation-details .details');
  hide('#reservation-details .spinner');

  const $details = document.getElementById('reservation-details');
  $details.classList.remove('hidden');
  document.body.classList.add('noscroll');

  const $form = $details.querySelector('form');
  const names = Object.keys(res);
  names.forEach((name) => {
    const $input = $form.elements[name];
    if ($input) {
      $input.value = res[name];
    }
  });

  const cell = (`${res.Cell}`).replace(/\D/g, '');

  $details.querySelector('a.tel').href = `tel:${cell}`;
  $details.querySelector('a.sms').href = `/host-messages#+1${cell}`;

  $details.querySelector('.message-text').innerHTML = res.Message.replace(/\n/g, '<br>');
  console.log(res);

  const $update = $details.querySelector('.update');
  $update.innerHTML = '<button>Update Reservation</button>';
  $update.firstElementChild.addEventListener('click', async () => {
    if ($form.checkValidity()) {
      hide('#reservation-details .details');
      show('#reservation-details .spinner');
      const conf = await updateReservation($form);
      const resNames = Object.keys(conf.reservation);
      resNames.forEach((name) => {
        res[name] = conf.reservation[name];
      });
      $details.classList.add('hidden');
      document.body.classList.remove('noscroll');
      displayReservations();
    } else {
      $form.reportValidity();
    }
  });

  const $cancel = $details.querySelector('.cancel');
  $cancel.innerHTML = '<button>Cancel Reservation</button>';
  $cancel.firstElementChild.addEventListener('click', async () => {
    hide('#reservation-details .details');
    show('#reservation-details .spinner');
    const conf = await updateStatus(res, 'Cancelled');
    const cancelNames = Object.keys(conf.reservation);
    cancelNames.forEach((name) => {
      res[name] = conf.reservation[name];
    });
    $details.classList.add('hidden');
    document.body.classList.remove('noscroll');
    displayReservations();
  });
}

async function initReservations() {
  const $h1 = document.querySelector('h1');
  document.querySelector('#reservations .reservations-header').appendChild($h1);
  document.querySelectorAll('.popup .close').forEach(($close) => {
    const $popup = $close.closest('.popup');
    $close.addEventListener('click', () => {
      $popup.classList.add('hidden');
      document.body.classList.remove('noscroll');
    });
  });

  const $party = document.querySelector('#reservation-details select[name="Party"]');
  const config = await getConfig();
  const minParty = +config.Reservations['Minimum Party Size'];
  const maxParty = +config.Reservations['Maximum Party Size'];
  const defaultParty = +config.Reservations['Default Party Size'];

  let html = '';
  for (let i = minParty; i <= maxParty; i += 1) {
    html += `<option value="${i}" ${i === defaultParty ? 'selected' : ''}>Party of ${i}</option>`;
  }
  $party.innerHTML = html;
}

// eslint-disable-next-line import/prefer-default-export
export async function signedIn() {
  window.embrew.reservations = await fetchReservations();
  displayReservations();
}

window.signedIn = signedIn;

initReservations();
