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
/* global alert, document, fetch, window, localStorage  */

import {
  populateForm,
  wrapSections,
  getDate,
  areWeClosed,
  createTag,
  isSameDate,
  getConfig,
  getOpeningHours,
  stashForm,
  timeToHours,
} from '../scripts.js';

async function fetchReservation(reservation) {
  let qs = '?';

  Object.keys(reservation).forEach((a) => {
    const v = reservation[a];
    qs += `${a}=${encodeURIComponent(v)}&`;
  });

  const reservationEndpoint = 'https://thinktanked.org/cgi-bin/reservations';

  const resp = await fetch(reservationEndpoint + qs);
  const confirmed = await resp.json();
  // eslint-disable-next-line no-console
  console.log(confirmed);
  return confirmed;
}

async function getReservations() {
  const now = new Date();
  const resp = await fetch(`/reservations.json?limit=${now.getMonth()}${now.getDate()}${now.getHours()}`);
  const json = await resp.json();
  if (json.data) {
    return (json.data);
  }
  return (json);
}

function filterReservationsByDate(reservations, date) {
  const filterDate = new Date(date);
  return reservations.filter((r) => {
    if (!r.Time) r.Time = '7:00 PM';
    const resDate = getDate(r.Date, r.Time);
    return (isSameDate(resDate, filterDate));
  });
}

async function fetchReservationSchedule() {
  const resp = await fetch('/reservation-schedule.json');
  const json = await resp.json();
  return (json.data);
}
// eslint-disable-next-line no-unused-vars
async function checkReservationTimesAvailability(date, $time, partySize) {
  // eslint-disable-next-line no-unused-vars
  const config = await getConfig();
  const reservations = await getReservations();
  // eslint-disable-next-line no-unused-vars
  const daysRes = filterReservationsByDate(reservations, date);

  const sched = await fetchReservationSchedule();

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekday = weekdays[new Date(date).getDay()];
  const slots = [];
  for (let i = 0; i < 48; i += 1) {
    slots.push({ hours: i / 2, seats: 0 });
  }
  sched.forEach((slot) => {
    const hours = slot.Time * 24;
    const index = Math.round(hours * 2);
    const seats = slot[weekday];
    if (seats) {
      slots[index].seats = seats;
      slots[index].maxSeats = seats;
      if (window.name.includes('debug')) {
        console.log(`slots ${hours}:${index}:${seats}`);
      }
    } else {
      slots[index].seats = 0;
      slots[index].maxSeats = 0;
    }
  });

  if (window.name.includes('debug')) {
    console.log(slots);
  }

  // removing reservations from slots
  daysRes.forEach((res) => {
    const hours = timeToHours(res.Time);
    const index = Math.floor(hours * 2);
    slots[index].seats -= res.Party;
    slots[index + 1].seats -= res.Party;
  });

  if (window.name.includes('debug')) {
    console.log(slots);
  }

  let slotsAvailable = 0;
  [...$time.options].forEach(($o) => {
    // eslint-disable-next-line no-console
    const index = Math.floor(+$o.getAttribute('data-hours') * 2);
    if (window.name.includes('debug')) {
      console.log(`capacity ${slots[index].seats} @ ${$o.value} - ${partySize}`);
    }
    if (slots[index].seats < partySize || slots[index + 1].seats < partySize) {
      if (window.name.includes('debug')) {
        console.log(`removing ${$o.value}`);
      }
      if ((slots[index].maxSeats === 0) || (slots[index + 1].maxSeats === 0)) {
        $o.remove();
      } else {
        $o.setAttribute('disabled', '');
        $o.innerHTML += ' (Fully Booked)';
      }
    } else {
      if (!slotsAvailable) $o.setAttribute('selected', '');
      slotsAvailable += 1;
    }
  });
  return (slotsAvailable);
}

async function setReservationTimes(date) {
  const $time = document.getElementById('time');
  $time.innerHTML = '';
  const config = await getConfig();
  const reservationHours = getOpeningHours(config['Reservation Hours']);
  const day = new Date(date);
  const now = new Date();
  const { from, to } = reservationHours[day.getDay()];
  for (let hour = from; hour < (to - (+config.Reservations['Last Seating'])); hour += 1) {
    console.log(hour, config.Reservations['Last Seating'], to);
    for (let mins = 0; mins <= 45; mins += 15) {
      const time = new Date(day);
      time.setHours(hour, mins, 0);
      if (time.valueOf() > now.valueOf()) {
        const timeStr = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const $option = createTag('option', { value: timeStr, 'data-hours': hour + (mins / 60) });
        $option.innerHTML = `${timeStr}`;
        $time.appendChild($option);
      }
    }
  }
  const $party = document.getElementById('party');
  const $seating = document.getElementById('seating');

  const avail = await checkReservationTimesAvailability(date, $time, $party.value, $seating.value);
  return (avail);
}

async function displayReservation(reservation) {
  const config = await getConfig();
  const $confirmation = document.getElementById('reservation-confirmation');
  window.scrollTo(0, 0);
  $confirmation.innerHTML = `
        <div class="spinner">
            <div class="bounce1"></div>
            <div class="bounce2"></div>
            <div class="bounce3"></div>
        </div>`;
  $confirmation.classList.remove('collapsed');

  const confRes = await fetchReservation(reservation);
  if (confRes.reservation) {
    const r = confRes.reservation;
    window.location.hash = r.ID;
    const humanPhone = config.Location['Phone Number'];
    const phone = config.Location['Phone Number'].replace(/\D/g, '');
    if (r.Status === 'Cancelled') {
      $confirmation.innerHTML = `<div><h3>Cancelled</h3>
      <p>This reservation has been cancelled, feel free to make a new reservation or 
      give us a <a href="tel:${phone}">call</a> or <a href="sms:${phone}">text</a> us at <nobr>${humanPhone}</nobr> if you have any questions.</p>
      </div>`;
      localStorage.removeItem('upcoming-reservation');
    } else {
      $confirmation.innerHTML = `<div><h3>Confirmed</h3>
      <p>We got your reservation for a party of ${r.Party} on <nobr>${r.Date}</nobr> at <nobr>${r.Time}</nobr> under <nobr>${r.Name}</nobr></p>
      <p><button>Cancel this Reservation</button></p>
      <p>Please give us a <a href="tel:${phone}">call</a> or <a href="sms:${phone}">text</a> us at <nobr>${humanPhone}</nobr> if you have any questions.</p>
      </div>`;
      const $cancel = $confirmation.querySelector('button');
      $cancel.addEventListener('click', async () => {
        $confirmation.innerHTML = `
      <div class="spinner">
          <div class="bounce1"></div>
          <div class="bounce2"></div>
          <div class="bounce3"></div>
      </div>`;
        r.Status = 'Cancelled';
        r.UpdatedBy = r.Name;
        const cancelled = await fetchReservation(r);
        console.log(cancelled);
        localStorage.removeItem('upcoming-reservation');
        $confirmation.classList.add('collapsed');
        window.location.hash = '';
      });
      localStorage.setItem('upcoming-reservation', JSON.stringify({ ID: r.ID, Date: r.Date }));
    }
  } else {
    const humanPhone = config.Location['Phone Number'];
    const phone = config.Location['Phone Number'].replace(/\D/g, '');
    $confirmation.innerHTML = `<div><h3>Oops, something went wrong</h3>
            <p>Please give us a <a href="tel:${phone}">call</a> or <a href="sms:${phone}">text</a> us at <nobr>${humanPhone}</nobr></p>
            </div>`;
  }
}

async function submitReservation() {
  const reservation = {};
  const $time = document.getElementById('time');
  reservation.Time = $time.value;
  const resTimeDisabled = $time.options[$time.selectedIndex].hasAttribute('disabled');
  reservation.Date = document.getElementById('date').value;
  reservation.Name = document.getElementById('name').value;
  reservation.Cell = document.getElementById('cell').value;
  reservation.Party = document.getElementById('party').value;
  reservation.Message = document.getElementById('message').value;
  reservation.Seating = document.getElementById('seating').value;

  if (!reservation.Time || resTimeDisabled) {
    // eslint-disable-next-line no-alert
    alert("Something went wrong. We are sorry but we couldn't find an available timeslot on that day.");
    return;
  }

  stashForm(['name', 'cell']);

  displayReservation(reservation);
}

async function initReservationForm() {
  const $form = document.getElementById('reservation-form');
  populateForm($form);

  const $reserve = document.getElementById('reserve');
  $reserve.addEventListener('click', () => {
    submitReservation();
  });

  wrapSections('main>div:first-of-type');

  // init reservation days
  const $party = document.getElementById('party');
  const $date = document.getElementById('date');
  const $time = document.getElementById('time');
  // eslint-disable-next-line no-unused-vars
  const $seating = document.getElementById('seating');
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let daysOut = 0; daysOut < 30; daysOut += 1) {
    const day = new Date();
    day.setDate(day.getDate() + daysOut);
    let prefix = '';
    if (daysOut === 0) prefix = 'Today';
    if (daysOut === 1) prefix = 'Tomorrow';
    const $option = createTag('option', { value: `${day.toDateString()}` });
    $option.innerHTML = `${prefix} ${weekdays[day.getDay()].substr(0, 3)} ${day.toLocaleDateString()}`;
    // eslint-disable-next-line no-await-in-loop
    if (!await areWeClosed(day, 'Reservations')) $date.appendChild($option);
  }
  $date.addEventListener('change', () => {
    setReservationTimes($date.value);
  });

  const config = await getConfig();
  const minParty = +config.Reservations['Minimum Party Size'];
  const maxParty = +config.Reservations['Maximum Party Size'];
  const defaultParty = +config.Reservations['Default Party Size'];

  let html = '';
  for (let i = minParty; i <= maxParty; i += 1) {
    html += `<option value="${i}" ${i === defaultParty ? 'selected' : ''}>Party of ${i}</option>`;
  }
  $party.innerHTML = html;
  $party.addEventListener('change', () => {
    setReservationTimes($date.value);
  });

  await setReservationTimes($date.value);
  console.log(`options: ${[...$time.options].length}`);
  if ($time.options.length === 0) {
    $date.firstElementChild.remove();
    setReservationTimes($date.value);
  }
}

function moveConfirmationToTop() {
  const $confirmation = document.getElementById('reservation-confirmation');
  document.querySelector('main').prepend($confirmation);
}

function checkForUpcomingReservation() {
  const upcoming = JSON.parse(localStorage.getItem('upcoming-reservation'));
  const resID = window.location.hash.substr(1);

  if (upcoming) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const upcomingDate = getDate(upcoming.Date, '11:00 PM');

    if (upcomingDate < tomorrow) {
      localStorage.removeItem('upcoming-reservation');
    } else {
      displayReservation({ ID: upcoming.ID });
    }
  }

  if (resID) {
    displayReservation({ ID: resID });
  }
}

initReservationForm();
moveConfirmationToTop();
checkForUpcomingReservation();
