export default async function decorate(block) {
  if (sessionStorage.getItem('announcement') !== 'closed') {
    const close = document.createElement('button');
    close.classList.add('announcement-close');
    close.innerHTML = '&times;';
    close.addEventListener('click', () => {
      sessionStorage.setItem('announcement', 'closed');
      block.parentNode.classList.remove('announcement-popped');
      close.remove();
    });
    block.prepend(close);
    block.parentNode.classList.add('announcement-popped');
  }
}
