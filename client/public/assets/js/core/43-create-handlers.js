/* ---- create handlers for module forms ---- */

function logBehaviourForm(){const names=STUDENTS.map(s=>s.name+' - '+s.grade);
 formDrawer('Log behaviour','Structured entry - pick the student, class fills in automatically',[
  {label:'Student',key:'student_pick',opts:names,req:true},
  {label:'Type',key:'type',opts:['Merit','Incident','Detention','Pastoral note'],half:true},{label:'Points',key:'pts',type:'number',ph:'e.g. 5 or -2',half:true},
  {label:'Severity (incidents)',key:'severity',opts:['Minor','Moderate','Serious'],half:true},{label:'Location',key:'location',ph:'e.g. Playground, Classroom 4B',half:true},
  {label:'Witness',key:'witness'},{label:'Description',key:'note',area:true,req:true,aiContext:'behaviour-note',maxlen:500}],'Save entry','','logBehaviour')}
window.logBehaviour=function(v){const pick=(v.student_pick||v.name||'').trim();if(!pick){toast('Student is required');return false}
 const name=pick.split(' - ')[0].trim();const st=STUDENTS.find(s=>s.name===name);const cls=st?st.grade.replace('Grade ','').replace(' · ','-'):(v.cls||'-');
 const ty=v.type||'Merit';const merit=ty==='Merit';const isIncident=ty==='Incident';
 const pts=(v.pts||'').toString().trim()||(merit?'+5':'-2');const ptsStr=pts[0]==='+'||pts[0]==='-'?pts:(merit?'+':'-')+pts;
 BEHAVIOUR.unshift({name,cls,type:ty,note:v.note||'',pts:ptsStr,date:'Today',c:merit?'green':ty==='Detention'?'amber':'red',severity:isIncident?(v.severity||'Minor'):null,location:v.location||null,witness:v.witness||null,reporter:state.role,status:isIncident?'Logged':null,owner:isIncident?'Pastoral team':null});
 logAudit('Logged '+ty.toLowerCase()+' - '+name+(isIncident?' ('+(v.severity||'Minor')+')':''),'Behaviour');closeDrawer();render();toast(ty+' logged for '+name);return false};
function logClinicForm(){const names=STUDENTS.map(s=>s.name+' - '+s.grade);
 formDrawer('New clinic visit','Health record - pick the student, class fills in automatically',[
  {label:'Student',key:'student_pick',opts:names,req:true},
  {label:'Severity',key:'severity',opts:['Routine','Urgent','Emergency'],half:true},{label:'Reason / symptoms',key:'reason',req:true,half:true},
  {label:'Vitals (optional)',key:'vitals',ph:'e.g. Temp 37.8°C, BP normal'},{label:'Action taken',key:'action',req:true},
  {label:'Medicine issued',key:'medicine',ph:'None, or name + dose'},{label:'Outcome',key:'outcome',opts:['Returned to class','Sent home','Referred to hospital','Under observation']}
 ],'Save visit','','logClinic')}
window.logClinic=function(v){const pick=(v.student_pick||v.name||'').trim();if(!pick){toast('Student is required');return false}
 const name=pick.split(' - ')[0].trim();const st=STUDENTS.find(s=>s.name===name);const cls=st?st.grade.replace('Grade ','').replace(' · ','-'):(v.cls||'-');
 CLINIC.unshift({name,cls,reason:v.reason||'-',action:v.action||'-',time:nowTime(),status:v.outcome==='Returned to class'?'Resolved':'Open',outcome:v.outcome||'Under observation',severity:v.severity||'Routine',vitals:v.vitals||null,medicine:v.medicine||null,parentContacted:false,staff:state.role,consent:true});
 logAudit('Logged clinic visit - '+name+' ('+(v.severity||'Routine')+')','Health');closeDrawer();render();toast('Clinic visit recorded for '+name);return false};
function checkInVisitorForm(){go('visitors');visitorsWorkspaceLoad().then(()=>visitorsWorkspaceForm())}
window.checkInVisitor=function(v){if(!(v.visitor_name||'').trim()){toast('Visitor name is required');return false}VISITORS.unshift({name:v.visitor_name,purpose:v.purpose||'Visit',host:v.host_person_visiting||'—',in:nowTime(),out:'—',status:'On-site'});closeDrawer();render();toast('Visitor checked in · badge printed');return false};
window.logExpense=function(v){if(!(v.description||'').trim()){toast('Description is required');return false}const amt=parseInt(v.amount_aed||0,10)||0;const e=EXPENSES.find(x=>x.cat===v.category);if(e)e.spent+=amt;closeDrawer();render();toast('Expense submitted for approval');return false};
window.addInventory=function(v){if(!(v.item_name||'').trim()){toast('Item name is required');return false}
 const sku=(v.sku||'').trim()||('INV-'+String(1000+INVENTORY.length+1));
 INVENTORY.unshift({sku,item:v.item_name,cat:v.category||'IT',stock:parseInt(v.quantity_in_stock||0,10)||0,min:parseInt(v.reorder_minimum||0,10)||0,unitCost:parseFloat(v.unit_cost||0)||0,supplier:v.supplier||'Unspecified',location:v.location||'Central Store',condition:'New',lastCounted:'Today',warranty:'-',movements:[]});
 logAudit('Added inventory item - '+v.item_name,'Inventory');closeDrawer();render();toast('Inventory item added - '+sku);return false};
function issueCertForm(){formDrawer('Issue certificate',window.SCHOOLOS_ADAPTER?.connected?'Record issuance for a student; signed copies require school-office verification':'Pick the student, class fills in automatically',[
 {label:'Student',key:'student_pick',opts:STUDENTS.map(s=>s.name+' - '+s.grade+' - '+s.id),req:true},
 {label:'Document type',key:'document_type',opts:['Transfer Certificate','Bonafide Letter','Character Certificate','Report Card · Term 2','Provisional Certificate']},
 ...(window.SCHOOLOS_ADAPTER?.connected?[{label:'Workflow',key:'action',opts:['Issue now','Submit for approval']}]:[]),
 {label:'Reason / notes',key:'notes',area:true,aiContext:'general',maxlen:400}
 ],window.SCHOOLOS_ADAPTER?.connected?'Issue record':'Generate document','','issueCert')}
window.issueCert=function(v){if(window.SCHOOLOS_ADAPTER?.connected){closeDrawer();toast(v.action==='Submit for approval'?'Certificate request submitted':'Certificate record issued');return false}
 const pick=(v.student_pick||v.student_name||'').trim();if(!pick){toast('Student is required');return false}
 const name=pick.split(' - ')[0].trim();const st=STUDENTS.find(s=>s.name===name);const cls=st?st.grade.replace('Grade ','').replace(' · ','-'):(v.class||'—');
 const yr=String(new Date().getFullYear()).slice(2);CERTS.unshift({name,cls,type:v.document_type||'Certificate',ref:'DOC-'+yr+'-'+String(Math.floor(1000+Math.random()*9000)),date:'Today',status:'Issued',notes:v.notes||''});
 logAudit('Issued certificate - '+name+' ('+(v.document_type||'Certificate')+')','Certificates');closeDrawer();render();toast('Certificate generated for '+name);return false};
function eventVenueConflict(dateNum,venue){if(!venue)return null;return EVENTS.find(e=>e.d===dateNum&&e.status!=='Cancelled'&&(e.venue||'').toLowerCase()===venue.toLowerCase())}
function eventsOnDate(mon,d){return EVENTS.map((e,i)=>({e,i})).filter(x=>x.e.status!=='Cancelled'&&x.e.mon===mon&&x.e.d===d)}
function monDayFromDateStr(dateStr){if(!dateStr)return null;const dt=new Date(dateStr);if(isNaN(dt.getTime()))return null;
 return{d:String(dt.getDate()),mon:['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][dt.getMonth()]}}
/* ---- Design-thinking rebuild: availability-first event booking.
   Old flow made the user type a venue name freely and only discovered conflicts after
   submitting. New flow: capture intent (what/when/how long/how many people) first, then show
   only venues that are genuinely free for that exact window - booking a slot here writes to the
   SAME BOOKINGS ledger Facilities uses, so an event and a facility booking can never double-book
   the same room. ---- */
function bookEventStep1Form(){formDrawer('Book an event','Step 1 of 2 - tell us what you need, then we\'ll show only venues that are actually free',[
 {label:'Event title',key:'title',req:true},
 {label:'Type',key:'type',opts:['Event','Meeting','Academic','Exam'],half:true},{label:'Date',key:'date',type:'date',req:true,half:true},
 {label:'Duration',key:'hours',opts:['1 hour','2 hours','3 hours','4 hours'],half:true},{label:'Minimum capacity needed',key:'mincap',type:'number',ph:'optional',half:true}
 ],'Find available venues','','bookEventFindVenues')}
window.bookEventFindVenues=function(v){if(!(v.title||'').trim()){toast('Event title is required');return false}if(!v.date){toast('Pick a date');return false}
 state._evBooking={title:v.title,type:v.type||'Event',date:v.date,hours:parseInt(v.hours||'1',10)||1,minCap:parseInt(v.mincap||'0',10)||0};
 closeDrawer();openDrawer(bookEventStep2());return false};
function bookEventStep2(){const b=state._evBooking;if(!b)return'';
 const candidates=FACILITIES.filter(f=>f.status!=='Maintenance'&&f.cap>=b.minCap);
 const sections=candidates.map(f=>{const openStarts=FAC_SLOTS.filter(t=>{const st=facilitySlotStatus(f.name,b.date,t);if(st.status!=='Available')return false;return facMaxDuration(f.name,b.date,t)>=b.hours});
   return{h:f.name+' - capacity '+f.cap,html:openStarts.length?'<div class="flex ac" style="gap:6px;flex-wrap:wrap">'+openStarts.map(t=>'<button class="btn sm primary" onclick="bookEventConfirm(\''+f.name.replace(/'/g,"\\'")+'\',\''+t+'\')">'+t.split('-')[0]+'</button>').join('')+'</div>':'<div class="muted" style="font-size:12px">No slot long enough that day.</div>'};});
 return detailDrawer({title:'Available venues',sub:b.title+' - '+isoLabel(b.date)+' - '+b.hours+'h'+(b.minCap?' - capacity ≥'+b.minCap:''),color:'#2563EB',badge:ic('facilities',18),
  sections:sections.length?sections:[{h:'No venues match',html:'<div class="muted" style="font-size:12.5px">No facility meets that capacity - try lowering the minimum.</div>'}],
  footer:[['Change details',"closeDrawer();bookEventStep1Form()"],['Close','closeDrawer()',true]]})}
window.bookEventConfirm=function(venueName,startTime){const b=state._evBooking;if(!b)return;
 const startR=facHourRange(startTime);const endHour=startR.start+b.hours;const fullRange=facPad(startR.start)+':00-'+facPad(endHour)+':00';
 for(let h=startR.start;h<endHour;h++){const t=facPad(h)+':00-'+facPad(h+1)+':00';const st=facilitySlotStatus(venueName,b.date,t);if(st.status!=='Available'){toast('That slot was just taken - pick another');openDrawer(bookEventStep2());return}}
 BOOKINGS.unshift({facility:venueName,by:myIdentity(),date:b.date,time:fullRange,status:'Confirmed',purpose:b.title});
 const fac=FACILITIES.find(x=>x.name===venueName);if(fac)fac.status='Booked';
 const md=monDayFromDateStr(b.date);const d=md?md.d:'1',mon=md?md.mon:'JUN';
 const cmap={Exam:'amber',Academic:'blue',Event:'green',Holiday:'red',Meeting:'blue'};
 const eid=nextEventId();
 EVENTS.push({d,mon,t:b.title,sub:'',tag:b.type,c:cmap[b.type]||'green',venue:venueName,isoDate:b.date,time:fullRange,status:'Published',eid});
 logAudit('Booked event with venue - '+b.title+' @ '+venueName+' '+fullRange+' ('+eid+')','Calendar');
 render();openDrawer(eventConfirmationDrawer(EVENTS.length-1));state._evBooking=null};
/* ---- Single entry point for creating any event - removes the old duplicate "Quick event" /
   "Book an event" buttons that both created an event with no clear distinction. One button, one
   guided choice. ---- */
function newEventChooser(){return detailDrawer({title:'New event',sub:'Does this event need a physical venue?',color:'#2563EB',badge:ic('cal',18),
 sections:[{h:'Choose how to create it',html:`<div style="display:flex;flex-direction:column;gap:10px">
  <div role="button" tabindex="0" onclick="closeDrawer();bookEventStep1Form()" style="cursor:pointer;border:1.5px solid var(--brand-line);background:var(--brand-soft);border-radius:12px;padding:14px">
   <div style="font-weight:700;color:var(--brand-deep);font-size:13.5px;margin-bottom:3px">${ic('facilities',15)} Yes - find and book a venue</div>
   <div class="muted" style="font-size:12px">See only the rooms that are actually free for your date, time and group size - recommended for anything happening on campus.</div></div>
  <div role="button" tabindex="0" onclick="closeDrawer();addEventForm()" style="cursor:pointer;border:1px solid var(--line);border-radius:12px;padding:14px">
   <div style="font-weight:700;color:var(--slate-900);font-size:13.5px;margin-bottom:3px">${ic('cal',15)} No - quick event (holiday, reminder, off-site)</div>
   <div class="muted" style="font-size:12px">For dates that don't need a room booking - exam days, holidays, off-site trips, general reminders.</div></div>
  </div>`}],
 footer:[['Close','closeDrawer()',true]]})}
function nextEventId(){let mx=1000;EVENTS.forEach(e=>{const n=parseInt(String(e.eid||'').split('-')[1]||0,10);if(n>mx)mx=n});return 'EVT-'+(mx+1)}
function eventConfirmationDrawer(i){const e=EVENTS[i];if(!e)return'';
 return detailDrawer({title:'Event confirmed',sub:'Confirmation ID '+e.eid,color:'#17A24A',badge:ic('cal',18),
  stats:[['Confirmation ID',e.eid,'green'],['Date',(e.mon||'Jun')+' '+e.d,'blue'],['Type',e.tag,e.c],['Status',e.status,e.status==='Draft'?'amber':'green']],
  sections:[{h:'Summary',rows:[['Event',e.t],['Venue',e.venue||'No venue (quick event)'],...(e.time?[['Time',e.time]]:[]),['Audience',e.sub||'Whole school']]}],
  footer:[['View in calendar',"closeDrawer();setSubTab('cal-v','list');go('calendar')"],['Done','closeDrawer()',true]]})}
function checkDateForm(){formDrawer('Check a date','See what is already scheduled before adding a new event',[
 {label:'Date',key:'date',type:'date',req:true}],'View day','','viewEventsOnDateSubmit')}
window.viewEventsOnDateSubmit=function(v){const md=monDayFromDateStr(v.date);if(!md){toast('Pick a valid date');return false}
 closeDrawer();openDrawer(viewEventsOnDate(md.mon,md.d,v.date));return false};
function viewEventsOnDate(mon,d,rawDate){const list=eventsOnDate(mon,d);
 return detailDrawer({title:mon+' '+d,sub:list.length+' event'+(list.length===1?'':'s')+' already scheduled this day',color:list.length?'#E2920C':'#17A24A',badge:ic('cal',18),
  sections:[{h:'Scheduled',html:list.length?'<div class="card pad" style="box-shadow:none">'+list.map(x=>'<div class="lrow" style="cursor:pointer;border-bottom:1px solid var(--line-soft)" onclick="closeDrawer();openDrawer(evDetail('+x.i+'))"><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13px">'+x.e.t+'</div><div class="muted" style="font-size:11px">'+x.e.tag+(x.e.venue?' - '+x.e.venue:'')+' - '+(x.e.status||'Published')+'</div></div></div>').join('')+'</div>':'<div class="muted" style="font-size:12.5px">Nothing scheduled - this date is free.</div>'}],
  footer:[['Add event on this date',"closeDrawer();addEventForm('"+(rawDate||'')+"')",true]]})}
function addEventForm(prefillDate){const occupied=[...new Set(EVENTS.filter(e=>e.status!=='Cancelled').map(e=>e.mon+' '+e.d))];
 formDrawer('Add event','Occupied dates: '+(occupied.slice(0,6).join(', ')||'none yet')+' - use "Check a date" to see what is already scheduled',[
  {label:'Event title',key:'event_title',req:true},{label:'Date',key:'date',type:'date',half:true,val:prefillDate||''},{label:'Type',key:'type',opts:['Exam','Academic','Event','Holiday','Meeting'],half:true},
  {label:'Venue (checked for conflicts)',key:'venue',ph:'e.g. Main Auditorium',half:true},{label:'Audience',key:'audience',half:true},
  {label:'Details',key:'details',area:true,aiContext:'event-details',maxlen:400},
  {label:'Publish',key:'action',opts:['Publish now','Save as draft']}
 ],'Save event','','addEvent')}
window.addEvent=function(v){const title=(v.event_title||'').trim();if(!title){toast('Event title is required');return false}
 let d='1',mon='JUN';if(v.date){const dt=new Date(v.date);if(!isNaN(dt.getTime())){d=String(dt.getDate());mon=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][dt.getMonth()]}}
 const dup=EVENTS.find(e=>e.d===d&&e.mon===mon&&e.status!=='Cancelled'&&e.t.trim().toLowerCase()===title.toLowerCase());
 if(dup){toast('Already scheduled: "'+title+'" is already on the calendar for '+mon+' '+d+' ('+(dup.status||'Published')+') - open that event instead of creating a duplicate');return false}
 if(v.venue){const conflict=EVENTS.find(e=>e.d===d&&e.mon===mon&&e.status!=='Cancelled'&&(e.venue||'').toLowerCase()===v.venue.toLowerCase());
  if(conflict){toast('Venue conflict: '+v.venue+' is already booked for "'+conflict.t+'" that day - choose another venue or date');return false}}
 const sameDay=eventsOnDate(mon,d);
 const cmap={Exam:'amber',Academic:'blue',Event:'green',Holiday:'red',Meeting:'blue'};const isDraft=(v.action||'')==='Save as draft';
 const eid=nextEventId();
 EVENTS.push({d,mon,t:title,sub:v.audience||'',tag:v.type||'Event',c:cmap[v.type]||'green',venue:v.venue||'',status:isDraft?'Draft':'Published',eid});
 logAudit((isDraft?'Drafted':'Published')+' event - '+title+' ('+eid+')','Calendar');render();
 openDrawer(eventConfirmationDrawer(EVENTS.length-1));return false};
window.rescheduleEventForm=function(i){const e=EVENTS[i];if(!e)return;state._rescheduleEvent=i;
 formDrawer('Reschedule event',e.t,[{label:'New date',key:'date',type:'date',req:true}],'Reschedule','','doRescheduleEvent')};
window.doRescheduleEvent=function(v){const i=state._rescheduleEvent;const e=EVENTS[i];if(!e||!v.date)return false;
 const dt=new Date(v.date);if(isNaN(dt.getTime())){toast('Invalid date');return false}
 if(e.venue&&e.isoDate&&e.time){
  const startR=facHourRange(e.time);
  if(startR){let free=true;for(let h=startR.start;h<startR.end;h++){const t=facPad(h)+':00-'+facPad(h+1)+':00';const st=facilitySlotStatus(e.venue,v.date,t);if(st.status!=='Available'){free=false;break}}
   if(!free){toast(e.venue+' is not free at '+e.time+' on that date - pick a date where the same time is open, or cancel and use Book an event to search again');return false}
   const oldBk=BOOKINGS.find(b=>b.facility===e.venue&&b.date===e.isoDate&&b.time===e.time&&b.status!=='Cancelled');
   if(oldBk)oldBk.status='Cancelled';
   BOOKINGS.unshift({facility:e.venue,by:myIdentity(),date:v.date,time:e.time,status:'Confirmed',purpose:e.t});
   e.isoDate=v.date;}}
 const oldDate=e.mon+' '+e.d;e.d=String(dt.getDate());e.mon=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][dt.getMonth()];
 logAudit('Rescheduled event - '+e.t+' from '+oldDate+' to '+e.mon+' '+e.d,'Calendar');closeDrawer();render();toast('Rescheduled - audience notified'+(e.venue?' - venue moved with it':''));return false};
window.publishDraftEvent=function(i){const e=EVENTS[i];if(e){e.status='Published';logAudit('Published draft event - '+e.t,'Calendar')}closeDrawer();render();toast('Event published')};
window.addCourse=function(v){if(!(v.course_title||'').trim()){toast('Course title is required');return false}const teacher=state.role==='Teacher'?myTeacherName():(v.teacher||'-');COURSES.unshift({t:v.course_title,teacher,cls:v.class||'-',prog:0,due:'Not started',assignments:[]});logAudit('Created course - '+v.course_title,'LMS');closeDrawer();render();toast('Course created');return false};
/* Approximate Dubai-area coordinates for common stop-name keywords, used so a plain-text stop
   entry still produces a real, plottable coordinate. Falls back to the school's own location if
   nothing matches - honest for a demo dataset, and the seam a real geocoding API would replace. */
const DXB_GEOCODE=[['marina',25.0800,55.1400],['jlt',25.0700,55.1450],['barsha',25.1140,55.2010],['jumeirah',25.2048,55.2500],['mirdif',25.2170,55.4210],['wasl',25.2010,55.2560],['deira',25.2697,55.3095],['silicon oasis',25.1270,55.3860],['motor city',25.0490,55.2400],['al quoz',25.1420,55.2280],['festival city',25.2210,55.3520]];
function geocodeStop(name){const n=(name||'').toLowerCase();const hit=DXB_GEOCODE.find(g=>n.includes(g[0]));return hit?{lat:hit[1],lng:hit[2]}:{lat:25.1150,lng:55.2010}}
function addRouteForm(){return transportWorkspaceLoad().then(()=>{go('transport');if(transportWorkspaceState().loaded)transportWorkspaceRouteForm();else toast('Wait for the transport register to load');});}
window.addRoute=function(v){if(!(v.route_name||'').trim()){toast('Route name is required');return false}
 const stopLines=(v.stops||'').split('\n').map(l=>l.trim()).filter(Boolean);
 if(!stopLines.length){toast('At least one stop is required to build the live map');return false}
 const stops=stopLines.map(line=>{const parts=line.split(',').map(x=>(x||'').trim());
  const name=parts[0],address=parts.length>=4?parts[1]:'',pincode=parts.length>=4?parts[2]:'',time=parts[parts.length-1];
  const geo=geocodeStop(name+' '+address);return{name:name||'Stop',address:address||'-',pincode:pincode||'-',time:time||'--:--',lat:geo.lat,lng:geo.lng}});
 ROUTES.unshift({r:v.route_name,bus:v.bus_plate_number||'-',driver:v.driver||'-',driverPhone:v.driver_phone||'-',riders:0,cap:parseInt(v.capacity||0,10)||40,onTime:100,status:'Depot',gpsId:v.gps_id||('GPS-'+(v.bus_plate_number||'NEW').replace(/[^0-9]/g,'')),stops});
 logAudit('Added route - '+v.route_name+' ('+stops.length+' stops)','Transport');closeDrawer();render();toast('Route added - '+stops.length+' stop(s) mapped');return false};
function recordPaymentForm(){const names=STUDENTS.map(s=>s.name+' - '+s.grade+' - '+s.id);
 formDrawer('Record payment','Fees & invoicing - pick an existing student, or choose New student / New admission',[
  {label:'Student',key:'student_pick',opts:['+ New student / new admission',...names],req:true},
  {label:'New student name',key:'new_student_name',ph:'Enter the new student\u2019s full name',showIf:{key:'student_pick',equals:'+ New student / new admission'}},
  {label:'Amount (AED)',type:'number',key:'amount_aed',req:true,half:true},{label:'Method',key:'method',opts:['Card','Bank transfer','Cash','Cheque','Online portal'],half:true},
  {label:'Reference / note',key:'reference'}
 ],'Record payment','','recordPayment')}
window.recordPayment=function(v){const amt=parseInt(v.amount_aed||0,10)||0;if(!amt){toast('Enter a payment amount');return false}
 let studentName=(v.student_pick||'').startsWith('+ New student')?(v.new_student_name||'').trim():(v.student_pick||'').split(' - ')[0].trim();
 if(!studentName){toast('Enter the new student name');return false}
 let inv=INVOICES.find(i=>i.student===studentName&&i.status!=='Paid');
 if(inv){inv.status='Paid';inv.amt=amt}else{INVOICES.unshift({id:nextNum(INVOICES,'INV'),student:studentName,term:v.method||'Payment',amt,due:dateShort(),status:'Paid'})}
 logAudit('Recorded payment - '+studentName+' - '+aed(amt),'Fees');closeDrawer();render();toast('Payment recorded - receipt ready');return false};

/* Reusable form drawer for create/record actions across modules */
function fld(f){
  if(f.section)return `<div class="form-section">${f.icon?ic(f.icon,14):''}${f.section}</div>`;
  if(f.note)return `<div class="form-note">${f.note}</div>`;
  if(f.doccap)return docCaptureHtml(f.doccap);
  const key=f.key||f.label.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  const lab=`<span style="font-size:12.5px;font-weight:600;color:var(--slate-600);display:block;margin-bottom:5px">${f.label}${f.req?'<span style="color:var(--red)"> *</span>':''}</span>`;
  let ctrl,assistBar='';
  if(f.opts)ctrl=`<select data-fkey="${key}" style="width:100%;height:40px;border:1px solid var(--line);border-radius:10px;padding:0 12px;background:#fff;appearance:none">${(f.ph?['<option value="">'+f.ph+'</option>']:[]).concat(f.opts.map(o=>`<option ${o===f.val?'selected':''}>${o}</option>`)).join('')}</select>`;
  else if(f.area){const taId=f.aiContext?('ai-'+key+'-'+Math.random().toString(36).slice(2,7)):'';
   ctrl=`<textarea ${taId?'id="'+taId+'"':''} data-fkey="${key}" rows="3" maxlength="${f.maxlen||500}" style="width:100%;border:1px solid var(--line);border-radius:10px;padding:10px 12px;resize:vertical" placeholder="${f.ph||f.label}">${f.val||''}</textarea>`;
   if(taId)assistBar=aiAssistBar(taId,f.aiContext,f.maxlen||500);}
  else ctrl=`<input data-fkey="${key}" type="${f.type||'text'}" value="${f.val||''}" style="width:100%;height:40px;border:1px solid var(--line);border-radius:10px;padding:0 12px" placeholder="${f.ph||f.label}">`;
  const showIfAttr=f.showIf?` data-showif-key="${f.showIf.key}" data-showif-eq="${String(f.showIf.equals).replace(/"/g,'&quot;')}" style="display:none;${f.half?'':''}margin-bottom:13px"`:'';
  return `<label class="${f.half?'fhalf':'ffull'}"${f.showIf?showIfAttr:' style="display:block;margin-bottom:13px"'}>${lab}${ctrl}${assistBar}</label>`}
function formCheckShowIf(root){root=root||document.getElementById('drawer');if(!root)return;const vals=readForm();
 root.querySelectorAll('[data-showif-key]').forEach(el=>{const key=el.dataset.showifKey,eq=el.dataset.showifEq;el.style.display=(vals[key]===eq)?'block':'none'})}
function readForm(){const o={};document.querySelectorAll('#drawer [data-fkey]').forEach(el=>{o[el.dataset.fkey]=(el.value||'').trim()});return o}
function formSubmit(handler,msg){const v=readForm();
  if(handler&&window[handler]){const r=window[handler](v);if(r===false)return;return;}
  closeDrawer();if(msg)toast(msg)}
function formDrawer(title,sub,fields,saveLabel,saveToast,handler){
  openDrawer(`<div class="dh"><div style="flex:1"><h3>${title}</h3><div class="muted" style="font-size:12.5px">${sub}</div></div><button class="iconbtn" onclick="closeDrawer()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
  <div class="db form-body" onchange="formCheckShowIf(this)" oninput="if(event.target.tagName==='SELECT')formCheckShowIf(this)">${fields.map(fld).join('')}</div>
  <div class="df"><button class="btn" onclick="closeDrawer()">Cancel</button><button class="btn primary" onclick="formSubmit('${handler||''}','${(saveToast||'').replace(/'/g,"\\'")}')">${saveLabel}</button></div>`);
  setTimeout(()=>formCheckShowIf(),0)}
