// eslint-disable-next-line import/no-cycle
import { sampleRUM } from './scripts.js';

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

loadScript('https://www.googletagmanager.com/gtag/js?id=UA-137014746-1', () => {
  window.dataLayer = window.dataLayer || [];
  function gtag(...args) {
    window.dataLayer.push(args);
  }
  gtag('js', new Date());
  gtag('config', 'UA-137014746-1');
});
