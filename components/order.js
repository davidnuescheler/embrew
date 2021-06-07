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
/* global window alert fetch document localStorage SqPaymentForm */

import {
  createTag,
  stashForm,
  getConfig,
  generateId,
  getOpeningHours,
  populateForm,
  areWeClosed,
} from '../scripts.js';

window.embrew.catalog = {};

function formatMoney(num) {
  return (`${(num / 100).toFixed(2)}`);
}

function getCartElems() {
  const $cart = document.getElementById('cart');
  const elems = ['compact', 'full', 'detail', 'order', 'payment', 'confirmation', 'spinner'];
  const c = {};
  c.$cart = $cart;
  elems.forEach((e) => {
    c[`$${e}`] = $cart.querySelector(`div.${e}`);
  });
  return (c);
}

function indexCatalog(data) {
  const cat = window.embrew.catalog;
  cat.byId = [];
  data.forEach((obj) => {
    cat.byId[obj.id] = obj;
    if (obj.type === 'ITEM' && obj.item_data.variations) {
      obj.item_data.variations.forEach((variation) => {
        cat.byId[variation.id] = variation;
      });
    }
  });
}

function showCartState(states) {
  const $cart = document.querySelector('#cart');
  const c = getCartElems();
  $cart.querySelectorAll('.full-inner>div').forEach(($e, i) => { if (i) $e.classList.add('hidden'); });
  states.forEach((state) => c[`$${state}`].classList.remove('hidden'));
}

function getTip(order) {
  const tipPercentage = +document.getElementById('tip').value;
  const tipAmount = Math.round((order.total_money.amount * tipPercentage) / 100);
  return (tipAmount);
}

async function displayThanks(payment) {
  const c = getCartElems();
  const config = await getConfig();

  const phone = config.Location['Phone Number'].replace(/\D/g, '');
  const thanks = config['Online Orders']['Thank You Message'].replace('\n', '<br>');
  console.log(phone);

  showCartState(['confirmation']);
  c.$confirmation.innerHTML = `<h3>${thanks}</h3>
    <a href="tel:+1${phone}">call</a> <a href="sms:+1${phone}">text</a>`;

  console.log(payment);
  window.embrew.cart.clear();
}

async function loadCatalog() {
  const resp = await fetch('https://new.emigrationbrewing.com/catalog.json');
  const data = await resp.json();
  indexCatalog(data);
  return (data);
}

function displayOrder(sqOrder) {
  const { order } = sqOrder;
  const c = getCartElems();
  const $div = createTag('div');
  order.line_items.forEach((li) => {
    const $line = createTag('div', { class: 'line' });
    $line.innerHTML = `
            <div class="quantity">
            ${li.quantity} x
            </div>
            <div class="description">${li.name}<br>
                <span class="modifiers">${li.modifiers ? li.modifiers.map((m) => m.name).join(', ') : ''}</span>
            </div>
            <div class="price">${formatMoney(li.gross_sales_money.amount)}</div>
        `;
    $div.appendChild($line);
  });

  let $line;

  $line = createTag('div', { class: 'line tax' });
  $line.innerHTML = `<div class="quantity"></div>
        <div class="description">Tax</div>
        <div class="price">${formatMoney(order.total_tax_money.amount)}</div>`;
  $div.appendChild($line);

  $line = createTag('div', { class: 'line tip hidden' });
  $line.innerHTML = `<div class="quantity"></div>
        <div class="description">Tip</div>
        <div class="price"></div>`;
  $div.appendChild($line);

  $line = createTag('div', { class: 'line total' });
  $line.innerHTML = `<div class="quantity"></div>
        <div class="description">Total</div>
        <div class="price">${formatMoney(order.total_money.amount)}</div>`;
  $div.appendChild($line);
  c.$order.innerHTML = '';
  c.$order.appendChild($div);
}

function displayPayment(sqOrder) {
  const { order } = sqOrder;
  const c = getCartElems();
  c.$payment.innerHTML = `
    <div class="tip"><select id="tip">
        <option value="0">No Tip</option>
        <option value="10">10%</option>
        <option value="15">15%</option>
        <option value="20">20%</option>
        <option value="25">25%</option>
    </select></div>
    <div id="form-container">
        <div id="sq-card-number"></div>
        <div class="third" id="sq-expiration-date"></div>
        <div class="third" id="sq-cvv"></div>
        <div class="third" id="sq-postal-code"></div>
        <button id="sq-creditcard" class="button-credit-card">Pay with Card</button>
    </div>
    `;

  document.getElementById('tip').addEventListener('change', () => {
    const $tipLine = document.querySelector('#cart .order .line.tip');
    const $total = document.querySelector('#cart .order .line.total .price');
    const tipAmount = getTip(order);
    $tipLine.querySelector('.price').innerHTML = `$${formatMoney(tipAmount)}`;
    $total.innerHTML = `$${formatMoney(order.total_money.amount + tipAmount)}`;
    $tipLine.classList.remove('hidden');
  });

  const paymentForm = new SqPaymentForm({
    applicationId: 'sq0idp--JpSDZuFyxfWWade5X_bUQ',
    inputClass: 'sq-input',
    autoBuild: false,

    inputStyles: [{
      fontSize: '20px',
      lineHeight: '24px',
      padding: '16px',
      placeholderColor: '#a0a0a0',
      backgroundColor: 'transparent',
    }],

    cardNumber: {
      elementId: 'sq-card-number',
      placeholder: 'Card Number',
    },
    cvv: {
      elementId: 'sq-cvv',
      placeholder: 'CVV',
      textAlign: 'center',
    },

    expirationDate: {
      elementId: 'sq-expiration-date',
      placeholder: 'MM/YY',
      textAlign: 'center',
    },

    postalCode: {
      elementId: 'sq-postal-code',
      placeholder: 'Postal',
      textAlign: 'center',
    },

    callbacks: {
      async cardNonceResponseReceived(errors, nonce) {
        if (errors) {
          console.error('Encountered errors:');
          errors.forEach((error) => {
            console.error(`  ${error.message}`);
          });
          // eslint-disable-next-line no-alert
          alert('Encountered errors');
          showCartState(['order', 'payment']);
          return;
        }

        console.log(`The generated nonce is:\n${nonce}`);

        const tipAmount = getTip(order);
        const qs = `nonce=${encodeURIComponent(nonce)}&order_id=${encodeURIComponent(order.id)}&reference_id=${encodeURIComponent(order.reference_id)}&order_amount=${order.total_money.amount}&tip_amount=${tipAmount}`;

        const resp = await fetch(`https://script.google.com/macros/s/AKfycbz1QJwACgsIlWwOXVAhD6ckgNSdKqJeJ7Y9OANkdRk7JIeWPYU1/exec?${qs}`);
        const json = await resp.json();

        if ((typeof json.errors === 'undefined') && json.payment && (json.payment.status === 'COMPLETED')) {
          displayThanks(json.payment);
        } else {
          // eslint-disable-next-line no-alert
          alert('Payment failed to complete!\nCheck card details');
          showCartState(['order', 'payment']);
        }
      },
    },
  });

  document.getElementById('sq-creditcard').addEventListener('click', (evt) => {
    evt.preventDefault();
    showCartState(['spinner']);
    paymentForm.requestCardNonce();
  });

  paymentForm.build();
}

async function submitOrder() {
  const { cart } = window.embrew;

  const order = {};
  // const config = await getConfig();

  order.pickup_at = document.getElementById('time').value;
  order.display_name = document.getElementById('name').value;
  order.cell = document.getElementById('cell').value;
  order.vehicle = document.getElementById('vehicle').value;
  order.reference_id = generateId();

  order.line_items = cart.toSquareOrderLineItems();

  let qs = '?';

  Object.keys(order).forEach((a) => {
    let v = order[a];
    if (typeof v === 'object') v = JSON.stringify(v);
    qs += `${a}=${encodeURIComponent(v)}&`;
  });

  const orderEndpoint = 'https://script.google.com/macros/s/AKfycbz1QJwACgsIlWwOXVAhD6ckgNSdKqJeJ7Y9OANkdRk7JIeWPYU1/exec';

  console.log(qs);
  const resp = await fetch(orderEndpoint + qs);
  const sqOrder = await resp.json();

  console.log(sqOrder);

  displayOrder(sqOrder);
  displayPayment(sqOrder);

  showCartState(['order', 'payment']);
}

function updateCart() {
  const { cart } = window.embrew;
  const cat = window.embrew.catalog;
  const c = getCartElems();
  if (cart.line_items.length) {
    c.$cart.classList.remove('hidden');
  } else {
    c.$cart.classList.add('hidden');
    c.$full.classList.add('hidden');
    c.$compact.classList.remove('hidden');
    document.body.classList.remove('noscroll');
  }

  c.$compact.innerHTML = `Order ${cart.totalItems()} Item${cart.totalItems() === 1 ? '' : 's'} ($${formatMoney(cart.totalAmount())})`;
  const $newDetail = createTag('div');
  $newDetail.innerHTML = '';
  cart.line_items.forEach((li) => {
    const varObj = cat.byId[li.variation];
    const item = cat.byId[varObj.item_variation_data.item_id];
    const $line = createTag('div', { class: 'line' });
    const mods = li.mods.map((mId) => cat.byId[mId].modifier_data.name).join(', ');
    $line.innerHTML = `
                <div class="quantity">
                    <span class="control minus"><svg xmlns="http://www.w3.org/2000/svg" class="icon icon-minus"><use href="/icons.svg#minus"></use></svg></span>
                    <span class="number">${li.quantity}</span>
                    <span class="control plus"><svg xmlns="http://www.w3.org/2000/svg" class="icon icon-minus"><use href="/icons.svg#plus"></use></svg></span>
                    </div>
                <div class="description">${item.item_data.name}<br>
                <span class="modifiers">${mods}</span></div>
                <div class="price">${formatMoney(li.price * li.quantity)}</div>
                <div class="control remove"><svg xmlns="http://www.w3.org/2000/svg" class="icon icon-close"><use href="/icons.svg#close"></use></svg></div>`;
    $newDetail.appendChild($line);
    $line.querySelector('.minus').addEventListener('click', () => {
      cart.minus(li.fp);
      updateCart();
    });
    $line.querySelector('.plus').addEventListener('click', () => {
      cart.plus(li.fp);
      updateCart();
    });
    $line.querySelector('.remove').addEventListener('click', () => {
      cart.remove(li.fp);
      updateCart();
    });
  });
  const $line = createTag('div', { class: 'line total' });
  $line.innerHTML = `<div class="quantity"></div>
        <div class="description">Subtotal</div>
        <div class="price">${formatMoney(cart.totalAmount())}</div>
        <div class="remove"></div>`;

  $newDetail.appendChild($line);

  const $order = createTag('div');
  const $form = document.getElementById('order-form');
  $order.innerHTML = '<button>order</button>';
  $order.querySelector('button').addEventListener('click', () => {
    if ($form.reportValidity()) {
      showCartState(['spinner']);
      stashForm(['name', 'cell', 'vehicle']);
      submitOrder();
    } else {
      c.$full.classList.add('hidden');
      c.$compact.classList.remove('hidden');
    }
  });

  $newDetail.appendChild($order);

  c.$detail.replaceChild($newDetail, c.$detail.firstElementChild);
}

async function initCart() {
  await window.embrew.cart.init();
  const $cart = createTag('div', { id: 'cart', class: 'overlay' });
  $cart.innerHTML = `
        <div class="compact"></div>
        <div class="full hidden">
            <div class="full-inner">
                <div class="close"><svg xmlns="http://www.w3.org/2000/svg" class="icon icon-close"><use href="/icons.svg#close"></use></svg></div>
                <div class="detail"><div></div></div>
                <div class="order"></div>
                <div class="payment"></div>
                <div class="confirmation"></div>
                <div class="spinner">
                    <div class="bounce1"></div>
                    <div class="bounce2"></div>
                    <div class="bounce3"></div>
                </div>
            </div>
        </div>
        `;
  const c = getCartElems();

  document.querySelector('footer').appendChild($cart);
  document.querySelector('footer #cart .close').addEventListener('click', () => {
    c.$full.classList.add('hidden');
    c.$compact.classList.remove('hidden');
    document.body.classList.remove('noscroll');
    updateCart();
  });

  c.$compact.addEventListener('click', () => {
    c.$compact.classList.add('hidden');
    c.$full.classList.remove('hidden');
    document.body.classList.add('noscroll');

    showCartState(['detail']);
  });
  updateCart();
}

async function setPickupTimes(date) {
  const $time = document.getElementById('time');
  $time.innerHTML = '';
  const config = await getConfig();
  const dinnerHours = getOpeningHours(config['Online Dinner Hours']);
  const day = new Date(date);
  const now = new Date();
  let { from, to } = dinnerHours[day.getDay()];
  from = Math.ceil(from);
  to = Math.floor(to);
  for (let hour = from; hour < to; hour += 1) {
    for (let mins = 15; mins <= 60; mins += 15) {
      const time = new Date(day);
      time.setHours(hour, mins, 0);
      if (time.valueOf() - (+config['Online Orders']['Prep Time'] * 60 * 1000) > now.valueOf()) {
        const $option = createTag('option', { value: time.toISOString() });
        $option.innerHTML = `${time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        $time.appendChild($option);
      }
    }
  }
}

async function initOrderForm() {
  document.querySelector('main>div:first-of-type').classList.add('section-wrapper', 'text-only-header');
  const $form = document.getElementById('order-form');
  populateForm($form);

  // init pickup days
  const $date = document.getElementById('date');
  const $time = document.getElementById('time');
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let daysOut = 0; daysOut < 10; daysOut += 1) {
    const day = new Date();
    day.setDate(day.getDate() + daysOut);
    let prefix = '';
    if (daysOut === 0) prefix = 'Today';
    if (daysOut === 1) prefix = 'Tomorrow';
    const $option = createTag('option', { value: `${day.toDateString()}` });
    $option.innerHTML = `${prefix} ${weekdays[day.getDay()].substr(0, 3)} ${day.toLocaleDateString()}`;
    // eslint-disable-next-line no-await-in-loop
    const closed = await areWeClosed(day, 'Orders');
    if (!closed) {
      $date.appendChild($option);
    }
  }
  $date.addEventListener('change', () => {
    setPickupTimes($date.value);
    console.log('date change');
  });
  await setPickupTimes($date.value);
  if ($time.options.length === 0) {
    $date.firstElementChild.remove();
    await setPickupTimes($date.value);
  }
}

function showItemConfig(item) {
  const cat = window.embrew.catalog;

  let $itemConfig = document.getElementById('item-config');
  if (!$itemConfig) {
    $itemConfig = createTag('div', { id: 'item-config', class: 'overlay hidden' });
    document.querySelector('footer').appendChild($itemConfig);
  }

  const vars = item.item_data.variations;
  const mlists = item.item_data.modifier_list_info;

  let html = `<div>
        <div class="close"><svg xmlns="http://www.w3.org/2000/svg" class="icon icon-close"><use href="/icons.svg#close"></use></svg></div>
        <h3>Customize your ${item.item_data.name}</h3>`;

  html += '<select id="variation">';
  vars.forEach((v) => {
    html += `<option value="${v.id}">${v.item_variation_data.name} ($${formatMoney(v.item_variation_data.price_money.amount)})</option>`;
  });
  html += '</select>';

  mlists.forEach((mlist) => {
    const ml = cat.byId[mlist.modifier_list_id];
    html += `<h4>${ml.modifier_list_data.name}</h4>`;
    if (ml.modifier_list_data.selection_type === 'SINGLE') {
      html += '<select>';
      const mods = ml.modifier_list_data.modifiers;
      mods.forEach((m) => {
        html += `<option value="${m.id}">${m.modifier_data.name} (+$${formatMoney(m.modifier_data.price_money.amount)})</option>`;
      });
      html += '</select>';
    } else {
      html += '<div class="checkboxes">';
      const mods = ml.modifier_list_data.modifiers;
      mods.forEach((m) => {
        html += `<label class="checkbox">${m.modifier_data.name} (+$${formatMoney(m.modifier_data.price_money.amount)})<input type="checkbox" value="${m.id}"><span class="checkmark"></span></label>`;
      });
      html += '</div>';
    }
  });

  html += '<button class="add-to-order">Add to order</button>';

  html += '</div>';
  $itemConfig.innerHTML = html;

  const $variation = document.getElementById('variation');
  if ($variation.options.length === 1) $variation.classList.add('hidden');

  $itemConfig.querySelector('.close').addEventListener('click', () => {
    $itemConfig.classList.add('hidden');
    document.body.classList.remove('noscroll');
  });

  $itemConfig.querySelector('.add-to-order').addEventListener('click', () => {
    const variation = $variation.value;
    const mods = [];

    $itemConfig.querySelectorAll('select').forEach(($s) => {
      if ($s.id !== 'variation') {
        mods.push($s.value);
      }
    });

    $itemConfig.querySelectorAll('input[type="checkbox"]:checked').forEach(($c) => {
      mods.push($c.value);
    });

    const { cart } = window.embrew;
    cart.add(variation, mods);
    updateCart();

    console.log(`adding config: ${variation} : ${mods}`);

    $itemConfig.classList.add('hidden');
    document.body.classList.remove('noscroll');
  });

  $itemConfig.classList.remove('hidden');
  document.body.classList.add('noscroll');
}

// eslint-disable-next-line no-unused-vars
function addToCart(itemId) {
  const cat = window.embrew.catalog;
  const { cart } = window.embrew;
  const item = cat.byId[itemId];
  const vars = item.item_data.variations;
  const mlists = item.item_data.modifier_list_info;
  if (vars.length === 1 && !mlists) {
    const variationId = item.item_data.variations[0].id;
    cart.add(variationId);
    updateCart();
  } else {
    showItemConfig(item);
  }
}

window.embrew.cart = {
  line_items: [],
  remove: (fp) => {
    const { cart } = window.embrew;
    const index = cart.line_items.findIndex((li) => fp === li.fp);
    cart.line_items.splice(index, 1);
    cart.store();
  },
  add: (variation, mods) => {
    const { cart } = window.embrew;
    const { catalog } = window.embrew;
    // eslint-disable-next-line no-param-reassign
    if (!mods) mods = [];
    const li = cart.find(variation, mods);
    if (li) {
      cart.plus(li.fp);
    } else {
      let fp = variation;
      const varObj = catalog.byId[variation];
      let price = varObj.item_variation_data.price_money.amount;
      mods.forEach((m) => { fp += `-${m}`; price += catalog.byId[m].modifier_data.price_money.amount; });
      cart.line_items.push({
        fp, variation, mods, price, quantity: 1,
      });
    }
    cart.store();
  },
  find: (variation, mods) => {
    const { cart } = window.embrew;
    let fp = variation;
    mods.forEach((m) => { fp += `-${m}`; });
    return cart.line_items.find((li) => fp === li.fp);
  },

  plus: (fp) => {
    const { cart } = window.embrew;
    const index = cart.line_items.findIndex((li) => fp === li.fp);
    if (cart.line_items[index].quantity < 9) cart.line_items[index].quantity += 1;
    cart.store();
  },

  minus: (fp) => {
    const { cart } = window.embrew;
    const index = cart.line_items.findIndex((li) => fp === li.fp);
    cart.line_items[index].quantity -= 1;
    if (!cart.line_items[index].quantity) cart.remove(fp);
    cart.store();
  },
  setQuantity: (fp, q) => {
    const { cart } = window.embrew;
    const index = cart.line_items.findIndex((li) => fp === li.fp);
    cart.line_items[index].quantity = q;
    cart.store();
  },
  totalAmount: () => {
    const { cart } = window.embrew;
    let total = 0;
    cart.line_items.forEach((li) => {
      total += li.price * li.quantity;
    });
    return (total);
  },
  totalItems: () => {
    const { cart } = window.embrew;
    let total = 0;
    cart.line_items.forEach((li) => {
      total += li.quantity;
    });
    return (total);
  },
  clear: () => {
    const { cart } = window.embrew;
    cart.line_items = [];
    cart.store();
  },

  store: () => {
    const { cart } = window.embrew;
    localStorage.setItem('cart', JSON.stringify({ lastUpdate: new Date(), line_items: cart.line_items }));
  },

  toSquareOrderLineItems: () => {
    const { cart } = window.embrew;
    return (cart.line_items.map((li) => ({
      catalog_object_id: li.variation,
      quantity: `${li.quantity}`,
      modifiers: li.mods.map((m) => ({ catalog_object_id: m })),
    }))
    );
  },

  load: () => {
    const { cart } = window.embrew;
    const { catalog } = window.embrew;
    const cartobj = JSON.parse(localStorage.getItem('cart'));
    cart.line_items = [];

    if (cartobj && cartobj.line_items) {
      // validate
      cartobj.line_items.forEach((li) => {
        if (catalog.byId[li.variation]) {
          let push = true;
          li.mods.forEach((m) => {
            if (!catalog.byId[m]) push = false;
          });
          if (push) cart.line_items.push(li);
        }
      });
    }
  },

  init: async () => {
    await loadCatalog();
    window.embrew.cart.load();
  },
};

initOrderForm();
initCart();
document.body.classList.add('order');
