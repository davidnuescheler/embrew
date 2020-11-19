

async function initReservationForm() {

    const $form = document.getElementById('reservation-form');
    populateForm($form);


    // init reservation days
    const $party=document.getElementById('party');
    const $date=document.getElementById('date');
    const $time=document.getElementById('time');
    const $seating=document.getElementById('seating');
    const weekdays=['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', `Friday`, 'Saturday'];

    for (let daysOut=0;daysOut<10;daysOut++) {
        const day=new Date();
        day.setDate(day.getDate()+daysOut);
        let prefix='';
        if (daysOut==0) prefix='Today';
        if (daysOut==1) prefix='Tomorrow';
        $option=createTag('option',{value: `${day.toDateString()}`});
        $option.innerHTML=`${prefix} ${weekdays[day.getDay()].substr(0,3)} ${day.toLocaleDateString()}`;
        if (!await areWeClosed(day)) $date.appendChild($option);
    }
    $date.addEventListener('change', (evt) => {
        setReservationTimes($date.value);
    })
    await setReservationTimes($date.value);
    if ($time.options.length==0) {
        $date.firstElementChild.remove();
        setReservationTimes($date.value);
    }

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

async function getReservations() {
    const resp=await fetch('/reservations.json');
    const json=await resp.json();
    if (json.data) {
        return (json.data);
    } else {
        return (json);
    }
}

async function filterReservationsByDate(reservations, date) {
    const filterDate=new Date(date);
    reservations.filter(r => {
        const resDate=getDate(r.Date, r.Time);
        return (isSameDate(resDate, filterDate));
   })
}

async function checkReservationTimesAvailability(date, $time, partySize, preference) {
    const config=await getConfig();
    const reservations=await getReservations();
    const daysRes=filterReservationsByDate(reservations, date);
    $time.options.forEach(($o) => {
        console.log($o.value);
    })
} 

async function setReservationTimes(date) {
    const $time=document.getElementById('time');
    $time.innerHTML='';
    const config=await getConfig();
    const reservationHours=getOpeningHours(config['Reservation Hours']);
    const day=new Date(date);
    const now=new Date();
    const {from, to}=reservationHours[day.getDay()];
    for (let hour=from;hour<(to-(+config['Reservations']['Last Seating']));hour++) {
        for (let mins=0;mins<=45;mins+=15) {
            const time=new Date(day);
            time.setHours(hour, mins, 0);
            if (time.valueOf()>now.valueOf()) {
                const timeStr=time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                const $option=createTag('option', { value: timeStr });
                $option.innerHTML=`${timeStr}`;
                $time.appendChild($option);
            }
        }
    }
    const $party=document.getElementById('party');
    const $seating=document.getElementById('seating');

    //checkReservationTimesAvailability(date, $time, $party.value, $seating.value)
}

async function displayReservation(reservation) {
    const config=await getConfig();
    const $confirmation=document.getElementById('reservation-confirmation');
    window.scrollTo(0,0);
    $confirmation.innerHTML=`
        <div class="spinner">
            <div class="bounce1"></div>
            <div class="bounce2"></div>
            <div class="bounce3"></div>
        </div>`;
    $confirmation.classList.remove('collapsed');

    const confRes=await fetchReservation(reservation);
    if (confRes.reservation) {
        const r=confRes.reservation;
        const humanPhone=config["Location"]["Phone Number"];
        const phone=config["Location"]["Phone Number"].replace(/\D/g, '');
        $confirmation.innerHTML=`<div><h3>Confirmed</h3>
            <p>We got your reservation for a party of ${r.Party} on <nobr>${r.Date}</nobr> at <nobr>${r.Time}</nobr> under <nobr>${r.Name}</nobr></p>
            <p>Please give us a <a href="tel:${phone}">call</a> or <a href="sms:${phone}">text</a> us at <nobr>${humanPhone}</nobr> if you want to make changes or need to cancel.</p>
            </div>`;
        
        localStorage.setItem('upcoming-reservation', JSON.stringify({ID: r.ID, Date: r.Date}));
        
    } else {
        const humanPhone=config["Location"]["Phone Number"];
        const phone=config["Location"]["Phone Number"].replace(/\D/g, '');
        $confirmation.innerHTML=`<div><h3>Oops, something went wrong</h3>
            <p>Please give us a <a href="tel:${phone}">call</a> or <a href="sms:${phone}">text</a> us at <nobr>${humanPhone}</nobr></p>
            </div>`;
    }



}

async function fetchReservation(reservation) {
    let qs='?';

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

async function submitReservation() {
    
    const reservation={};
    reservation.Time=document.getElementById('time').value;
    reservation.Date=document.getElementById('date').value;
    reservation.Name=document.getElementById('name').value;
    reservation.Cell=document.getElementById('cell').value;
    reservation.Party=document.getElementById('party').value;
    reservation.Message=document.getElementById('message').value;
    reservation.Seating=document.getElementById('seating').value;

    stashForm(['name','cell']);

    displayReservation(reservation);

}

function moveConfirmationToTop() {
    const $confirmation=document.getElementById('reservation-confirmation');
    document.querySelector('main').prepend($confirmation);
}

function checkForUpcomingReservation() {
    const upcoming=JSON.parse(localStorage.getItem('upcoming-reservation'));
    const resID=window.location.hash.substr(1);

    if (upcoming) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0,0,0,0);

        const upcomingDate=getDate(upcoming.Date, '11 PM')
    
        if (upcomingDate<tomorrow) {
            localStorage.removeItem('upcoming-reservation');
        } else {
            displayReservation({ID: upcoming.ID});
        }       
    }

    if (resID) {
        displayReservation({ID: resID});
    }
}


initReservationForm();
moveConfirmationToTop();
checkForUpcomingReservation();