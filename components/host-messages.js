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
  createTag,
} from '../scripts.js';

const $section = document.querySelector('script[src="/components/host-messages.js"').closest('div');
const $endpoint = $section.querySelector('a');
const endpoint = $endpoint.href;

window.embrew.messagesEndpoint = endpoint;

$endpoint.parentNode.remove();

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

// eslint-disable-next-line no-unused-vars
function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = {
    year: 31536000, month: 2592000, day: 86400, hour: 3600, minute: 60, second: 1,
  };
  let ago = '';

  const keys = Object.keys(intervals);

  for (let i = 0; i < keys.length; i += 1) {
    const name = keys[i];
    const interval = intervals[name];
    const amount = Math.floor(seconds / interval);
    ago = `${amount} ${name}${amount === 1 ? '' : 's'}`;
    if (amount > 1) break;
  }
  return ago;
}

async function fetchThreads() {
  const config = await getConfig();
  const resp = await fetch(window.embrew.messagesEndpoint);
  const { actions } = await resp.json();

  let threads = [];
  const threadobj = {};
  const ownNumber = `+1${config.Location['Phone Number'].replace(/\D/g, '')}`;

  actions.forEach((action) => {
    if (action.Timestamp) {
      let threadid = '';
      if (action.From === ownNumber) threadid = action.To;
      else threadid = action.From;

      if (!threadobj[threadid]) {
        threadobj[threadid] = { number: threadid, messages: [] };
      }

      const thread = threadobj[threadid];
      if (action.From === ownNumber) action.FromMe = true;
      thread.messages.push(action);
      if (action.Name) {
        thread.name = action.Name;
      }
      thread.lastUpdate = new Date(action.Timestamp);
      thread.id = threadid;
    }
  });

  threads = Object.values(threadobj);
  threads = threads.sort((a, b) => (b.lastUpdate - a.lastUpdate));
  return threads;
}

function updateThreadMessages(thread, $threadMessages, autoscroll) {
  $threadMessages.innerHTML = '';

  let lastDate = '';
  thread.messages.forEach((m) => {
    const $div = createTag('div');

    const time = shortTime(new Date(m.Timestamp));
    if (time.substr(0, 3) !== lastDate.substr(0, 3)) {
      $div.innerHTML = `<p class="timestamp">${time}</p>`;
    }

    lastDate = time;

    const body = m.Body.replace(/\n/g, '<br>');
    $div.innerHTML += `<p class="message ${m.FromMe ? 'me' : ''}">${body}</p>`;
    $threadMessages.appendChild($div);
  });

  if (autoscroll) $threadMessages.scrollTop = $threadMessages.scrollHeight;
}

function formatPhoneNumber(number) {
  let formatted = '';
  if (number.startsWith('+1')) {
    formatted = `(${number.substr(2, 3)}) ${number.substr(5, 3)}-${number.substr(8, 4)}`;
  }
  return (formatted);
}

async function sendMessage(thread, message) {
  const config = await getConfig();
  const ownNumber = `+1${config.Location['Phone Number'].replace(/\D/g, '')}`;
  const action = {
    Timestamp: new Date(), From: ownNumber, To: thread.number, FromMe: true, Body: message,
  };
  thread.messages.push(action);
  // eslint-disable-next-line no-use-before-define
  displayThread(thread);
  document.getElementById('messages').classList.add('sending');

  const qs = new URLSearchParams(action).toString();

  const resp = await fetch(`${window.embrew.messagesEndpoint}?${qs}`);
  const json = await resp.json();
  console.log(json);
  document.getElementById('messages').classList.remove('sending');
}

function displayThread(thread) {
  const $messages = document.getElementById('messages');

  if ($messages.classList.contains('sending')) return;
  window.location.hash = thread.number;
  $messages.classList.add('show-thread');

  const $thread = document.getElementById('thread');
  const $threadMessages = $thread.querySelector('.thread-messages');
  const autoscroll = $threadMessages.scrollTop
    + $threadMessages.clientHeight === $threadMessages.scrollHeight;

  const $name = $thread.querySelector('.thread-info .name');
  const $number = $thread.querySelector('.thread-info .number');

  $name.innerHTML = thread.name ? thread.name : '';
  $number.innerHTML = formatPhoneNumber(thread.number);

  const $oldSendMessage = document.getElementById('send-message');
  const $sendMessage = $oldSendMessage.cloneNode(true);

  $sendMessage.addEventListener('click', () => {
    const $textarea = document.getElementById('thread-response');
    const message = $textarea.value;
    $textarea.value = '';
    sendMessage(thread, message);
  });

  $oldSendMessage.parentNode.replaceChild($sendMessage, $oldSendMessage);

  updateThreadMessages(thread, $threadMessages, autoscroll);
}

async function updateThreads() {
  const $messages = document.getElementById('messages');
  if (!$messages.classList.contains('sending')) {
    const threads = await fetchThreads();
    const $threads = document.getElementById('threads');
    $threads.innerHTML = '';
    const threadid = window.location.hash.substr(1);
    threads.forEach((t) => {
      const $div = createTag('div');
      $div.innerHTML = `<div><h4>${t.name ? t.name : formatPhoneNumber(t.number)}</h4><span>${shortTime(t.lastUpdate)}</span></div>
            <p>${t.messages[t.messages.length - 1].Body}</p>`;
      $threads.appendChild($div);
      $div.addEventListener('click', () => {
        displayThread(t);
      });
      if (t.number === threadid) {
        displayThread(t);
      }
    });
  }

  setTimeout(updateThreads, 5000);
}

// eslint-disable-next-line import/prefer-default-export
export function signedIn() {
  updateThreads();
}

window.signedIn = signedIn;

wrapSections('main>div:first-of-type');
document.querySelector('main>div:first-of-type').classList.add('section-wrapper', 'text-only-header');

const $h1 = document.querySelector('h1');
document.querySelector('#messages .messages-header').appendChild($h1);
$h1.addEventListener(('click'), () => {
  document.getElementById('messages').classList.remove('show-thread');
  window.location.hash = '';
  document.getElementById('thread').removeAttribute('data-scrolltop');
});
