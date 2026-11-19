import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import './style.css';

const $ = (s) => document.querySelector(s);
const storeKey = 'neet-countdown-v1';
const todayISO = () => {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const defaultState = {
  startDate: '2026-11-19', endDate: '2027-05-02', reminderTime: '19:00',
  reminderEnabled: false, questionsDone: 0, questionsTarget: 10000,
  mocksDone: 0, mocksTarget: 30,
  subjects: [
    {name:'Physics', chapters:[{name:'Physics: Units & Measurements',done:false},{name:'Kinematics',done:false},{name:'Laws of Motion',done:false}]},
    {name:'Chemistry', chapters:[{name:'Some Basic Concepts',done:false},{name:'Atomic Structure',done:false},{name:'Chemical Bonding',done:false}]},
    {name:'Biology', chapters:[{name:'The Living World',done:false},{name:'Biological Classification',done:false},{name:'Plant Kingdom',done:false}]}
  ]
};
let state;
try { state = {...defaultState, ...JSON.parse(localStorage.getItem(storeKey) || '{}')}; } catch { state = structuredClone(defaultState); }
function save(){ localStorage.setItem(storeKey, JSON.stringify(state)); }
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function dateParts(a,b){
  let start = new Date(`${a}T00:00:00`), end = new Date(`${b}T23:59:59`);
  if (Number.isNaN(+start)||Number.isNaN(+end)) return null;
  return {start,end};
}
function calendarDiff(from,to){
  if(to<=from) return {months:0,days:0};
  let y=to.getFullYear()-from.getFullYear(), m=to.getMonth()-from.getMonth();
  let months=y*12+m, anchor=new Date(from); anchor.setMonth(anchor.getMonth()+months);
  if(anchor>to){months--; anchor=new Date(from); anchor.setMonth(anchor.getMonth()+months);}
  return {months,days:Math.floor((to-anchor)/86400000)};
}
function countdown(){
  const p=dateParts(state.startDate,state.endDate); if(!p)return;
  const now=new Date(), ms=Math.max(0,p.end-now), total=Math.max(1,p.end-p.start);
  const days=Math.floor(ms/86400000), hours=Math.floor(ms/3600000), mins=Math.floor(ms/60000), secs=Math.floor(ms/1000);
  const cal=calendarDiff(now,p.end), pct=Math.max(0,Math.min(100,((now-p.start)/total)*100));
  $('#days').textContent=days.toLocaleString(); $('#months').textContent=`${cal.months} months ${cal.days} days`;
  $('#hours').textContent=hours.toLocaleString(); $('#minutes').textContent=mins.toLocaleString(); $('#seconds').textContent=secs.toLocaleString();
  $('#timeline').style.width=`${pct}%`; $('#timeline-label').textContent=`${pct.toFixed(1)}% of your preparation window elapsed`;
  $('#deadline-label').textContent=ms===0?'Your target date has arrived!':`Target: ${new Date(`${state.endDate}T00:00:00`).toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'})}`;
}
function totals(){
 const all=state.subjects.flatMap(s=>s.chapters), done=all.filter(c=>c.done).length;
 return {all:all.length,done, pct:all.length?done/all.length*100:0};
}
function renderSubjects(){
 $('#subjects').innerHTML=state.subjects.map((s,si)=>`<section class="subject">
  <div class="subject-head"><h3>${esc(s.name)}</h3><span>${s.chapters.filter(c=>c.done).length}/${s.chapters.length} completed</span></div>
  ${s.chapters.map((c,ci)=>`<label class="chapter"><input type="checkbox" data-si="${si}" data-ci="${ci}" ${c.done?'checked':''}><span class="${c.done?'checked':''}">${esc(c.name)}</span><button class="tiny danger" data-remove="${si},${ci}" aria-label="Delete chapter">×</button></label>`).join('')}
  <form class="add-chapter" data-add="${si}"><input name="chapter" placeholder="Add a chapter" required maxlength="70"><button class="small-btn">Add</button></form>
 </section>`).join('');
 const t=totals(); $('#syllabus-count').textContent=`${t.done} / ${t.all}`; $('#syllabus-percent').textContent=`${t.pct.toFixed(0)}%`; $('#syllabus-bar').style.width=`${t.pct}%`;
}
function render(){
 $('#start-date').value=state.startDate; $('#end-date').value=state.endDate;
 $('#reminder-time').value=state.reminderTime;
 $('#reminder-toggle').checked=state.reminderEnabled;
 $('#questions-done').value=state.questionsDone; $('#questions-target').value=state.questionsTarget;
 $('#mocks-done').value=state.mocksDone; $('#mocks-target').value=state.mocksTarget;
 $('#question-percent').textContent=`${state.questionsTarget?Math.min(100,state.questionsDone/state.questionsTarget*100).toFixed(0):0}%`;
 $('#mock-percent').textContent=`${state.mocksTarget?Math.min(100,state.mocksDone/state.mocksTarget*100).toFixed(0):0}%`;
 $('#question-bar').style.width=`${state.questionsTarget?Math.min(100,state.questionsDone/state.questionsTarget*100):0}%`;
 $('#mock-bar').style.width=`${state.mocksTarget?Math.min(100,state.mocksDone/state.mocksTarget*100):0}%`;
 renderSubjects(); countdown();
}
async function scheduleReminder(){
 if(!Capacitor.isNativePlatform()){ alert('Daily notifications work in the installed Android app. Build and install the APK first.'); return; }
 try{
  const perm=await LocalNotifications.requestPermissions();
  if(perm.display!=='granted'){alert('Please allow notifications in Android settings.');return;}
  await LocalNotifications.cancel({notifications:[{id:1902}]});
  if(state.reminderEnabled){
   const [hour,minute]=state.reminderTime.split(':').map(Number);
   await LocalNotifications.schedule({notifications:[{id:1902,title:'NEET study reminder',body:'Time for today’s NEET preparation. Complete your planned study session!',schedule:{on:{hour,minute},allowWhileIdle:true},repeats:true,smallIcon:'ic_launcher'}]});
   alert(`Daily reminder set for ${state.reminderTime}.`);
  } else alert('Daily reminder turned off.');
 }catch(e){console.error(e);alert('Could not schedule the reminder. Check notification permission in Android settings.');}
}
$('#app').innerHTML=`
<header><div class="brand"><div class="logo">N</div><div><h1>NEET COUNTDOWN</h1><p>Your goal. Your daily progress.</p></div></div><span class="live">● LIVE</span></header>
<main>
 <section class="hero panel"><div class="eyebrow">YOUR EXAM JOURNEY</div><div id="days" class="big-days">—</div><div class="days-caption">DAYS REMAINING</div>
  <div id="deadline-label" class="muted"></div><div class="count-grid">
   <div><b id="months">—</b><span>MONTHS + DAYS</span></div><div><b id="hours">—</b><span>TOTAL HOURS</span></div><div><b id="minutes">—</b><span>TOTAL MINUTES</span></div><div><b id="seconds">—</b><span>TOTAL SECONDS</span></div>
  </div><div class="track"><div id="timeline"></div></div><p id="timeline-label" class="muted tiny-text"></p>
 </section>
 <section class="panel"><div class="section-title"><div><div class="eyebrow">01 / COUNTDOWN SETUP</div><h2>Set your dates</h2></div></div>
  <div class="date-grid"><label>Start date<input id="start-date" type="date"></label><label>Target / end date<input id="end-date" type="date"></label></div>
  <p class="hint">Default target is 2 May 2027. Change either date whenever you need.</p>
 </section>
 <section class="panel"><div class="section-title"><div><div class="eyebrow">02 / DAILY CONSISTENCY</div><h2>Daily reminder</h2></div><label class="switch"><input id="reminder-toggle" type="checkbox"><span></span></label></div>
  <div class="reminder-row"><label>Reminder time<input id="reminder-time" type="time"></label><button id="save-reminder" class="primary">Save reminder</button></div><p class="hint">Runs on your phone every day. Allow notifications when Android asks.</p>
 </section>
 <section class="panel"><div class="section-title"><div><div class="eyebrow">03 / SYLLABUS</div><h2>Chapter tracker</h2></div><div class="stat" id="syllabus-count">0 / 0</div></div>
  <div class="progress-head"><b id="syllabus-percent">0%</b><span>syllabus completed</span></div><div class="bar"><div id="syllabus-bar"></div></div>
  <div id="subjects"></div>
  <form id="add-subject" class="add-subject"><input name="subject" placeholder="New subject (e.g. Botany)" required maxlength="40"><button class="primary">Add subject</button></form>
 </section>
 <section class="panel"><div class="eyebrow">04 / PRACTICE</div><h2>Question practice</h2><div class="metrics">
  <label>Questions solved<input id="questions-done" type="number" min="0"></label><label>Question target<input id="questions-target" type="number" min="1"></label></div>
  <div class="progress-head"><b id="question-percent">0%</b><span>of question target</span></div><div class="bar"><div id="question-bar"></div></div>
  <p class="hint" id="questions-left"></p>
 </section>
 <section class="panel"><div class="eyebrow">05 / MOCK TESTS</div><h2>Mock test tracker</h2><div class="metrics">
  <label>Mocks completed<input id="mocks-done" type="number" min="0"></label><label>Mock target<input id="mocks-target" type="number" min="1"></label></div>
  <div class="progress-head"><b id="mock-percent">0%</b><span>of mock target</span></div><div class="bar"><div id="mock-bar"></div></div><p class="hint" id="mocks-left"></p>
 </section>
 <footer>Stay consistent. One chapter, one question, one day at a time.</footer>
</main>`;
render();
setInterval(countdown,1000);
const saveDate=()=>{state.startDate=$('#start-date').value;state.endDate=$('#end-date').value;save();countdown();};
$('#start-date').addEventListener('change',saveDate);$('#end-date').addEventListener('change',saveDate);
$('#reminder-toggle').addEventListener('change',e=>{state.reminderEnabled=e.target.checked;save();});
$('#save-reminder').addEventListener('click',async()=>{state.reminderTime=$('#reminder-time').value||'19:00';save();await scheduleReminder();});
function bindNumber(id,key){$(id).addEventListener('change',e=>{state[key]=Math.max(0,Number(e.target.value)||0);save();render();});}
bindNumber('#questions-done','questionsDone');bindNumber('#questions-target','questionsTarget');bindNumber('#mocks-done','mocksDone');bindNumber('#mocks-target','mocksTarget');
$('#subjects').addEventListener('change',e=>{if(e.target.matches('input[type=checkbox][data-si]')){const {si,ci}=e.target.dataset;state.subjects[+si].chapters[+ci].done=e.target.checked;save();renderSubjects();}});
$('#subjects').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){const [si,ci]=b.dataset.remove.split(',').map(Number);state.subjects[si].chapters.splice(ci,1);save();renderSubjects();}});
$('#subjects').addEventListener('submit',e=>{const f=e.target.closest('form[data-add]');if(!f)return;e.preventDefault();const si=+f.dataset.add;const name=new FormData(f).get('chapter').trim();if(name){state.subjects[si].chapters.push({name,done:false});save();renderSubjects();}});
$('#add-subject').addEventListener('submit',e=>{e.preventDefault();const name=new FormData(e.target).get('subject').trim();if(name){state.subjects.push({name,chapters:[]});save();renderSubjects();e.target.reset();}});
function updateLeft(){ $('#questions-left').textContent=`${Math.max(0,state.questionsTarget-state.questionsDone).toLocaleString()} questions remaining`;$('#mocks-left').textContent=`${Math.max(0,state.mocksTarget-state.mocksDone)} mock tests remaining`; }
updateLeft();
for(const id of ['#questions-done','#questions-target','#mocks-done','#mocks-target'])$(id).addEventListener('change',updateLeft);
