/* ---- Facilities & Bookings (Operations) ---- */

function facilityDetail(name){const f=FACILITIES.find(x=>x.name===name);state._facDate=state._facDate||DEMO_TODAY_ISO;
 return `<div class="dh"><div style="flex:1"><h3>${f.name}</h3><div class="muted" style="font-size:12.5px">${f.type} - capacity ${f.cap} - ${chip(f.status,f.status==='Available'?'green':f.status==='Maintenance'?'red':'amber')}</div></div><button class="iconbtn" onclick="closeDrawer()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
 <div class="db">${f.status==='Maintenance'?`<div class="card pad" style="margin-bottom:14px;background:rgba(225,29,42,.06);border-color:rgba(225,29,42,.25)"><span style="font-size:13px;color:var(--red);font-weight:600">Under maintenance - not bookable</span>${canWrite()?`<div style="margin-top:8px"><button class="btn sm" onclick="FACILITIES.find(x=>x.name==='${name.replace(/'/g,"\\'")}').status='Available';logAudit('Marked available - ${name.replace(/'/g,"\\'")}','Facilities');closeDrawer();render();toast('Marked available')">Mark available</button></div>`:''}</div>`:facilityCalendar(name)}</div>`}
const FAC_SLOTS=['08:00-09:00','09:00-10:00','10:00-11:00','11:00-12:00','13:00-14:00','14:00-15:00','15:00-16:00','16:00-17:00'];
const FAC_DATES=Array.from({length:7},(_,i)=>isoAddDays(DEMO_TODAY_ISO,i));
function facHourRange(time){const m=String(time).match(/^(\d+):00-(\d+):00$/);return m?{start:+m[1],end:+m[2]}:null}
function facilitySlotStatus(name,date,time){const slotR=facHourRange(time);
 const b=BOOKINGS.find(x=>{if(x.facility!==name||x.date!==date||x.status==='Cancelled')return false;const br=facHourRange(x.time);if(!br||!slotR)return x.time===time;return slotR.start<br.end&&br.start<slotR.end});
 return b?{status:'Booked',booking:b}:{status:'Available',booking:null}}
function facPad(h){return String(h).padStart(2,'0')}
function facMaxDuration(name,date,startTime){const startR=facHourRange(startTime);if(!startR)return 1;let max=0;
 for(let h=startR.start;h<startR.start+8;h++){const t=facPad(h)+':00-'+facPad(h+1)+':00';if(!FAC_SLOTS.includes(t))break;const st=facilitySlotStatus(name,date,t);if(st.status!=='Available')break;max++;}
 return Math.max(1,max);}
function pickFacilityToBook(){formDrawer('Book a facility','Pick a facility to see its live availability calendar',[
 {label:'Facility',key:'facility',opts:FACILITIES.filter(f=>f.status!=='Maintenance').map(f=>f.name),req:true}
 ],'View calendar','','openFacilityCalFromPicker')}
window.openFacilityCalFromPicker=function(v){if(!v.facility){toast('Select a facility');return false}state._facDate=DEMO_TODAY_ISO;closeDrawer();openDrawer(facilityDetail(v.facility));return false};
function slotRowHtml(name,activeDate,time,bookHandler,viewHandler){const st=facilitySlotStatus(name,activeDate,time);const open=st.status==='Available';
 return `<div role="button" tabindex="0" onclick="${open?bookHandler:viewHandler}" style="display:flex;align-items:center;gap:12px;border-radius:12px;padding:11px 14px;cursor:pointer;border:${open?'1.5px dashed var(--brand-line)':'1px solid var(--line)'};background:${open?'var(--brand-soft)':'var(--surface-2)'}">
 <div style="width:96px;font-weight:600;font-size:12.5px;color:var(--slate-900);flex:none">${ic('att',13)} ${time}</div>
 <div style="flex:1;min-width:0">${open?`<span style="font-size:12.5px;font-weight:600;color:var(--brand-deep)">Open - available to book</span>`:`<div style="font-size:12.5px;font-weight:600;color:var(--slate-900)">${st.booking.by}</div><div class="muted" style="font-size:11px">${st.booking.status}</div>`}</div>
 ${open?`<span class="badge b-green"><span class="bd"></span>Bookable</span>`:`<span class="badge ${st.booking.status==='Confirmed'?'b-blue':'b-amber'}"><span class="bd"></span>${st.booking.status}</span>`}
 </div>`}
function facilityCalendar(name){const activeDate=state._facDate||DEMO_TODAY_ISO;
 return `<div class="card pad" style="margin-bottom:14px"><div class="flex ac" style="gap:8px;margin-bottom:14px;overflow-x-auto;flex-wrap:wrap">
  ${FAC_DATES.map(d=>`<button class="btn sm ${d===activeDate?'primary':''}" onclick="state._facDate='${d}';openDrawer(facilityDetail('${name.replace(/'/g,"\'")}'))">${ic('cal',13)} ${isoLabel(d)}</button>`).join('')}
 </div>
 <div class="muted" style="font-size:11.5px;margin-bottom:10px">Dashed slots are open and bookable - solid slots are already reserved.</div>
 <div style="display:flex;flex-direction:column;gap:8px">
 ${FAC_SLOTS.map(time=>slotRowHtml(name,activeDate,time,
   `facilityBookSlot('${name.replace(/'/g,"\'")}','${activeDate}','${time}')`,
   `openDrawer(facilityBookingDetail('${name.replace(/'/g,"\'")}','${activeDate}','${time}'))`)).join('')}
 </div></div>`}
function authorizedBookers(){const office=Object.values(OFFICE_STAFF_NAMES);const teaching=STAFF.filter(s=>s.type==='Teaching'&&s.status==='Active').map(s=>s.name);
 return[...new Set([myIdentity(),...office,...teaching])]}
function facilityBookSlot(name,date,time){state._facBook={name,date,time};const maxD=facMaxDuration(name,date,time);
 formDrawer('Book '+time,name+' · '+date+' - select how many consecutive hours you need',[
  {label:'Duration',key:'duration',opts:Array.from({length:maxD},(_,i)=>(i+1)+' hour'+(i>0?'s':'')),half:true},
  {label:'Booked by',key:'by',req:true,val:myIdentity(),opts:[...authorizedBookers(),'Other (not listed)'],half:true},
  {label:'Other - enter name',key:'by_other',ph:'Full name',showIf:{key:'by',equals:'Other (not listed)'}},
  {label:'Purpose',key:'purpose',ph:'e.g. Staff meeting, Science class'}
 ],'Confirm booking','','confirmFacilityBooking')}
window.confirmFacilityBooking=function(v){const{name,date,time}=state._facBook||{};if(!name)return false;
 const hours=parseInt((v.duration||'1'),10)||1;const startR=facHourRange(time);if(!startR){toast('Invalid slot');return false}
 const endHour=startR.start+hours;const fullRange=facPad(startR.start)+':00-'+facPad(endHour)+':00';
 for(let h=startR.start;h<endHour;h++){const t=facPad(h)+':00-'+facPad(h+1)+':00';if(!FAC_SLOTS.includes(t)){toast('Requested duration goes beyond opening hours - choose fewer hours');closeDrawer();openDrawer(facilityDetail(name));return false}
  const check=facilitySlotStatus(name,date,t);if(check.status!=='Available'){toast('That range is no longer fully available - '+t+' was just taken. Pick another time or duration.');closeDrawer();openDrawer(facilityDetail(name));return false}}
 const bookedBy=(v.by==='Other (not listed)'?(v.by_other||'').trim():v.by)||myIdentity();
 if(v.by==='Other (not listed)'&&!bookedBy){toast('Enter the name of who is booking');return false}
 const booking={facility:name,by:bookedBy,date,time:fullRange,status:'Confirmed',purpose:v.purpose||''};BOOKINGS.unshift(booking);
 const fac=FACILITIES.find(x=>x.name===name);if(fac)fac.status='Booked';
 logAudit('Booked facility - '+name+' '+date+' '+fullRange+' ('+hours+'h)','Facilities');closeDrawer();render();openDrawer(facilityDetail(name));toast('Booked - '+name+' · '+fullRange+' ('+hours+' hour'+(hours>1?'s':'')+') - remaining slots updated');return false};
function facilityBookingDetail(name,date,time){const st=facilitySlotStatus(name,date,time);if(st.status==='Available')return '';const b=st.booking;
 return detailDrawer({title:name,sub:date+' · '+b.time,color:'#2563EB',badge:ic('facilities',18),
  stats:[['Booked by',b.by,'blue'],['Status',b.status,b.status==='Confirmed'?'green':'amber'],['Date',date,'gray'],['Time',b.time,'gray']],
  sections:[{h:'Details',rows:[['Purpose',b.purpose||'-'],['Facility',name]]}],
  footer:canWrite()?[['Cancel booking',"facilityCancelBooking('"+name.replace(/'/g,"\'")+"','"+date+"','"+b.time+"')",true]]:[['Close','closeDrawer()',true]]})}
window.facilityCancelBooking=function(name,date,time){const idx=BOOKINGS.findIndex(b=>b.facility===name&&b.date===date&&b.time===time&&b.status!=='Cancelled');if(idx>=0)BOOKINGS.splice(idx,1);
 const stillHasAny=BOOKINGS.some(b=>b.facility===name&&b.status!=='Cancelled');const fac=FACILITIES.find(x=>x.name===name);if(fac&&fac.status==='Booked'&&!stillHasAny)fac.status='Available';
 logAudit('Cancelled facility booking - '+name+' '+date+' '+time,'Facilities');closeDrawer();render();openDrawer(facilityDetail(name));toast('Booking cancelled - slot freed')};
M.facilities=()=>{const avail=FACILITIES.filter(f=>f.status==='Available').length;
  return `<div class="page-head"><div class="ph-l"><h2>Facilities & Bookings</h2><p>Rooms, labs, halls and shared resources with live availability and scheduling.</p></div>
  <div class="ph-r"><button class="btn primary" onclick="pickFacilityToBook()">${ic('plus',16)} Book facility</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('facilities','#17A24A','Facilities',String(FACILITIES.length),null)}${kpi('cal','#2563EB','Bookings today',String(BOOKINGS.filter(b=>b.date===DEMO_TODAY_ISO&&b.status!=='Cancelled').length),null)}
    ${kpi('reports','#0E7C39','Available now',String(avail),{dir:'flat',v:'of '+FACILITIES.length,note:''})}${kpi('expense','#E11D2A','Under maintenance',String(FACILITIES.filter(f=>f.status==='Maintenance').length),null)}</div>
  <div class="grid cols-3" style="margin-bottom:18px">
  ${FACILITIES.map(f=>`<div class="card pad" style="cursor:pointer" onclick="openDrawer(facilityDetail('${f.name}'))"><div class="flex ac jb"><h3 style="font-size:14.5px">${f.name}</h3>${chip(f.status,f.status==='Available'?'green':f.status==='Maintenance'?'red':'amber')}</div>
    <div class="muted" style="font-size:12.5px;margin:6px 0 4px">${f.type}</div><div class="flex ac jb mt-s"><span class="muted" style="font-size:12px">Capacity</span><span class="num" style="font-weight:600;color:var(--slate-900)">${f.cap}</span></div></div>`).join('')}
  </div>
  <div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Today's & upcoming bookings</h3></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Facility</th><th>Booked by</th><th>Date</th><th>Time</th><th>Status</th></tr></thead><tbody>
  ${BOOKINGS.map(b=>`<tr><td style="font-weight:600;color:var(--slate-900)">${b.facility}</td><td>${b.by}</td><td>${b.date}</td><td class="num">${b.time}</td><td>${chip(b.status,b.status==='Confirmed'?'green':'amber')}</td></tr>`).join('')}
  </tbody></table></div></div>`};

