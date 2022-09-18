export default async function decorate(block) {
  const del = block.querySelector('del');
  if (del) {
    const h1 = del.closest('h1');
    h1.remove();
  }
}
