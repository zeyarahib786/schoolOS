
/* ============ ICONS ============ */
const I = {
  dash:'<path d="M3 13h8V3H3zM13 21h8V3h-8zM3 21h8v-6H3z"/>',
  admiss:'<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  crm:'<path d="M3 4h18l-7 8v6l-4 2v-8z"/>',
  students:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  staff:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><rect x="16" y="3" width="6" height="6" rx="1"/>',
  parents:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
  classes:'<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 9h18M9 4v14"/>',
  tt:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  curric:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  att:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  exam:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15l2 2 4-4"/>',
  lib:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/>',
  trans:'<path d="M8 6v6M15 6v6M2 12h19.6M18 18h.01M7 18h.01M5 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM17 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/><path d="M3 6h14a1 1 0 0 1 1 1v7H2V7a1 1 0 0 1 1-1z"/>',
  hostel:'<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
  inv:'<path d="M21 8V21H3V8M1 3h22v5H1zM10 12h4"/>',
  fees:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  payroll:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>',
  expense:'<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  mail:'<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/>',
  phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',
  comm:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  lms:'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  reports:'<path d="M3 3v18h18"/><path d="M7 16l4-6 4 3 5-8"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6 1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  roles:'<path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/>',
  bio:'<path d="M5.5 9.5A8 8 0 0 1 18 8M7 13a5 5 0 0 1 9-3M12 11a2 2 0 0 0-2 2c0 1.6.5 3.2 1.2 4.6M8.6 19a11 11 0 0 1-1.6-6 5 5 0 0 1 10 0c0 1 .1 2 .3 3M12.2 13c0 2.6.6 4.7 1.6 6.6"/>',
  visitor:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M6 16a3 3 0 0 1 6 0M15 9h3M15 13h2"/>',
  behaviour:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  health:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
  cafeteria:'<path d="M5 2v6M8 2v6M5 8a1.5 1.5 0 0 0 3 0M6.5 8v14M16 2c-1.2 1.5-1.7 3.5-1.7 6 0 1.3.7 2 1.7 2v12"/>',
  cert:'<circle cx="12" cy="8" r="6"/><path d="M8.2 13.5 7 22l5-3 5 3-1.2-8.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  filter:'<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
  bell:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  arrow:'<path d="M5 12h14M12 5l7 7-7 7"/>',
  ai:'<path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.4"/>',
  alumni:'<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5"/><path d="M22 10v5"/>',
  facilities:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  helpdesk:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.4"/><path d="M5.6 5.6l3 3M18.4 5.6l-3 3M5.6 18.4l3-3M18.4 18.4l-3-3"/>',
  survey:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3M8 11l2 2 4-4M8 16h4"/>',
  audit:'<path d="M22 12h-4l-3 8L9 4l-3 8H2"/>'
};
function ic(n,w=18){return `<svg class="ic" width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[n]||''}</svg>`}

/* ============ NAV CONFIG ============ */
const NAV = [
 {group:'Overview', items:[ {id:'dashboard',label:'Dashboard',icon:'dash'} ]},
 {group:'People', items:[
   {id:'admissions',label:'Admissions',icon:'admiss',tag:'12',roles:['Administrator','Principal']},
   {id:'crm',label:'Enrolment CRM',icon:'crm',roles:['Administrator','Principal']},
   {id:'students',label:'Students',icon:'students'},
   {id:'staff',label:'Staff & HR',icon:'staff',roles:['Administrator','Principal','Accountant']},
   {id:'parents',label:'Parents',icon:'parents',roles:['Administrator','Principal']},
   {id:'certificates',label:'Certificates',icon:'cert',roles:['Administrator','Principal']},
   {id:'alumni',label:'Alumni',icon:'alumni',roles:['Administrator','Principal']},
 ]},
 {group:'Academics', items:[
   {id:'classes',label:'Classes & Sections',icon:'classes',roles:['Administrator','Principal','Teacher']},
   {id:'timetable',label:'Timetable',icon:'tt'},
   {id:'attendance',label:'Attendance',icon:'att'},
   {id:'exams',label:'Exams & Gradebook',icon:'exam'},
   {id:'curriculum',label:'Curriculum',icon:'curric',roles:['Administrator','Principal','Teacher']},
   {id:'lms',label:'Learning (LMS)',icon:'lms'},
   {id:'behaviour',label:'Behaviour',icon:'behaviour',roles:['Administrator','Principal','Teacher']},
 ]},
 {group:'Wellbeing', items:[
   {id:'health',label:'Health & Clinic',icon:'health',roles:['Administrator','Principal']},
   {id:'cafeteria',label:'Cafeteria',icon:'cafeteria',roles:['Administrator','Principal','Parent']},
 ]},
 {group:'Finance', items:[
   {id:'fees',label:'Fees & Invoicing',icon:'fees',roles:['Administrator','Principal','Accountant','Parent']},
   {id:'payroll',label:'Payroll',icon:'payroll',roles:['Administrator','Accountant']},
   {id:'expenses',label:'Expenses',icon:'expense',roles:['Administrator','Accountant']},
 ]},
 {group:'Operations', items:[
   {id:'library',label:'Library',icon:'lib'},
   {id:'transport',label:'Transport',icon:'trans'},
   {id:'hostel',label:'Hostel',icon:'hostel',roles:['Administrator','Principal']},
   {id:'inventory',label:'Inventory',icon:'inv',roles:['Administrator','Principal','Accountant']},
   {id:'biometric',label:'Biometric Sync',icon:'bio',roles:['Administrator','Principal']},
   {id:'visitors',label:'Visitor Management',icon:'visitor',roles:['Administrator','Principal']},
   {id:'facilities',label:'Facilities & Bookings',icon:'facilities',roles:['Administrator','Principal','Teacher']},
   {id:'helpdesk',label:'Helpdesk',icon:'helpdesk',roles:['Administrator','Principal','Teacher','Accountant']},
 ]},
 {group:'Engagement', items:[
   {id:'comm',label:'Communication',icon:'comm'},
   {id:'calendar',label:'Events Calendar',icon:'cal'},
   {id:'surveys',label:'Surveys & Feedback',icon:'survey',roles:['Administrator','Principal','Teacher']},
 ]},
 {group:'Insights', items:[
   {id:'aiinsights',label:'AI Insights',icon:'ai',roles:['Administrator','Principal']},
   {id:'reports',label:'Reports & Analytics',icon:'reports',roles:['Administrator','Principal','Accountant']},
 ]},
 {group:'System', items:[
   {id:'roles',label:'Roles & Access',icon:'roles',roles:['Administrator']},
   {id:'audit',label:'Audit Log',icon:'audit',roles:['Administrator']},
   {id:'settings',label:'Settings',icon:'settings',roles:['Administrator','Principal']},
 ]},
];

const ROLES=['Administrator','Principal','Teacher','Accountant','Parent','Student'];
const state={role:'Administrator',module:'dashboard'};

/* ---- Toggleable platform modules (single source of truth for Settings) ---- */
const OPTIONAL=[
 {id:'admissions',label:'Admissions'},{id:'crm',label:'Enrolment CRM'},{id:'attendance',label:'Attendance'},{id:'exams',label:'Examinations'}, {id:'curriculum',label:'Curriculum'},{id:'lms',label:'LMS'},{id:'behaviour',label:'Behaviour'},
 {id:'health',label:'Health & Clinic'},{id:'cafeteria',label:'Cafeteria'},{id:'certificates',label:'Certificates'},
 {id:'fees',label:'Fees & Finance'},{id:'payroll',label:'Payroll'},{id:'expenses',label:'Expenses'},
 {id:'library',label:'Library'},{id:'transport',label:'Transport'},{id:'hostel',label:'Hostel'},
 {id:'inventory',label:'Inventory'},{id:'biometric',label:'Biometric Sync'},{id:'visitors',label:'Visitor Management'},
 {id:'comm',label:'Communication'},{id:'calendar',label:'Events Calendar'},{id:'reports',label:'Reports & Analytics'},
 {id:'aiinsights',label:'AI Insights'},{id:'alumni',label:'Alumni'},{id:'facilities',label:'Facilities & Bookings'},
 {id:'helpdesk',label:'Helpdesk'},{id:'surveys',label:'Surveys & Feedback'},{id:'audit',label:'Audit Log'},
];
state.modules={};OPTIONAL.forEach(m=>state.modules[m.id]=true);
['hostel','visitors','cafeteria'].forEach(id=>state.modules[id]=false); // off by default for this demo school
// Core modules are structural and can NEVER be disabled or hidden — Settings must always be reachable.
const CORE=new Set(['dashboard','students','staff','parents','classes','timetable','roles','settings']);
const OPTIONAL_IDS=new Set(OPTIONAL.map(m=>m.id));
function modOn(id){if(CORE.has(id))return true;if(!OPTIONAL_IDS.has(id))return true;return state.modules[id]===true}
const MODULE_DEPS={fees:['admissions','cafeteria'],students:['admissions','attendance','exams','fees'],attendance:['reports']};
function toggleModule(id){
  if(CORE.has(id)||!OPTIONAL_IDS.has(id))return; // never toggle core modules
  const willDisable=state.modules[id];
  if(willDisable&&MODULE_DEPS[id]){const deps=MODULE_DEPS[id].filter(d=>state.modules[d]!==false);if(deps.length){toast('Warning: '+deps.join(', ')+' depend on this module — disabling may break those workflows. Disabled anyway.')}}
  state.modules[id]=!state.modules[id];
  if(!state.modules[id]&&state.module===id)state.module='dashboard';
  logAudit((state.modules[id]?'Enabled':'Disabled')+' module - '+id,'Settings');
  renderNav();render();
  toast((OPTIONAL.find(m=>m.id===id)||{}).label+' '+(state.modules[id]?'enabled':'disabled'));
}
/* ---- per-module filter state (functional segmented controls) ---- */
state.filters={};
function getFilter(mod,def){return state.filters[mod]!=null?state.filters[mod]:def}
function setFilter(mod,val){state.filters[mod]=val;render();$('#view').scrollTop=0}
function segBtns(mod,opts,def){return `<div class="seg">${opts.map(o=>`<button class="${getFilter(mod,def)===o?'on':''}" onclick="setFilter('${mod}','${o}')">${o}</button>`).join('')}</div>`}
function getSubTab(mod,def){return (state.subTab&&state.subTab[mod])||def}
function setSubTab(mod,tab){state.subTab=state.subTab||{};state.subTab[mod]=tab;render()}
function subTabs(mod,tabs){const cur=getSubTab(mod,tabs[0][0]);return `<div class="subtabs">${tabs.map(t=>`<button class="${cur===t[0]?'on':''}" onclick="setSubTab('${mod}','${t[0]}')">${t[2]?ic(t[2],15):''}${t[1]}</button>`).join('')}</div>`}

