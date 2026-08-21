/**
 * Private event enquiry form — posts to formsubmit.co (events@emigrationbrewing.com).
 * @param {HTMLElement} widget
 */
export default function decorate(widget) {
  const form = widget.querySelector('.pe-form');
  if (!form) return;

  const status = form.querySelector('.pe-status');
  const submitBtn = form.querySelector('button[type="submit"]');
  const endpoint = 'https://formsubmit.co/ajax/events@emigrationbrewing.com';

  function showSuccess() {
    const panel = document.createElement('div');
    panel.className = 'pe-success';
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = `
      <p class="pe-success-eyebrow">Enquiry received</p>
      <h3 class="pe-success-title">Thank you — we can&rsquo;t wait to host you.</h3>
      <p class="pe-success-body">We&rsquo;re looking forward to working with you to make it a special event. Someone from our team will be in touch within one business day.</p>
      <p class="pe-success-hint">Need us sooner? Call <a href="tel:3853855605">(385) 385-5605</a> or email <a href="mailto:events@emigrationbrewing.com">events@emigrationbrewing.com</a>.</p>
    `;
    form.replaceWith(panel);
    panel.focus?.();
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const honey = form.querySelector('[name="_honey"]');
    if (honey?.value) return;

    const data = new FormData(form);
    data.set('_subject', 'Private Event Enquiry — Emigration Brewing');
    data.set('pageUrl', window.location.href);

    const original = submitBtn?.innerHTML;
    [...form.elements].forEach((el) => { el.disabled = true; });
    if (submitBtn) submitBtn.textContent = 'Sending…';
    if (status) {
      status.hidden = true;
      status.textContent = '';
      status.classList.remove('is-error');
    }

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) throw new Error(`Submit failed (${resp.status})`);
      showSuccess();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Private event form submission failed', err);
      [...form.elements].forEach((el) => { el.disabled = false; });
      if (submitBtn && original) submitBtn.innerHTML = original;
      if (status) {
        status.hidden = false;
        status.classList.add('is-error');
        status.textContent = 'Something went wrong. Please email events@emigrationbrewing.com or call (385) 385-5605.';
      }
    }
  });
}
