const $section=document.currentScript.closest('div');
const $endpoint=$section.querySelector('a');
const endpoint=$endpoint.href;

window.embrew.messagesEndpoint=endpoint;

$endpoint.parentNode.remove();

function timeAgo (date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals={year:31536000,month:2592000,day:86400,hour:3600,minute:60,second:1}
    let ago=''

    for (var name in intervals) {
        const interval=intervals[name];        
        const amount=Math.floor(seconds / interval);
        ago=`${amount} ${name}${amount==1?'':'s'}`
        if (amount > 1) break;
    }
}


async function fetchThreads() {
    const config=await getConfig();
    const resp=await fetch(window.embrew.messagesEndpoint);
    const {actions}=await resp.json();

    let threads=[];
    const threadobj={};
    const ownNumber='+1'+config["Location"]["Phone Number"].replace(/\D/g,'');
    console.log(ownNumber);
    
    actions.forEach((action) => {
        if (action.Timestamp) {
            let threadid='';
            if (action.From == ownNumber) threadid=action.To;
            else threadid=action.From;

            if (!threadobj[threadid]) {
                threadobj[threadid]={number: threadid, messages:[]};
            }

            const thread=threadobj[threadid];
            if (action.From==ownNumber) action.FromMe=true;
            thread.messages.push(action);
            if (action.Name) {
                thread.name=action.Name;
            }
            thread.lastUpdate=new Date(action.Timestamp);
            thread.id = threadid;
        }
    })

    threads=Object.values(threadobj);
    threads=threads.sort((a,b) => { return (b.lastUpdate-a.lastUpdate)});
    return threads;
}

function send() {
    alert('send');
}

function formatPhoneNumber(number) {
    if (number.startsWith('+1')) {
        return (`(${number.substr(2,3)}) ${number.substr(5,3)}-${number.substr(8,4)}`)
    }
}

function displayThread(thread) {
    document.getElementById('messages').classList.add('show-thread');
    $thread=document.getElementById('thread');
    $thread.innerHTML=`<div class="thread-info">
        <span class="name">${thread.name?thread.name:''}</span>
        <span class="number">${formatPhoneNumber(thread.number)}</span>
        </div>
        <div class="thread-messages"></div>
        <div class="thread-response"><textarea id="thread-response" placeholder="type your response"></textarea>
        <button onclick="send()">send</button></div>`;
    const $threadMessages=$thread.querySelector('.thread-messages');

    thread.messages.forEach((m) => {
        $div=createTag('div');
        const body=m.Body.replace(/\n/g, '<br>');
        $div.innerHTML=`<p class="message ${m.FromMe?'me':''}">${body}</p>`;
        $threadMessages.appendChild($div);
    })
    $threadMessages.scrollTop = $threadMessages.scrollHeight;
}

async function updateThreads() {
    const threads=await fetchThreads();
    console.log(threads);
    $threads=document.getElementById('threads');
    $threads.innerHTML='';
    threads.forEach((t)=>{
        $div=createTag('div');
        $div.innerHTML=`<h4>${t.name?t.name:formatPhoneNumber(t.number)}</h4>
        <p>${t.messages[t.messages.length-1].Body}</p>`;
        $threads.appendChild($div);
        $div.addEventListener('click', (e) => {
            displayThread(t)
        })
    })
 }

window.addEventListener('DOMContentLoaded', (e) => {
    updateThreads();
})

$h1=document.querySelector('h1');
document.querySelector('#messages .messages-header').appendChild($h1);
$h1.addEventListener(('click'), (e) => {
    document.getElementById('messages').classList.remove('show-thread');
})