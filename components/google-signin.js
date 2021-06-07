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
/* global document, window, gapi, signedIn */

import {
  createTag,
} from '../scripts.js';

const link = createTag('meta', { name: 'google-signin-client_id', content: '245973298049-d91dvbh9rhlb49eeuhevk5fdbruf7sl2.apps.googleusercontent.com' });
document.getElementsByTagName('head')[0].appendChild(link);

export function signOut() {
  const auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut().then(() => {
    console.log('User signed out.');
    window.location.reload();
  });
}

export function onSignIn(googleUser) {
  const profile = googleUser.getBasicProfile();
  window.googleUser = {
    name: profile.getName(),
    image: profile.getImageUrl(),
    email: profile.getEmail(),
  };
  console.log(window.googleUser); // This is null if the 'email' scope is not present.
  document.querySelector('.signin-overlay').remove();
  const $signedin = createTag('div', { class: 'signedin' });
  $signedin.innerHTML = `
    <style>
    .signedin {
        display: flex;
        height: 48px;
        width: 200px;
        position: fixed;
        z-index: 1;
        right: 10px;
        top: 10px;
        justify-content: flex-end;
        align-items: center;
    }

    .signedin img {
        margin-left: 5px;
        object-fit: cover;
        width: 48px;
        height: 48px;
        max-width: unset;
        border-radius: 48px;
        border: 2px solid black;
        box-sizing: border-box;
    }
    </style>
    <p><img onclick='signOut()' src="${window.googleUser.image}"><p>`;

  document.body.appendChild($signedin);

  signedIn();
}

window.onSignIn = onSignIn;

const $overlay = createTag('div', { class: 'signin-overlay' });

$overlay.innerHTML = `
    <style>
    .signin-overlay {
    display: flex;
    height: 100vh;
    width: 100vw;
    position: fixed;
    z-index: 1;
    left: 0;
    top: 0;
    background-color: #fff;
    overflow-x: hidden; 
    align-items: center;
    justify-content: center;
  }
  .signin-wrapper {
      height: 50px
      width: 200px;
  }
  </style>
  <div class='signin-wrapper'><div class="g-signin2" data-onsuccess="onSignIn"></div></div>
  `;

document.body.appendChild($overlay);
