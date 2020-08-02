function createTag(name, attrs) {
    const el = document.createElement(name);
    if (typeof attrs === 'object') {
      for (let [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, value);
      }
    }
    return el;
  }
  
function wrapDivs() {
    document.querySelectorAll('main>div').forEach(($div) => {
        $wrapper=createTag('div', { class: 'section-wrapper'});
        $div.parentNode.appendChild($wrapper);
        $wrapper.appendChild($div);
    });
}


function decorateSquareLinks() {
    document.querySelectorAll('main a[href^="https://squareup.com/dashboard/items/library/"]').forEach(($a) => {
        const href=$a.getAttribute('href');
        const splits=href.split('/');
        const itemId=splits[6]
        $a.removeAttribute('href');
        $a.classList.add('add-to-order');
        $a.addEventListener('click', (evt) => {
            addToCart(itemId)
        })
    })
}

function decoratePage() {
    console.log ('decorate Page');
    wrapDivs();
    decorateSquareLinks();
}

window.embrew={};

document.addEventListener('DOMContentLoaded', (evt) => {
    decoratePage();
})