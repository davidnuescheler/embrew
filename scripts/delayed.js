// eslint-disable-next-line import/no-cycle
import { sampleRUM } from './aem.js';

const loadScript = (url, callback, type) => {
  const head = document.querySelector('head');
  const script = document.createElement('script');
  script.src = url;
  if (type) {
    script.setAttribute('type', type);
  }
  script.onload = callback;
  head.append(script);
  return script;
};

// Core Web Vitals RUM collection
sampleRUM('cwv');

loadScript('https://www.googletagmanager.com/gtag/js?id=G-NCCQJ1BZ66', () => {
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  function gtag() { window.dataLayer.push(arguments); }
  gtag('js', new Date());

  gtag('config', 'G-NCCQJ1BZ66');
});
