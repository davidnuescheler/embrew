function createTag(name, attrs) {
    const el = document.createElement(name);
    if (typeof attrs === 'object') {
      for (let [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, value);
      }
    }
    return el;
  }  
  
function wrapSections(element) {
    document.querySelectorAll(element).forEach(($div) => {
        if (!$div.id) {
            const $wrapper=createTag('div', { class: 'section-wrapper'});
            $div.parentNode.appendChild($wrapper);
            $wrapper.appendChild($div);    
        }
    });
}

function decorateBackgroundSections() {
    document.querySelectorAll('main div.section-wrapper>div>:first-child>img').forEach(($headerImg) => {
        if ($headerImg) {
            const src=$headerImg.getAttribute('src');
            $wrapper=$headerImg.closest('.section-wrapper');
            $wrapper.style.backgroundImage=`url(${src})`;
            $headerImg.parentNode.remove();
            $wrapper.classList.add('bg-image');
        }    
    });

    $hero=document.querySelector('main>div.section-wrapper');
    if ($hero.classList.contains('bg-image')) $hero.classList.add('hero');
}

function decorateImageOnlySections() {
    document.querySelectorAll('main div.section-wrapper>div>img').forEach(($img) => {
        $wrapper=$img.closest('.section-wrapper');
        $wrapper.classList.add('image-only');
    });
}

function stashForm(ids) {
    ids.forEach((id) => {
        const value=document.getElementById(id).value;
        localStorage.setItem(id, value);
    });
}

function getOpeningHours(section) {
    const weekdays=['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', `Friday`, 'Saturday'];
    const openingHours=weekdays.map((day) => {
        const usTime=section[day];
        const ampms=usTime.split('-');
        [from, to]=ampms.map((ampm) => {
            let plus=0;
            if(ampm.includes('pm')) plus=12;
            return (+ampm.replace(/\D+/g, '')+plus)
        })
        return ({from, to});
    });
    return openingHours;
}

function generateId () {
    let id="";
    const chars="123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i=0;i<5;i++) {
        id+=chars.substr(Math.floor(Math.random()*chars.length),1);
    }
    return id;
}

function populateForm($form) {
    $form.querySelectorAll('input').forEach(($input)=>{
        const id=$input.id;
        if (id) {
            const value=localStorage.getItem(id);
            if (value) $input.value=value;
        }
    });
}

function toClassName(name) {
    return (name.toLowerCase().replace(/[^0-9a-z]/gi, '-'))
  }
  
function decorateTables() {
    document.querySelectorAll('main div>table').forEach(($table) => {
        const $cols=$table.querySelectorAll('thead tr th');
        const cols=Array.from($cols).map((e) => toClassName(e.innerHTML));
        const $rows=$table.querySelectorAll('tbody tr');
        let $div={};

        if (cols.length==1 && $rows.length==1) {
            $div=createTag('div', {class:`${cols[0]}`});
            $div.innerHTML=$rows[0].querySelector('td').innerHTML;
        } else {
            $div=turnTableSectionIntoCards($table, cols) 
        }
        $table.parentNode.replaceChild($div, $table);
    });
}
  
function turnTableSectionIntoCards($table, cols) {
    const $rows=$table.querySelectorAll('tbody tr');
    const $cards=createTag('div', {class:`cards ${cols.join('-')}`})
    $rows.forEach(($tr) => {
        const $card=createTag('div', {class:'card'})
        $tr.querySelectorAll('td').forEach(($td, i) => {
            const $div=createTag('div', {class: cols[i]});
            const $a=$td.querySelector('a[href]');
            if ($a && $a.getAttribute('href').startsWith('https://www.youtube.com/')) {
                const yturl=new URL($a.getAttribute('href'));
                const vid=yturl.searchParams.get('v');
                $div.innerHTML=`<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><iframe src="https://www.youtube.com/embed/${vid}?rel=0" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" allowfullscreen scrolling="no" allow="encrypted-media; accelerometer; gyroscope; picture-in-picture"></iframe></div>`;
            } else {
                $div.innerHTML=$td.innerHTML;
            }
            $card.append($div);
        });
        $cards.append($card);
    });
    return ($cards);
}



function decorateSquareLinks() {
    document.querySelectorAll('main a[href^="https://squareup.com/dashboard/items/library/"]').forEach(($a) => {
        const href=$a.getAttribute('href');
        const splits=href.split('/');
        const itemId=splits[6]
        $a.removeAttribute('href');
        $a.classList.add('add-to-order');
        $a.addEventListener('click', (evt) => {
            addToCart(itemId);
        })
    })
}

function hideTitle() {
    if (window.location.pathname=='/') {
        document.querySelector('main h1').remove();
    }
}

function decoratePhoneLinks() {
    ['tel','sms'].forEach((p) => {
        document.querySelectorAll(`a[href*="/${p}/"]`).forEach(($a) => {
            $a.href=`${p}:`+$a.href.split(`/${p}/`)[1];
        })
    })
}

function decoratePage() {
    wrapSections('main>div');
    decorateBackgroundSections();
    decorateImageOnlySections();
    decorateSquareLinks();
    decorateTables();
    decoratePhoneLinks();
    hideTitle();
}


function getDate(date, time) {
    const months=['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateSegs=date.split(' ');
    const timeSegs=time.split(' ');
    const hoursMins=timeSegs[0].split(':');

    const hour=+hoursMins[0]+(timeSegs[1]=='PM'?12:0);
    const mins=+hoursMins[1];

    const dateAndTime=new Date(+dateSegs[3], months.indexOf(dateSegs[1]), +dateSegs[2], hour, mins);
    console.log(dateAndTime, date+'->'+time);

    return (dateAndTime);

}


async function getConfig() {
    if (!window.embrew.config) {
        const config={}
        const resp=await fetch('/configuration.json');
        let rawJSON=await resp.json();
        if (rawJSON.data) rawJSON=rawJSON.data;
        let waitingForCategory=true;
        let currentCategory;
        rawJSON.forEach((row) => {
            if (row.name) {
                if (row.value) {
                    const keyName=row.name;
                    currentCategory[keyName]=row.value;
                } else {
                    if (waitingForCategory) {
                        const categoryName=row.name.replace(':','');
                        if (!config[categoryName]) config[categoryName]={};
                        currentCategory=config[categoryName];
                    }
                waitingForCategory=false;
                }
            } else {
                waitingForCategory=true;
            }
        })
        window.embrew.config=config;
    }

    return (window.embrew.config);
}

window.embrew={};

document.addEventListener('DOMContentLoaded', (evt) => {
    decoratePage();
})