/* ---- Transport ---- */
let TRANS_INCIDENTS=[];
function routeDetail(routeName){const r=ROUTES.find(x=>x.r===routeName);if(!r)return '';const riderList=STUDENTS.filter((s,i)=>ROUTES[i%ROUTES.length]===r).slice(0,6);const live=routeLiveProgress(r);const onRoad=r.status!=='Depot';
 return detailDrawer({title:r.r,sub:r.bus+' - '+r.driver,color:r.status==='Delayed'?'#E11D2A':r.status==='Depot'?'#64748B':'#17A24A',badge:ic('trans',18),
  stats:[['Status',r.status,r.status==='Delayed'?'red':r.status==='Depot'?'gray':'green'],['Occupancy',r.riders+'/'+r.cap,r.riders/r.cap>=0.95?'amber':'green'],['On-time',r.onTime+'%',r.onTime<95?'red':'green'],['Riders shown',String(riderList.length),'blue']],
  sections:[{h:'Route',rows:[['Bus',r.bus],['Driver',r.driver],['Driver phone',r.driverPhone||'-'],['GPS device',r.gpsId||'-'],['Capacity',String(r.cap)],['Current riders',String(r.riders)]]},
   {h:'Stops',html:(r.stops&&r.stops.length)?('<div class="card pad" style="box-shadow:none">'+r.stops.map((st,i)=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft)"><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:12.5px">'+(i+1)+'. '+st.name+'</div><div class="muted" style="font-size:11px">'+(st.address&&st.address!=='-'?st.address+(st.pincode&&st.pincode!=='-'?' - '+st.pincode:'')+' - ':'')+'Scheduled '+st.time+'</div></div></div>').join('')+(onRoad?'<div style="padding-top:8px"><a class="btn sm" target="_blank" href="https://www.google.com/maps?q='+live.lat.toFixed(5)+','+live.lng.toFixed(5)+'" onclick="logAudit(\'Viewed live location - '+r.r.replace(/'/g,"\\'")+'\',\'Transport\')">'+ic('trans',12)+' View live location - next: '+(live.nextStop||'Arriving')+'</a></div>':'')+'</div>'):'<div class="muted" style="font-size:12.5px">No stops on file - edit the route to add its stop list.</div>'},
   {h:'Sample riders on this route',html:riderList.length?'<div class="card pad" style="box-shadow:none">'+riderList.map(s=>'<div class="lrow" style="cursor:pointer;border-bottom:1px solid var(--line-soft)" onclick="closeDrawer();openDrawer(studentProfile(\''+s.id+'\'))">'+avatar(s.name)+'<div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:12.5px">'+s.name+'</div><div class="muted" style="font-size:11px">'+s.grade+'</div></div></div>').join('')+'</div>':'<div class="muted" style="font-size:12.5px">No riders linked in demo data.</div>'}],
  footer:canWrite()?[['Report incident',"reportTransportIncident('"+r.r.replace(/'/g,"\'")+"')"],[r.status==='Delayed'?'Mark on-time':'Mark delayed',"toggleRouteDelay('"+r.r.replace(/'/g,"\'")+"')",true]]:[['Close','closeDrawer()',true]]})}
window.toggleRouteDelay=function(routeName){const r=ROUTES.find(x=>x.r===routeName);if(!r)return;r.status=r.status==='Delayed'?'On road':'Delayed';logAudit((r.status==='Delayed'?'Marked delayed - ':'Marked on-time - ')+routeName,'Transport');closeDrawer();render();openDrawer(routeDetail(routeName));toast(routeName+' - '+r.status)};
function reportTransportIncident(routeName){state._transRoute=routeName;formDrawer('Report transport incident',routeName,[
 {label:'Type',key:'type',opts:['Mechanical issue','Traffic delay','Accident (minor)','Student behaviour','Route deviation'],req:true},
 {label:'Severity',key:'severity',opts:['Minor','Moderate','Serious'],half:true},{label:'Location',key:'location',half:true},
 {label:'Description',key:'desc',area:true,req:true}],'Log incident','','saveTransportIncident')}
window.saveTransportIncident=function(v){const route=state._transRoute;TRANS_INCIDENTS.unshift({route,type:v.type,severity:v.severity||'Minor',location:v.location||'-',desc:v.desc,time:'Just now',status:'Open'});
 logAudit('Reported transport incident - '+route+' - '+v.type,'Transport');closeDrawer();render();toast('Incident logged - '+route);return false};
function vehicleDetail(plate){const r=ROUTES.find(x=>x.bus===plate);const fa=FLEETADD.find(x=>x.plate===plate);
 const cap=r?r.cap:(fa?fa.cap:0);const driver=r?r.driver:(fa?fa.driver:'Unassigned');const route=r?r.r:'Unassigned';
 return detailDrawer({title:plate,sub:driver+' - '+route,color:'#2563EB',badge:ic('trans',18),
  stats:[['Capacity',String(cap),'blue'],['Route',route,'blue'],['Status',r?(r.status==='Delayed'?'On road (delayed)':r.status):'At depot','green']],
  sections:[{h:'Vehicle',rows:[['Driver',driver],['Assigned route',route],['Capacity',cap+' seats']]}],
  footer:canWrite()?[['Schedule maintenance',"scheduleMaintenance('"+plate.replace(/'/g,"\'")+"')",true]]:[['Close','closeDrawer()',true]]})}
window.scheduleMaintenance=function(plate){if(!canWrite())return;const r=ROUTES.find(x=>x.bus===plate);if(r)r.status='Depot';logAudit('Scheduled maintenance - '+plate,'Transport');closeDrawer();render();toast('Maintenance scheduled - '+plate+' taken off route')};
M.transport=()=>{const tab=getSubTab('trans-v','routes');const totRiders=ROUTES.reduce((a,r)=>a+r.riders,0);const delayed=ROUTES.filter(r=>r.status==='Delayed');
 const avgOnTime=ROUTES.length?Math.round(ROUTES.reduce((a,r)=>a+r.onTime,0)/ROUTES.length):100;
 return `
  <div class="page-head"><div class="ph-l"><h2>Transport</h2><p>Routes, vehicles, drivers and live boarding — ${ROUTES.length} routes shown.</p></div>
  <div class="ph-r"><button class="btn" onclick="openDrawer(transportLiveMap())">${ic('trans',16)} Live map</button><button class="btn primary" onclick="addRouteForm()">${ic('plus',16)} Add route</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('trans','#17A24A','Active routes',String(ROUTES.length),null,"setSubTab('trans-v','routes')")}${kpi('students','#2563EB','Riders',String(totRiders),null,"setSubTab('trans-v','riders')")}
    ${kpi('comm','#E2920C','Alerts',String(delayed.length),delayed.length?{dir:'flat',v:delayed[0].r,note:'delayed'}:null,"openDrawer(transportAlertsDrawer())")}${kpi('reports','#0E7C39','On-time',avgOnTime+'%',{dir:avgOnTime>=95?'up':'down',v:'avg',note:'across routes'})}</div>
  ${subTabs('trans-v',[['routes','Routes','trans'],['fleet','Fleet & drivers','settings'],['riders','Riders','students']])}
  ${tab==='fleet'?transFleet():tab==='riders'?transRiders():transRoutes()}`};
function transportAlertsDrawer(){const delayed=ROUTES.filter(r=>r.status==='Delayed');
 return detailDrawer({title:'Transport alerts',sub:delayed.length+' route(s) currently delayed',color:'#E11D2A',badge:ic('comm',18),
  sections:[{h:'Delayed routes',html:delayed.length?'<div class="card pad" style="box-shadow:none">'+delayed.map(r=>'<div class="lrow" style="cursor:pointer;border-bottom:1px solid var(--line-soft)" onclick="closeDrawer();openDrawer(routeDetail(\''+r.r.replace(/\x27/g,"\\\x27")+'\'))"><div style="flex:1;font-size:12.5px;font-weight:600">'+r.r+'</div><span class="muted" style="font-size:11px">'+r.driver+'</span></div>').join('')+'</div>':'<div class="muted" style="font-size:12.5px">No delays right now.</div>'},
   {h:'Recent incidents',html:TRANS_INCIDENTS.length?'<div class="card pad" style="box-shadow:none">'+TRANS_INCIDENTS.slice(0,5).map(t=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft)"><div style="flex:1"><div style="font-size:12.5px;font-weight:600">'+t.type+' - '+t.route+'</div><div class="muted" style="font-size:11px">'+t.desc+'</div></div>'+chip(t.severity,t.severity==='Serious'?'red':t.severity==='Moderate'?'amber':'gray')+'</div>').join('')+'</div>':'<div class="muted" style="font-size:12.5px">No incidents logged.</div>'}],
  footer:[['Close','closeDrawer()',true]]})}
function transRoutes(){return `<div class="grid cols-2">
  ${ROUTES.map(r=>{const pct=Math.round(r.riders/r.cap*100);const st=r.status==='Delayed'?'red':r.status==='Depot'?'gray':'green';
    return `<div class="card pad" style="cursor:pointer" onclick="openDrawer(routeDetail('${r.r.replace(/'/g,"\'")}'))"><div class="flex ac jb"><div style="font-weight:600;color:var(--slate-900);font-size:14.5px">${r.r}</div>${chip(r.status,st)}</div>
    <div class="muted" style="font-size:12.5px;margin:6px 0 14px">${r.bus} · ${r.driver}</div>
    <div class="flex ac jb" style="margin-bottom:6px"><span class="muted" style="font-size:12px">Occupancy</span><span class="num" style="font-weight:600;color:var(--slate-900);font-size:12.5px">${r.riders}/${r.cap}</span></div>
    ${cbar(pct,pct>=95?'amber':'green')}
    <div class="flex ac jb mt-s"><span class="muted" style="font-size:12px">On-time rate</span><span class="num" style="font-weight:600;color:${r.onTime<95?'var(--red)':'var(--brand-deep)'};font-size:12.5px">${r.onTime}%</span></div></div>`}).join('')}
  </div>`}
function transFleet(){const totalVehicles=ROUTES.length+FLEETADD.length;const dueService=Math.max(1,Math.round(totalVehicles*0.11));return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:6px"><h3 style="font-size:15px">Fleet & drivers</h3><button class="btn sm" onclick="formDrawer('Add vehicle','Fleet',[{label:'Plate number',key:'plate_number',req:true},{label:'Capacity',key:'capacity',type:'number'},{label:'Driver',key:'driver'},{label:'Type',key:'type',opts:['Bus 40-seat','Bus 30-seat','Van 14-seat']}],'Add vehicle','','addVehicle')">${ic('plus',14)} Add vehicle</button></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Vehicle</th><th>Route</th><th>Driver</th><th>Capacity</th><th>Last service</th><th>Status</th></tr></thead><tbody>
  ${ROUTES.map((r,i)=>`<tr style="cursor:pointer" onclick="openDrawer(vehicleDetail('${r.bus}'))"><td class="num" style="font-weight:600;color:var(--slate-900)">${r.bus}</td><td>${r.r}</td><td>${r.driver}</td><td class="num">${r.cap} seats</td><td class="num muted">${['02 Jun','28 May','10 Jun','15 May','05 Jun','20 May'][i%6]}</td><td>${chip(r.status==='Delayed'?'On road':r.status==='Depot'?'At depot':'On road',r.status==='Delayed'?'amber':'green')}</td></tr>`).join('')}
  ${FLEETADD.map(v=>`<tr style="cursor:pointer" onclick="openDrawer(vehicleDetail('${v.plate}'))"><td class="num" style="font-weight:600;color:var(--slate-900)">${v.plate}</td><td class="muted">Unassigned</td><td>${v.driver}</td><td class="num">${v.cap} seats</td><td class="num muted">New</td><td>${chip('At depot','green')}</td></tr>`).join('')}
  </tbody></table></div>
  <div class="grid cols-3" style="margin-top:16px">${miniStat('Fleet size',totalVehicles+' vehicles','blue')}${miniStat('Licensed drivers',String(new Set(ROUTES.map(r=>r.driver).concat(FLEETADD.map(v=>v.driver))).size),'green')}${miniStat('Service due',dueService+' this month','amber')}</div></div>`}
function transRiders(){const riders=STUDENTS.slice(0,10);return `<div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Riders & route assignment</h3><span class="muted" style="font-size:12px">Students using school transport</span></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Grade</th><th>Route</th><th>Stop</th><th>Boarding</th></tr></thead><tbody>
  ${riders.map((s,i)=>`<tr style="cursor:pointer" onclick="openDrawer(studentProfile('${s.id}'))"><td>${cellUser(s.name,s.id)}</td><td>${s.grade}</td><td>${ROUTES[i%ROUTES.length].r}</td><td>${['Al Barsha','Jumeirah','Mirdif','Deira','Marina','JLT','Silicon Oasis','Motor City','Al Quoz','Festival City'][i]}</td><td>${chip(i%7===0?'Two-way':'One-way',i%7===0?'blue':'gray')}</td></tr>`).join('')}
  </tbody></table></div></div>`}

