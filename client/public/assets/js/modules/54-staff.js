/* ---- Staff ---- */
M.staff=()=>{const tab=getSubTab('staff-v','directory');return `
  <div class="page-head"><div class="ph-l"><h2>Staff & HR</h2><p>${STAFF.length} employees on the demo roster · ${STAFF.filter(s=>s.type==='Teaching').length} teaching, ${STAFF.filter(s=>s.type!=='Teaching').length} non-teaching. ${STAFF.filter(s=>s.status==='On Leave').length} on leave today.</p></div>
  <div class="ph-r"><button class="btn primary" onclick="staffOnboardForm()">${ic('plus',16)} Add employee</button></div></div>
  <div class="grid cols-4" style="margin-bottom:16px">
    ${kpi('staff','#17A24A','Total staff',String(STAFF.length),{dir:'flat',v:'live',note:'from directory'})}${kpi('att','#2563EB','Present today',String(STAFF.filter(s=>s.status!=='On Leave').length),{dir:'flat',v:Math.round(STAFF.filter(s=>s.status!=='On Leave').length/STAFF.length*100)+'%',note:''})}
    ${kpi('payroll','#0E7C39','Monthly payroll',aed(1820000),null)}${kpi('roles','#E2920C','Onboarding',String(STAFF.filter(s=>s.status==='Onboarding').length),{dir:'flat',v:'in progress',note:''})}
  </div>
  ${subTabs('staff-v',[['directory','Directory','staff'],['onboarding','Onboarding','roles'],['leave','Leave & attendance','cal']])}
  ${tab==='onboarding'?staffOnboarding():tab==='leave'?staffLeave():staffDirectory()}`};
function staffDirectory(){return `<div class="card pad"><div class="flex ac" style="gap:10px;margin-bottom:14px;flex-wrap:wrap">
    <div class="field" style="flex:1;min-width:200px"><input id="stfSearch" placeholder="Search by name or ID" oninput="filterStaff()" style="width:100%;height:40px;border:1px solid var(--line);border-radius:10px;padding:0 12px"></div>
    <div class="field sel"><select id="stfDept" onchange="filterStaff()"><option value="">All departments</option>${[...new Set(STAFF.map(s=>s.dept))].map(d=>`<option>${d}</option>`).join('')}</select></div>
    <div class="field sel"><select id="stfStatus" onchange="filterStaff()"><option value="">All statuses</option><option>Active</option><option>Onboarding</option><option>On Leave</option></select></div>
    <span class="muted" id="stfCount" style="font-size:12.5px;margin-left:auto">${STAFF.length} of ${STAFF.length} shown</span></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Employee</th><th>Role</th><th>Department</th><th>Type</th><th>Contact</th><th>Status</th><th></th></tr></thead><tbody id="stfBody">
  ${staffRows(STAFF)}
  </tbody></table></div></div>`}
function staffOnboarding(){const onb=STAFF.filter(s=>s.status==='Onboarding');return `<div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">In onboarding</h3><span class="muted" style="font-size:12px">New hires completing their joining checklist</span></div>
  ${onb.length?`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Employee</th><th>Role</th><th>Department</th><th>Started</th><th style="width:160px">Progress</th></tr></thead><tbody>
  ${onb.map(s=>{staffInit(s);const done=s.onboarding.filter(t=>t.done).length;const pct=Math.round(done/s.onboarding.length*100);return `<tr style="cursor:pointer" onclick="openDrawer(staffProfile('${s.id}'))"><td>${cellUser(s.name,s.id)}</td><td>${s.role}</td><td>${s.dept}</td><td class="num muted">${s.joined||'Today'}</td><td><div class="flex ac" style="gap:8px">${cbar(pct,pct===100?'green':'blue')}<span class="num muted" style="font-size:11px;min-width:48px">${done}/${s.onboarding.length}</span></div></td></tr>`}).join('')}
  </tbody></table></div>`:`<div class="empty"><div class="ei">${ic('roles',26)}</div><h3>No active onboarding</h3><p>New hires you add will appear here with their joining checklist.</p></div>`}</div>`}
let LEAVE=[['Sana Iqbal','Casual leave','16 Jun – 17 Jun','2 days','Approved','green'],['Khalid Noori','Sick leave','14 Jun','1 day','Approved','green'],['Grace Williams','Annual leave','22 Jun – 28 Jun','5 days','Pending','amber'],['Rohan Mehta','Casual leave','30 Jun','1 day','Pending','amber']];
function staffLeave(){return `<div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('cal','#17A24A','On leave today',String(STAFF.filter(s=>s.status==='On Leave').length||1),null)}${kpi('att','#2563EB','Avg. attendance','98%',{dir:'up',v:'staff',note:''})}
    ${kpi('roles','#E2920C','Pending requests','2',null)}${kpi('reports','#0E7C39','Leave balance','12 days',{dir:'flat',v:'avg',note:''})}</div>
  <div class="card pad"><div class="flex ac jb" style="margin-bottom:6px"><h3 style="font-size:15px">Leave requests</h3><button class="btn sm" onclick="formDrawer('Apply for leave','Staff leave request',[{label:'Employee',req:true,key:'emp'},{label:'Leave type',key:'type',opts:['Casual leave','Sick leave','Annual leave','Unpaid leave']},{label:'From',type:'date',key:'from'},{label:'To',type:'date',key:'to'},{label:'Reason',area:true,key:'reason'}],'Submit request','','addStaffLeave')">${ic('plus',14)} Apply</button></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Duration</th><th>Status</th><th></th></tr></thead><tbody>
  ${LEAVE.map((l,i)=>`<tr><td>${cellUser(l[0],'')}</td><td>${l[1]}</td><td class="num">${l[2]}</td><td>${l[3]}</td><td>${chip(l[4],l[5])}</td><td class="right">${l[4]==='Pending'?`<span class="flex ac" style="gap:6px;justify-content:flex-end"><button class="btn sm" onclick="rejectStaffLeave(${i})">Reject</button><button class="btn sm primary" onclick="approveStaffLeave(${i})">Approve</button></span>`:`<span class="muted" style="font-size:12px">—</span>`}</td></tr>`).join('')}
  </tbody></table></div></div>`}

