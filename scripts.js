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
    if (window.location.pathname=='/' || window.location.pathname=='/index.html') {
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
async function addBanner() {
    const l=window.location.pathname;
    if (l.endsWith('/') || l.endsWith('order')|| l.endsWith('reservation')) {
        const config=await getConfig();
        const today=new Date();
        const upcomingClosed=[];
        for (let daysOut=0;daysOut<10;daysOut++) {
            const day=new Date();
            day.setDate(day.getDate()+daysOut);
            let prefix='';
            if (daysOut==0) prefix='Today';
            if (daysOut==1) prefix='Tomorrow';
            const closedOn=await areWeClosed(day); 
            if (closedOn) upcomingClosed.push((prefix?prefix+' ':'')+closedOn);
        }
        if (upcomingClosed.length) {
            const $header=document.querySelector('header');
            const $banner=createTag('div', {class: 'banner'});
            const bannerTemplate=config['Banner Templates']['Closed'];
            $banner.innerHTML=bannerTemplate.replace('...',upcomingClosed.join(' & '));
            $header.append($banner);
            setTimeout((e)=> {$banner.classList.add('appear')}, 100);        
        }
    }
}

function decoratePage() {
    wrapSections('main>div');
    decorateBackgroundSections();
    decorateImageOnlySections();
    decorateSquareLinks();
    decorateTables();
    decoratePhoneLinks();
    hideTitle();
    addBanner();
}

function isSameDate(date1, date2) {
    return (date1.getDate()==date2.getDate() && 
        date1.getFullYear()==date2.getFullYear() &&
        date1.getMonth()==date2.getMonth())
}

function getDate(date, time) {
    if (isNaN(date)) {
        const months=['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dateSegs=date.split(' ');
        const timeSegs=time.split(' ');
        const hoursMins=timeSegs[0].split(':');
    
        const hour=+hoursMins[0]+(timeSegs[1]=='PM'?12:0);
        const mins=+hoursMins[1];
    
        const dateAndTime=new Date(+dateSegs[3], months.indexOf(dateSegs[1]), +dateSegs[2], hour, mins);
        console.log(dateAndTime, date+'->'+time);
    
        return (dateAndTime);    

    } else {
        const serial=date;
        const utc_days  = Math.floor(serial - 25569) +1; //hack for negative UTC
        const utc_value = utc_days * 86400; 
        const date_info = new Date(utc_value * 1000);
     
        return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
    }
}

async function checkPreview() {
    if (document.referrer == 'https://docs.google.com/' || window.location.search=='?fresh') {
        const hostname='embrew--davidnuescheler.hlx.page';
        const pathname=window.location.pathname;
        const resp=await fetch(`https://adobeioruntime.net/api/v1/web/helix/helix-services/purge@v1?host=${hostname}&path=${encodeURIComponent(pathname)}`, {
            method: 'POST'
        });
    
        const json=await resp.json();
        console.log(JSON.stringify(json));

        const newurl=window.location.protocol+'//'+window.location.host+pathname;
        await fetch(newurl, {cache: 'reload', mode: 'no-cors'});
        console.log(`busted browser cache for: ${newurl}`);
        window.location.href=newurl;
    }
}

async function areWeClosed(someDate) {
    const config=await getConfig();
    const closedOn=config['Closed on'];
    const days=Object.keys(closedOn);
    let closed='';
    days.forEach(day => {
        const closedDate=getDate(closedOn[day]);
        if (isSameDate(someDate, closedDate)) closed=day;
    })
    // console.log(closed);
    return closed;
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

decoratePage();
