/* ---- Biometric Sync ---- */
M.biometric=()=>`
  <div class="page-head"><div class="ph-l"><h2>Biometric Sync</h2><p>Face, fingerprint and card devices feeding live attendance into the register.</p></div>
  <div class="ph-r"><button class="btn" onclick="syncBio()">${ic('bio',16)} Sync now</button><button class="btn primary" onclick="formDrawer('Add device','Register a biometric terminal',[{label:'Location',key:'location',req:true,ph:'e.g. Main Gate'},{label:'Mode',key:'mode',opts:['Face','Fingerprint','Card','Face + Card']}],'Add device','','addDevice')">${ic('plus',16)} Add device</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('bio','#17A24A','Devices online','4 / 5',null)}${kpi('att','#2563EB','Punches today','1,786',{dir:'up',v:'live',note:'syncing'})}
    ${kpi('comm','#E11D2A','Offline','1',{dir:'down',v:'Sports Complex',note:''})}${kpi('reports','#0E7C39','Last full sync','12s ago',null)}</div>
  <div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Device status</h3></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Location</th><th>Mode</th><th class="right">Punches today</th><th>Last sync</th><th>Status</th></tr></thead><tbody>
  ${BIODEVICES.map(d=>`<tr style="cursor:pointer" onclick="openDrawer(bioDetail('${d.loc}'))"><td style="font-weight:600;color:var(--slate-900)">${d.loc}</td><td><span class="badge b-gray"><span class="bd"></span>${d.type}</span></td><td class="right num">${d.punches.toLocaleString('en-AE')}</td><td class="num">${d.sync}</td>
    <td>${chip(d.status,d.status==='Online'?'green':'red')}</td></tr>`).join('')}
  </tbody></table></div></div>`;
window.syncBio=function(){BIODEVICES.forEach(d=>{d.sync='Just now';d.status='Online'});render();toast('All devices synced · register updated')};
window.addDevice=function(v){const loc=(v.location||'').trim();if(!loc){toast('Location is required');return false}BIODEVICES.unshift({loc,type:v.mode||'Face',punches:0,sync:'Just now',status:'Online'});closeDrawer();render();toast('Device added · '+loc);return false};

