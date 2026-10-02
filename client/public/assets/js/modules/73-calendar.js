/* ---- Events Calendar ---- */
function calKpis(){return {up:EVENTS.filter(e=>e.status!=='Cancelled').length,ex:EVENTS.filter(e=>e.tag==='Exam').length,hol:EVENTS.filter(e=>e.tag==='Holiday').length}}
function evDetail(i){const e=EVENTS[i];if(!e)return '';
 return detailDrawer({title:e.t,sub:(e.mon||'Jun')+' '+e.d+' · '+e.tag,color:CVAR[e.c],badge:ic('cal',18),
  stats:[['Type',e.tag,e.c],['Date',(e.mon||'Jun')+' '+e.d,'blue'],['Audience',e.sub||'Whole school','green'],['Status',e.status||'Published',e.status==='Cancelled'?'red':e.status==='Draft'?'amber':'green']],
  sections:[{h:'Details',rows:[['Confirmation ID',e.eid||'-'],['Venue',e.venue||'Main campus'],...(e.time?[['Time',e.time]]:[]),['Description',e.sub||'-'],['Reminders','7 days & 1 day before via app + email']]},
   {h:'Linked modules',rows:[['Facilities',e.venue?'Booking confirmed - shares the same ledger as Facilities & Bookings, so this room cannot be double-booked':'-'],['Exams',e.tag==='Exam'?'Date-sheet linked':'-'],['Transport',e.tag==='Event'?'Bus plan required':'Standard routes']]}],
  footer:e.status==='Cancelled'?[['Restore event','EVENTS['+i+'].status=\'Published\';logAudit(\'Restored event - '+e.t.replace(/'/g,'')+'\',\'Calendar\');closeDrawer();render();toast(\'Event restored\')',true]]
   :e.status==='Draft'?[['Cancel','cancelEvent('+i+')'],['Publish now','publishDraftEvent('+i+')',true]]
   :[['Cancel event','cancelEvent('+i+')'],['Reschedule','rescheduleEventForm('+i+')'],['Notify audience','logAudit(\'Notified audience - '+e.t.replace(/'/g,'')+'\',\'Calendar\');closeDrawer();toast(\'Notification queued to '+(e.sub||'whole school').replace(/'/g,'')+'\')',true]]})}
window.cancelEvent=function(i){const e=EVENTS[i];if(!e)return;e.status='Cancelled';
 if(e.venue&&e.isoDate&&e.time){const bk=BOOKINGS.find(b=>b.facility===e.venue&&b.date===e.isoDate&&b.time===e.time&&b.status!=='Cancelled');
  if(bk){bk.status='Cancelled';const stillHasAny=BOOKINGS.some(b=>b.facility===e.venue&&b.status!=='Cancelled');const fac=FACILITIES.find(x=>x.name===e.venue);if(fac&&fac.status==='Booked'&&!stillHasAny)fac.status='Available'}}
 logAudit('Cancelled event · '+e.t,'Calendar');closeDrawer();render();toast('Event cancelled — change alert sent'+(e.venue?' - venue slot freed':''))};
function calMonth(){const first=1,daysIn=30,startDow=1; /* June 2026: Mon start */
 const cells=[];for(let d=0;d<startDow;d++)cells.push('');for(let d=1;d<=daysIn;d++)cells.push(d);
 return `<div class="card pad"><div class="sec-head" style="margin-bottom:10px"><h3 style="font-size:15px">June 2026 · month view</h3><span class="muted" style="font-size:12px">Click a day to see or add events · click an event chip for details</span></div>
 <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;min-width:640px">
 ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<div class="muted" style="font-size:11px;font-weight:700;text-align:center;padding:4px">${d}</div>`).join('')}
 ${cells.map(d=>{if(d==='')return '<div></div>';const evs=EVENTS.map((e,i)=>({e,i})).filter(x=>x.e.mon==='JUN'&&parseInt(x.e.d,10)===d);
   return `<div role="button" tabindex="0" onclick="openDrawer(viewEventsOnDate('JUN','${d}','2026-06-${String(d).padStart(2,'0')}'))" style="cursor:pointer;border:1px solid var(--line);border-radius:10px;min-height:64px;padding:5px;background:${evs.length?'var(--surface-2)':'transparent'}"><div class="num muted" style="font-size:10.5px">${d}</div>
   ${evs.map(x=>`<div role="button" tabindex="0" onclick="event.stopPropagation();openDrawer(evDetail(${x.i}))" style="font-size:10px;font-weight:600;color:#fff;background:${CVAR[x.e.c]};border-radius:6px;padding:2px 5px;margin-top:3px;cursor:pointer;${x.e.status==='Cancelled'?'opacity:.45;text-decoration:line-through':''}">${x.e.t.slice(0,16)}</div>`).join('')}</div>`}).join('')}
 </div><div class="flex ac wrap" style="gap:12px;margin-top:12px;font-size:11.5px;color:var(--slate-600)">${['Exam|blue','Event|green','Holiday|amber','Meeting|red'].map(x=>{const[t,c]=x.split('|');return `<span class="flex ac" style="gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:${CVAR[c]}"></span>${t}</span>`}).join('')}</div></div>`}
M.calendar=()=>{const view=getSubTab('cal-v','list');const k=calKpis();
 return `
  <div class="page-head"><div class="ph-l"><h2>Events Calendar</h2><p>Live academic calendar — click any event for its detail, cancellation and notification workflow.</p></div>
  <div class="ph-r"><button class="btn" onclick="checkDateForm()">${ic('cal',16)} Check a date</button><button class="btn" onclick="downloadICS()">${ic('download',16)} Subscribe</button><button class="btn primary" onclick="openDrawer(newEventChooser())">${ic('plus',16)} New event</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('cal','#17A24A','Upcoming',String(k.up),{dir:'flat',v:'live',note:'computed'})}${kpi('exam','#2563EB','Exam days',String(k.ex),null)}
    ${kpi('comm','#B45309','Holidays',String(k.hol),null)}${kpi('reports','#0E7C39','Cancelled',String(EVENTS.filter(e=>e.status==='Cancelled').length),null)}</div>
  ${subTabs('cal-v',[['list','Timeline','cal'],['month','Month view','reports']])}
  ${view==='month'?calMonth():`<div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Timeline · next 2 weeks</h3></div>
  <div>${EVENTS.map((e,i)=>`<div class="flex ac" role="button" tabindex="0" onclick="openDrawer(evDetail(${i}))" onkeydown="if(event.key==='Enter')openDrawer(evDetail(${i}))" style="gap:14px;padding:13px 2px;border-bottom:1px solid var(--line-soft);cursor:pointer;${e.status==='Cancelled'?'opacity:.5':''}">
    <div style="width:52px;text-align:center;flex:none"><div class="num" style="font-family:var(--ff-display);font-weight:700;font-size:20px;color:var(--slate-900);line-height:1">${e.d}</div><div class="muted" style="font-size:10.5px;font-weight:700;text-transform:uppercase">${e.mon||'Jun'}</div></div>
    <div style="width:3px;height:34px;border-radius:3px;background:${CVAR[e.c]};flex:none"></div>
    <div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:14px;${e.status==='Cancelled'?'text-decoration:line-through':''}">${e.t}</div><div class="muted" style="font-size:12px;margin-top:2px">${e.sub}</div></div>
    ${e.status==='Cancelled'?chip('Cancelled','red'):e.status==='Draft'?chip('Draft','amber'):chip(e.tag,e.c)}</div>`).join('')}</div></div>`}`};
