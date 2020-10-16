const $section=document.currentScript.closest('div');
const $endpoint=$section.querySelector('a');
const endpoint=$endpoint.href;

window.embrew.reservationsEndpoint=endpoint;

$endpoint.parentNode.remove();

function shortTime(date) {
    const today=new Date();
    const isToday = (date.getDate() == today.getDate() &&
      date.getMonth() == today.getMonth() &&
      date.getFullYear() == today.getFullYear());
    const thisWeek = (today-date)/1000 < 7*86400;
    if (isToday) {
        return (date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    } else if (thisWeek) {
        return (date.toLocaleDateString([], { weekday: 'long' }).split(',')[0])
    } else {
        return (date.toLocaleDateString())
    }

}

function formatPhoneNumber(number) {
    if (number.startsWith('+1')) {
        return (`(${number.substr(2,3)}) ${number.substr(5,3)}-${number.substr(8,4)}`)
    }
}

async function signedIn() {
    window.embrew.reservations=await fetchReservations();
    displayReservations();
}

function hide(qs) {
    document.querySelector(qs).classList.add('hidden');
}

function show(qs) {
    document.querySelector(qs).classList.remove('hidden');
}

function toggleArchive() {
    document.getElementById('reservations').classList.toggle('archive');
}

async function editReservation(res) {

    show('#reservation-details .details')
    hide('#reservation-details .spinner')

    const $details=document.getElementById('reservation-details');
    $details.classList.remove('hidden');
    document.body.classList.add('noscroll');

    const $form=$details.querySelector('form');
    for (let name in res) {
        $input=$form.elements[name];
        if ($input) {
            $input.value=res[name];
        }
    }

    const cell=(''+res.Cell).replace(/\D/g, '');

    $details.querySelector('a.tel').href=`tel:${cell}`;
    $details.querySelector('a.sms').href=`/host-messages#+1${cell}`;

    $details.querySelector('.message-text').innerHTML=res.Message.replace(/\n/g,'<br>');
    console.log(res);

    const $update=$details.querySelector('.update');
    $update.innerHTML='<button>Update Reservation</button>';
    $update.firstElementChild.addEventListener('click', async (e) => {
        hide('#reservation-details .details')
        show('#reservation-details .spinner')
    
        const conf=await updateReservation($form);
        for (let name in conf.reservation) {
            res[name]=conf.reservation[name];
        }
        $details.classList.add('hidden');
        document.body.classList.remove('noscroll');
        displayReservations();
    });

    const $cancel=$details.querySelector('.cancel');
    $cancel.innerHTML='<button>Cancel Reservation</button>';
    $cancel.firstElementChild.addEventListener('click', async (e) => {
        hide('#reservation-details .details')
        show('#reservation-details .spinner')
        const conf=await updateStatus(res, 'Cancelled');
        $details.classList.add('hidden');
        document.body.classList.remove('noscroll');
        displayReservations();
    });

}

async function updateStatus(res, status) {
    const conf=await fetchReservation({ID: res.ID, Status: status});
    return conf;
}

async function fetchReservation(reservation) {
    let qs=`?UpdatedBy=${window.googleUser.email}&`;

    Object.keys(reservation).forEach((a,i) => {
        let v=reservation[a];
        qs+=`${a}=${encodeURIComponent(v)}&`;
    });
    
    const reservationEndpoint = "https://thinktanked.org/cgi-bin/reservations";

    const resp=await fetch(reservationEndpoint+qs);
    const confirmed=await resp.json();
    console.log(confirmed);
    return confirmed;

}

async function updateReservation($form) {
    
    const res={};
    Array.from($form.elements).forEach(($e) => {
        res[$e.name]=$e.value;
    })
    const conf=await fetchReservation(res);
    return conf;
    
}

const isToday = (someDate) => {
    const today = new Date()
    return someDate.getDate() == today.getDate() &&
      someDate.getMonth() == today.getMonth() &&
      someDate.getFullYear() == today.getFullYear()
  }

async function displayReservations() {
    const $upcoming=document.getElementById('upcoming');
    $upcoming.innerHTML='';
    window.embrew.reservations.forEach((r) => {
        if (r.Name) {
            if (!r.Status) r.Status='Not Arrived Yet';
            const status=r.Status;
            const statusClass=status.toLowerCase().replace(' ','-');
            const today=isToday(getDate(r.Date,r.Time));
            $row=createTag('div', { class: `row ${statusClass} ${today?'today':'archive'}`, id: `res-${r.ID}`});
            $row.innerHTML=`
            <div class="status">
                ${status}
            </div>
            <div class="description">
                <span class="name">${r.Name}</span>
                <span class="party">(Party of ${r.Party})</span>
                <span class="message">${r.Message?'&#11044;':''}</span><br>
                <span class="date">${today?'Today':r.Date} ${r.Time}</span>
            </div>
            `;
            $row.querySelector('.description').addEventListener('click', (evt) => {
                editReservation(r);
            })
            $row.querySelector('.status').addEventListener('click', async (evt) => {
                const statuses=['Not Arrived Yet','Arrived','Seated'];
                const nextStatus=statuses[(statuses.indexOf(r.Status)+1)%statuses.length];

                if (nextStatus=='Arrived' && r.Message) {
                    show('#reservation-message')                
                    document.querySelector('#reservation-message .message-text').innerHTML=r.Message.replace(/\n/g,'<br>');
                }

                $status=evt.currentTarget;
                $status.innerHTML=`
                <div class="spinner">
                    <div class="bounce1"></div>
                    <div class="bounce2"></div>
                    <div class="bounce3"></div>
                </div>`;

                const conf=await updateStatus(r, nextStatus);
                r.Status=conf.reservation.Status;
                displayReservations();
            })
        
            $upcoming.appendChild($row);
        }
    })    
    
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

async function fetchReservations() {
    const resp=await fetch(`${endpoint}?FetchAs=${window.googleUser.email}`);
    const data=await resp.json();
    data.actions.sort((a,b) => getDate(a.Date,a.Time)-getDate(b.Date,b.Time))
    return (data.actions);    
}


async function initReservations() {
    $h1=document.querySelector('h1');
    document.querySelector('#reservations .reservations-header').appendChild($h1);
    document.querySelectorAll('.popup .close').forEach($close => {
        const $popup=$close.closest('.popup');
        $close.addEventListener('click', (e) => {
            $popup.classList.add('hidden');
            document.body.classList.remove('noscroll');
        })
    })

    const $party=document.querySelector('#reservation-details select[name="Party"]');
    const config=await getConfig();
    const minParty=+config['Reservations']['Minimum Party Size'];
    const maxParty=+config['Reservations']['Maximum Party Size'];
    const defaultParty=+config['Reservations']['Default Party Size'];
    
    let html='';
    for (let i=minParty;i<=maxParty;i++) {
        html+=`<option value="${i}" ${i==defaultParty?'selected':''}>Party of ${i}</option>`;
    }
    $party.innerHTML=html;
}


initReservations();
