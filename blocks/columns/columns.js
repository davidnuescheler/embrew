/**
 * Columns block — split layout matching v2 story section.
 * Image cells: plain text ahead of a picture becomes an overlay tag.
 */

function decorateImageColumn(col) {
  const picture = col.querySelector('picture');
  if (!picture) return false;

  col.classList.add('columns-img');

  const picWrap = picture.closest('p') || picture;
  let tagSource = null;

  [...col.children].some((child) => {
    if (child === picWrap || child.contains(picture)) return true;
    if (
      child.tagName === 'P'
      && !child.querySelector('a, picture, img')
      && !child.classList.contains('button-container')
      && child.textContent.trim()
    ) {
      tagSource = child;
    }
    return false;
  });

  if (picWrap.tagName === 'P') picWrap.replaceWith(picture);

  if (tagSource) {
    const tag = document.createElement('div');
    tag.className = 'columns-tag';
    tag.textContent = tagSource.textContent.trim();
    tagSource.remove();
    col.append(tag);
  }

  return true;
}

function decorateCopyColumn(col) {
  col.classList.add('columns-copy');

  const heading = col.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading?.tagName === 'H2') heading.classList.add('big');

  col.querySelectorAll(':scope > p').forEach((p) => {
    if (p.classList.contains('eyebrow') || p.classList.contains('button-container')) return;
    if (p.querySelector('picture, img')) return;
    p.classList.add('lede');
  });
}

/**
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;

  const cols = [...row.children];
  block.classList.add(`columns-${cols.length}-cols`);

  cols.forEach((col) => {
    if (!decorateImageColumn(col)) decorateCopyColumn(col);
  });

  if (cols[0]?.classList.contains('columns-img')) {
    block.classList.add('columns-rev');
  }
}
