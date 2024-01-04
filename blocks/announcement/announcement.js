export default async function decorate(block) {
  if (sessionStorage.getItem('announcement') === 'closed') {
    block.remove();
    return;
  }
  const close = document.createElement('button');
  close.classList.add('announcement-close');
  close.innerHTML = '&times;';
  close.addEventListener('click', () => {
    sessionStorage.setItem('announcement', 'closed');
    block.remove();
  });
  block.prepend(close);
}
