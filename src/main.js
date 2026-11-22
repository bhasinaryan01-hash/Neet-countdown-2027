import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { createClient } from '@supabase/supabase-js';
import './style.css';

const $ = s => document.querySelector(s);
const STORE = 'neet-countdown-profiles-v2';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const NATIVE_AUTH_REDIRECT = 'com.bhasinaryan.neetcountdown://auth/callback';
const isNativeApp = Capacitor.isNativePlatform();
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { flowType: 'pkce', detectSessionInUrl: !isNativeApp } }) : null;
let authUser = null;
let authBusy = false;
const OLD_STORE = 'neet-countdown-v1';
const todayISO = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const syllabus = [
 {name:'Physics',chapters:['Basic Maths and Calculus','Vectors','Units and Measurements','Motion in a Straight Line','Motion in a Plane','Laws of Motion','Work, Energy and Power','Centre of Mass and System of Particles','Rotational Motion','Gravitation','Mechanical Properties of Fluids','Mechanical Properties of Solids','Thermal Properties of Matter','Kinetic Theory','Thermodynamics','Oscillations','Waves','Electric Charges and Fields','Electrostatic Potential','Current Electricity','Moving Charges and Magnetism','Magnetism and Matter','Electromagnetic Induction','Alternating Current','Electromagnetic Waves','Ray Optics and Optical Instruments','Wave Optics','Dual Nature of Radiation and Matter','Atoms','Nuclei','Semiconductor Electronics','Materials, Devices and Simple Circuits','Logic Gates']},
 {name:'Botany',chapters:['Cell: The Unit of Life','Cell Cycle and Cell Division','The Living World','Biological Classification','Plant Kingdom','Morphology of Flowering Plants','Anatomy of Flowering Plants','Respiration in Plants','Photosynthesis in Higher Plants','Plant Growth and Development','Sexual Reproduction in Flowering Plants','Molecular Basis of Inheritance','Principles of Inheritance and Variation','Microbes in Human Welfare','Organisms and Populations','Ecosystem','Biodiversity and Conservation']},
 {name:'Zoology',chapters:['Structural Organisation in Animals','Breathing and Exchange of Gases','Body Fluids and Circulation','Excretory Products and Their Elimination','Locomotion and Movement','Neural Control and Coordination','Chemical Coordination and Integration','Animal Kingdom','Biomolecules','Human Reproduction','Reproductive Health','Human Health and Disease','Biotechnology: Principles and Processes','Biotechnology and Its Applications','Evolution']},
 {name:'Physical Chemistry',chapters:['Some Basic Concepts of Chemistry','Redox Reactions','Solutions','Thermodynamics and Thermochemistry','Chemical Equilibrium','Ionic Equilibrium','Electrochemistry','Chemical Kinetics','Structure of Atom','Practical Physical Chemistry']},
 {name:'Organic Chemistry',chapters:['IUPAC Nomenclature (Organic Chemistry)','Isomerism (Organic Chemistry)','GOC (Organic Chemistry)','Hydrocarbons','Haloalkanes','Haloarenes','Alcohols, Ethers and Phenols','Aldehydes, Ketones and Carboxylic Acids','Amines','Biomolecules','Purification and Qualitative and Quantitative Analysis']},
 {name:'Inorganic Chemistry',chapters:['Classification of Elements and Periodicity in Properties','Chemical Bonding and Molecular Structure','Coordination Compounds','The d- and f-Block Elements','The p-Block Elements','Salt Analysis']}
];
const freshState=()=>({startDate:todayISO(),endDate:'2027-05-02',reminderTime:'19:00',reminderEnabled:false,questionsDone:0,questionsTarget:10000,mocksDone:0,mocksTarget:30,subjects:syllabus.map(s=>({name:s.name,chapters:s.chapters.map(name=>({name,done:false}))}))});
const clone=x=>JSON.parse(JSON.stringify(x));
let db;
try { db=JSON.parse(localStorage.getItem(STORE)||'null'); } catch {}
if(!db||!Array.isArray(db.profiles)){
 let old={}; try{old=JSON.parse(localStorage.getItem(OLD_STORE)||'{}')}catch{}
 const initial=freshState();
 if(old&&old.subjects){ initial.startDate=old.startDate||initial.startDate;initial.endDate=old.endDate||initial.endDate;initial.reminderTime=old.reminderTime||'19:00';initial.reminderEnabled=!!old.reminderEnabled;initial.questionsDone=old.questionsDone||0;initial.questionsTarget=old.questionsTarget||10000;initial.mocksDone=old.mocksDone||0;initial.mocksTarget=old.mocksTarget||30;
  for(const sub of initial.subjects){const prev=old.subjects.find(x=>x.name===sub.name);if(prev)for(const ch of sub.chapters){const match=prev.chapters.find(x=>x.name.toLowerCase()===ch.name.toLowerCase());if(match)ch.done=!!match.done;}}
 }
 db={profiles:[{id:'p1',name:'My Profile',state:initial}],activeId:'p1'};
}
let profile=db.profiles.find(p=>p.id===db.activeId)||db.profiles[0];
let state=profile.state;
function save(){profile.state=state;db.activeId=profile.id;localStorage.setItem(authUser ? `${STORE}-${authUser.id}` : STORE,JSON.stringify(db));if(supabase&&authUser){supabase.from('student_progress').upsert({user_id:authUser.id,data:db,updated_at:new Date().toISOString()},{onConflict:'user_id'}).then(({error})=>{if(error)console.error('Cloud save failed:',error);});}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function countdown(){const end=new Date(state.endDate+'T23:59:59');if(Number.isNaN(+end))return;const now=new Date(),ms=Math.max(0,end-now),days=Math.floor(ms/86400000),pct=Math.max(0,Math.min(100,((now-new Date(state.startDate+'T00:00:00'))/(end-new Date(state.startDate+'T00:00:00')))*100));$('#days').textContent=days.toLocaleString();$('#months').textContent=Math.floor(days/30.4375);$('#weeks').textContent=Math.floor(days/7);$('#hours').textContent=Math.floor(ms/3600000).toLocaleString();$('#minutes').textContent=Math.floor(ms/60000).toLocaleString();$('#seconds').textContent=Math.floor(ms/1000).toLocaleString();$('#timeline').style.width=pct+'%';$('#timeline-label').textContent=pct.toFixed(1)+'% of your preparation window elapsed';$('#deadline-label').textContent=ms===0?'Your target date has arrived!':'Target: '+new Date(state.endDate+'T00:00:00').toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'});}
function totals(){const all=state.subjects.flatMap(s=>s.chapters),done=all.filter(c=>c.done).length;return{all:all.length,done,pct:all.length?done/all.length*100:0};}
function renderProfiles(){const sel=$('#profile-select');sel.innerHTML=db.profiles.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('');sel.value=profile.id;}
function renderSubjects(){$('#subjects').innerHTML=state.subjects.map((s,si)=>'<section class="subject"><div class="subject-head"><h3>'+esc(s.name)+'</h3><span>'+s.chapters.filter(c=>c.done).length+'/'+s.chapters.length+' completed</span></div>'+s.chapters.map((c,ci)=>'<label class="chapter"><input type="checkbox" data-si="'+si+'" data-ci="'+ci+'" '+(c.done?'checked':'')+'><span class="'+(c.done?'checked':'')+'">'+esc(c.name)+'</span></label>').join('')+'</section>').join('');const t=totals();$('#syllabus-count').textContent=t.done+' / '+t.all;$('#syllabus-percent').textContent=t.pct.toFixed(0)+'%';$('#syllabus-bar').style.width=t.pct+'%';}
function render(){renderProfiles();$('#profile-name').textContent=profile.name;$('#start-date').value=state.startDate;$('#end-date').value=state.endDate;$('#reminder-time').value=state.reminderTime;$('#reminder-toggle').checked=state.reminderEnabled;$('#questions-done').value=state.questionsDone;$('#questions-target').value=state.questionsTarget;$('#mocks-done').value=state.mocksDone;$('#mocks-target').value=state.mocksTarget;$('#question-percent').textContent=(state.questionsTarget?Math.min(100,state.questionsDone/state.questionsTarget*100):0).toFixed(0)+'%';$('#mock-percent').textContent=(state.mocksTarget?Math.min(100,state.mocksDone/state.mocksTarget*100):0).toFixed(0)+'%';$('#question-bar').style.width=(state.questionsTarget?Math.min(100,state.questionsDone/state.questionsTarget*100):0)+'%';$('#mock-bar').style.width=(state.mocksTarget?Math.min(100,state.mocksDone/state.mocksTarget*100):0)+'%';renderSubjects();countdown();updateLeft();}
async function scheduleReminder(){if(!Capacitor.isNativePlatform()){alert('Daily notifications work in the installed Android app.');return;}try{const perm=await LocalNotifications.requestPermissions();if(perm.display!=='granted'){alert('Please allow notifications in Android settings.');return;}await LocalNotifications.cancel({notifications:[{id:1902}]});if(state.reminderEnabled){const [hour,minute]=state.reminderTime.split(':').map(Number);await LocalNotifications.schedule({notifications:[{id:1902,title:'NEET study reminder',body:'Time for today’s NEET preparation!',schedule:{on:{hour,minute},allowWhileIdle:true},repeats:true,smallIcon:'ic_launcher'}]});alert('Daily reminder set for '+state.reminderTime+'.');}else alert('Daily reminder turned off.');}catch(e){console.error(e);alert('Could not schedule the reminder. Check notification permission in Android settings.');}}
function updateLeft(){$('#questions-left').textContent=Math.max(0,state.questionsTarget-state.questionsDone).toLocaleString()+' questions remaining';$('#mocks-left').textContent=Math.max(0,state.mocksTarget-state.mocksDone)+' mock tests remaining';}
$('#app').innerHTML=`
<header><div class="brand"><div class="logo">N</div><div><h1>NEET COUNTDOWN</h1><p>Your goal. Your daily progress.</p></div></div><span class="live">● LIVE</span></header>
<main>
<section class="panel profile-panel"><div><div class="eyebrow">YOUR PROFILE</div><h2 id="profile-name">My Profile</h2></div><div class="profile-actions"><select id="profile-select" aria-label="Choose profile"></select><button id="add-profile" class="small-btn">＋ Add profile</button></div><p class="hint">Your study progress is saved to your signed-in account and syncs across devices.</p></section>
<section class="hero panel"><div class="eyebrow">YOUR EXAM JOURNEY</div><div id="days" class="big-days">—</div><div class="days-caption">TOTAL DAYS REMAINING</div><div id="deadline-label" class="muted"></div><div class="count-grid"><div><b id="months">—</b><span>MONTHS</span></div><div><b id="weeks">—</b><span>WEEKS</span></div><div><b id="hours">—</b><span>TOTAL HOURS</span></div><div><b id="minutes">—</b><span>TOTAL MINUTES</span></div></div><div class="seconds-line"><span id="seconds">—</span> total seconds remaining</div><div class="track"><div id="timeline"></div></div><p id="timeline-label" class="muted tiny-text"></p></section>
<section class="panel"><div class="eyebrow">01 / COUNTDOWN SETUP</div><h2>Set your dates</h2><div class="date-grid"><label>Start date<input id="start-date" type="date"></label><label>Target / end date<input id="end-date" type="date"></label></div><p class="hint">Default target is 2 May 2027.</p></section>
<section class="panel"><div class="section-title"><div><div class="eyebrow">02 / DAILY CONSISTENCY</div><h2>Daily reminder</h2></div><label class="switch"><input id="reminder-toggle" type="checkbox"><span></span></label></div><div class="reminder-row"><label>Reminder time<input id="reminder-time" type="time"></label><button id="save-reminder" class="primary">Save reminder</button></div><p class="hint">Allow notifications when Android asks.</p></section>
<section class="panel"><div class="section-title"><div><div class="eyebrow">03 / SYLLABUS</div><h2>Preloaded chapter tracker</h2></div><div class="stat" id="syllabus-count">0 / 0</div></div><div class="progress-head"><b id="syllabus-percent">0%</b><span>syllabus completed</span></div><div class="bar"><div id="syllabus-bar"></div></div><div id="subjects"></div></section>
<section class="panel"><div class="eyebrow">04 / PRACTICE</div><h2>Question practice</h2><div class="metrics"><label>Questions solved<input id="questions-done" type="number" min="0"></label><label>Question target<input id="questions-target" type="number" min="1"></label></div><div class="progress-head"><b id="question-percent">0%</b><span>of question target</span></div><div class="bar"><div id="question-bar"></div></div><p class="hint" id="questions-left"></p></section>
<section class="panel"><div class="eyebrow">05 / MOCK TESTS</div><h2>Mock test tracker</h2><div class="metrics"><label>Mocks completed<input id="mocks-done" type="number" min="0"></label><label>Mock target<input id="mocks-target" type="number" min="1"></label></div><div class="progress-head"><b id="mock-percent">0%</b><span>of mock target</span></div><div class="bar"><div id="mock-bar"></div></div><p class="hint" id="mocks-left"></p></section>
<footer>Stay consistent. One chapter, one question, one day at a time.</footer></main>`;
render();setInterval(countdown,1000);
$('#profile-select').addEventListener('change',e=>{const next=db.profiles.find(p=>p.id===e.target.value);if(!next)return;profile=next;state=profile.state;render();});
$('#add-profile').addEventListener('click',()=>{const name=prompt('Enter a profile name (nickname is fine):');if(!name||!name.trim())return;if(db.profiles.some(p=>p.name.toLowerCase()===name.trim().toLowerCase())){alert('That profile name already exists.');return;}const p={id:'p'+Date.now(),name:name.trim().slice(0,30),state:freshState()};db.profiles.push(p);profile=p;state=p.state;save();render();});
const saveDates=()=>{state.startDate=$('#start-date').value;state.endDate=$('#end-date').value;save();countdown();};$('#start-date').addEventListener('change',saveDates);$('#end-date').addEventListener('change',saveDates);
$('#reminder-toggle').addEventListener('change',e=>{state.reminderEnabled=e.target.checked;save();});$('#save-reminder').addEventListener('click',async()=>{state.reminderTime=$('#reminder-time').value||'19:00';save();await scheduleReminder();});
function bindNumber(id,key){$(id).addEventListener('change',e=>{state[key]=Math.max(0,Number(e.target.value)||0);save();render();});}bindNumber('#questions-done','questionsDone');bindNumber('#questions-target','questionsTarget');bindNumber('#mocks-done','mocksDone');bindNumber('#mocks-target','mocksTarget');
$('#subjects').addEventListener('change',e=>{if(e.target.matches('input[type=checkbox][data-si]')){const{si,ci}=e.target.dataset;state.subjects[+si].chapters[+ci].done=e.target.checked;save();renderSubjects();}});

const authShell = document.createElement('section');
authShell.id = 'auth-shell';
authShell.innerHTML = `
  <div class="auth-glow auth-glow-one"></div><div class="auth-glow auth-glow-two"></div>
  <div class="auth-wrap">
    <div class="auth-brand"><div class="auth-logo">N</div><div><b>NEET<span>COUNTDOWN</span></b><small>YOUR JOURNEY. YOUR PACE.</small></div></div>
    <div class="auth-card">
      <div class="auth-kicker"><span class="sparkle">✦</span> BUILT FOR YOUR NEXT BIG MILESTONE</div>
      <h1 id="auth-title">Your NEET journey<br><em>starts here.</em></h1>
      <p id="auth-subtitle">Sign in to keep your preparation, progress and goals together.</p>
      <div class="auth-tabs"><button type="button" class="active" data-mode="login">Sign in</button><button type="button" data-mode="signup">Create account</button></div>
      <form id="auth-form">
        <label id="auth-name-wrap" class="auth-field" hidden>Your name<input id="auth-name" autocomplete="name" placeholder="What should we call you?"></label>
        <label class="auth-field">Email address<div class="auth-input"><span>✉</span><input id="auth-email" type="email" autocomplete="email" required placeholder="you@example.com"></div></label>
        <label class="auth-field">Password<div class="auth-input"><span>⌑</span><input id="auth-password" type="password" autocomplete="current-password" minlength="8" required placeholder="At least 8 characters"><button id="toggle-password" type="button" aria-label="Show password">◉</button></div></label>
        <button id="forgot-password" class="auth-forgot" type="button">Forgot password?</button>
        <button id="auth-submit" class="auth-submit" type="submit">Sign in <span>→</span></button>
      </form>
      <div class="auth-divider"><span></span> OR CONTINUE WITH <span></span></div>
      <button id="google-auth" class="google-auth" type="button"><b>G</b> Continue with Google</button>
      <p id="auth-message" class="auth-message" role="status"></p>
      <p class="auth-terms">Your password is securely managed by Supabase. Never share it with anyone.</p>
    </div>
    <div class="auth-foot"><span>FOCUS ON THE NEXT CHAPTER.</span><span>MADE FOR NEET ASPIRANTS</span></div>
  </div>`;
document.body.insertBefore(authShell, document.body.firstChild);
$('#app').hidden = true;
let authMode = 'login';
function authMessage(message,bad=false){const el=$('#auth-message');el.textContent=message;el.classList.toggle('error',bad);}
function setAuthMode(mode){authMode=mode;$('#auth-title').innerHTML=mode==='signup'?'Make your goal<br><em>official.</em>':mode==='reset'?'Create a new<br><em>password.</em>':'Your NEET journey<br><em>starts here.</em>';$('#auth-subtitle').textContent=mode==='signup'?'Create your free student account and keep your progress safe.':mode==='reset'?'Choose a new password for your NEET Countdown account.':'Sign in to keep your preparation, progress and goals together.';$('#auth-name-wrap').hidden=mode!=='signup';$('#auth-password').autocomplete=mode==='signup'||mode==='reset'?'new-password':'current-password';$('#auth-password').placeholder=mode==='reset'?'Enter your new password':'At least 8 characters';$('#auth-submit').innerHTML=(mode==='signup'?'Create my account':mode==='reset'?'Update password':'Sign in')+' <span>→</span>';$('#forgot-password').hidden=mode!=='login';document.querySelector('.auth-tabs').hidden=mode==='reset';document.querySelector('.auth-divider').hidden=mode==='reset';$('#google-auth').hidden=mode==='reset';document.querySelectorAll('.auth-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));authMessage('');}
document.querySelectorAll('.auth-tabs button').forEach(b=>b.addEventListener('click',()=>setAuthMode(b.dataset.mode)));
$('#toggle-password').addEventListener('click',()=>{$('#auth-password').type=$('#auth-password').type==='password'?'text':'password';});
function showApp(){authShell.hidden=true;$('#app').hidden=false;}
function showAuth(){authShell.hidden=false;$('#app').hidden=true;}
if (isNativeApp) {
  App.addListener('appUrlOpen', async ({ url }) => {
    if (!url || !url.startsWith(NATIVE_AUTH_REDIRECT) || !supabase) return;
    try {
      await Browser.close();
      const callback = new URL(url);
      const code = callback.searchParams.get('code');
      if (!code) {
        authMessage(callback.searchParams.get('error_description') || 'Google sign-in did not return an authorization code.', true);
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) await loadStudentData(data.session.user);
    } catch (err) {
      authMessage(err.message || 'Could not complete Google sign-in.', true);
    }
  });
}
async function loadStudentData(user){authUser=user;const {data,error}=await supabase.from('student_progress').select('data').eq('user_id',user.id).maybeSingle();if(error)console.error('Cloud load failed:',error);if(data?.data){db=data.data;profile=db.profiles.find(p=>p.id===db.activeId)||db.profiles[0];state=profile.state;}else{db={profiles:[{id:'p1',name:'My Profile',state:freshState()}],activeId:'p1'};profile=db.profiles[0];state=profile.state;save();}render();showApp();$('#signed-in-email').textContent=user.email||'Signed in';}
$('#auth-form').addEventListener('submit',async e=>{e.preventDefault();if(authBusy)return;if(!supabase){authMessage('Supabase setup is not finished. The login design is ready; project configuration is still required.',true);return;}authBusy=true;$('#auth-submit').disabled=true;authMessage(authMode==='signup'?'Creating your account…':'Signing you in…');try{const email=$('#auth-email').value.trim(),password=$('#auth-password').value;let result;if(authMode==='reset'){result=await supabase.auth.updateUser({password});if(result.error)throw result.error;await supabase.auth.signOut();setAuthMode('login');authMessage('Password updated. You can now sign in with your new password.');}else if(authMode==='signup'){result=await supabase.auth.signUp({email,password,options:{data:{display_name:$('#auth-name').value.trim()},emailRedirectTo:isNativeApp?NATIVE_AUTH_REDIRECT:location.origin}});if(result.error)throw result.error;if(result.data.session){await loadStudentData(result.data.user);}else authMessage('Account created! Check your email to verify your address, then sign in.');}else{result=await supabase.auth.signInWithPassword({email,password});if(result.error)throw result.error;await loadStudentData(result.data.user);}}catch(err){authMessage(err.message||'Something went wrong. Please try again.',true);}finally{authBusy=false;$('#auth-submit').disabled=false;}});
$('#forgot-password').addEventListener('click',async()=>{if(!supabase){authMessage('Supabase setup is not finished yet.',true);return;}const email=$('#auth-email').value.trim();if(!email){authMessage('Enter your email address first.',true);return;}const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:isNativeApp?NATIVE_AUTH_REDIRECT:location.origin});authMessage(error?error.message:'If an account exists for this email, a password reset link has been sent.');});
$('#google-auth').addEventListener('click',async()=>{if(!supabase){authMessage('Supabase setup is not finished yet.',true);return;}try{const {data,error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:isNativeApp?NATIVE_AUTH_REDIRECT:location.origin,skipBrowserRedirect:isNativeApp}});if(error)throw error;if(isNativeApp&&data?.url)await Browser.open({url:data.url});}catch(err){authMessage(err.message||'Google sign-in could not start.',true);}});
async function startAuth(){if(!supabase){showAuth();authMessage('Connect your Supabase project to activate sign-in. Add the project URL and publishable key to GitHub Actions secrets.',true);return;}const {data:{session}}=await supabase.auth.getSession();if(session?.user)await loadStudentData(session.user);else showAuth();supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){authUser=null;showAuth();}else if(event==='PASSWORD_RECOVERY'){showAuth();setAuthMode('reset');authMessage('Enter a new password for your account.');}});}
$('#app').insertAdjacentHTML('afterbegin','<div class="account-bar"><span id="signed-in-email"></span><button id="sign-out" type="button">Sign out</button></div>');
$('#sign-out').addEventListener('click',async()=>{if(supabase)await supabase.auth.signOut();authUser=null;showAuth();});
startAuth();

/* Student Study Lounge: authenticated public study room */
const lounge = document.createElement('section');
lounge.id = 'study-lounge';
lounge.className = 'panel';
lounge.innerHTML = `
 <div class="lounge-head"><div><div class="eyebrow">STUDY TOGETHER</div><h2>Student Study Lounge</h2><p class="muted">Ask doubts, share study tips and encourage each other.</p></div><span class="lounge-live">● LIVE ROOM</span></div>
 <div class="lounge-safety">Use a nickname. Never share phone numbers, addresses, passwords, school IDs or private details. Keep messages respectful. Report anything uncomfortable.</div>
 <div id="lounge-messages" class="lounge-messages" aria-live="polite"><p class="muted">Connecting to the study room…</p></div>
 <form id="lounge-form" class="lounge-form"><input id="lounge-input" maxlength="1000" placeholder="Share a doubt or study tip…" autocomplete="off" required><button class="primary" type="submit">Send</button></form>
 <p id="lounge-status" class="hint">Messages are visible to signed-in students.</p>`;
$('#app').append(lounge);
let loungeChannel=null;
function safeText(s){return String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function drawMessages(rows){const box=$('#lounge-messages');box.innerHTML='';if(!rows?.length){box.innerHTML='<p class="muted">No messages yet. Start with a study question!</p>';return;}for(const m of rows){const item=document.createElement('article');item.className='lounge-message';const who=safeText(m.display_name||'Student'),body=safeText(m.content),when=new Date(m.created_at).toLocaleString();item.innerHTML='<div class="lounge-message-meta"><b>'+who+'</b><time>'+safeText(when)+'</time></div><p>'+body+'</p><button type="button" class="report-message" data-message-id="'+safeText(m.id)+'">Report</button>';box.append(item);}box.scrollTop=box.scrollHeight;}
async function loadLounge(){if(!supabase||!authUser){$('#lounge-status').textContent='Sign in to join the student study room.';return;}const {data,error}=await supabase.from('chat_messages').select('id,user_id,display_name,content,created_at').order('created_at',{ascending:false}).limit(80);if(error){$('#lounge-status').textContent='Study room database setup is still required.';return;}drawMessages((data||[]).reverse());if(loungeChannel)await supabase.removeChannel(loungeChannel);loungeChannel=supabase.channel('student-study-room').on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},payload=>{const box=$('#lounge-messages');const empty=box.querySelector('.muted');if(empty)box.innerHTML='';const m=payload.new;const item=document.createElement('article');item.className='lounge-message';item.innerHTML='<div class="lounge-message-meta"><b>'+safeText(m.display_name||'Student')+'</b><time>'+safeText(new Date(m.created_at).toLocaleString())+'</time></div><p>'+safeText(m.content)+'</p><button type="button" class="report-message" data-message-id="'+safeText(m.id)+'">Report</button>';box.append(item);box.scrollTop=box.scrollHeight;}).subscribe();}
$('#lounge-form').addEventListener('submit',async e=>{e.preventDefault();const input=$('#lounge-input'),content=input.value.trim();if(!content||!supabase||!authUser)return;const display=(authUser.user_metadata?.display_name||authUser.email?.split('@')[0]||'Student').slice(0,32);$('#lounge-status').textContent='Sending…';const {error}=await supabase.from('chat_messages').insert({user_id:authUser.id,display_name:display,content});if(error){$('#lounge-status').textContent='Could not send. Check the database setup and try again.';}else{input.value='';$('#lounge-status').textContent='Sent. Be kind and keep studying together.';}});
$('#lounge-messages').addEventListener('click',async e=>{const b=e.target.closest('.report-message');if(!b||!supabase||!authUser)return;const reason=prompt('Why are you reporting this message? (Keep it brief)');if(!reason||!reason.trim())return;const {error}=await supabase.from('chat_reports').insert({message_id:Number(b.dataset.messageId),reporter_id:authUser.id,reason:reason.trim().slice(0,300)});$('#lounge-status').textContent=error?'Could not submit report.':'Report submitted for review. Thank you.';});
const previousLoadStudentData=loadStudentData;
loadStudentData=async function(user){await previousLoadStudentData(user);await loadLounge();};
const previousShowAuth=showAuth;
showAuth=function(){previousShowAuth();if(loungeChannel&&supabase){supabase.removeChannel(loungeChannel);loungeChannel=null;}};
