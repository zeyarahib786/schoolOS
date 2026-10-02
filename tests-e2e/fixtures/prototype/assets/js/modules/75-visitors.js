/* ---- Visitor Management ---- */
M.visitors=()=>{const onsite=VISITORS.filter(v=>v.status==='On-site').length;
  return `<div class="page-head"><div class="ph-l"><h2>Visitor Management</h2><p>Front-desk check-in, gate passes and on-site visitor tracking — ${onsite} currently on-site.</p></div>
  <div class="ph-r"><button class="btn" onclick="printLatestBadge()">${ic('visitor',16)} Print badge</button><button class="btn primary" onclick="checkInVisitorForm()"">${ic('plus',16)} Check in</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('visitor','#17A24A','On-site now',String(onsite),null)}${kpi('students','#2563EB','Today total',String(VISITORS.length),null)}
    ${kpi('comm','#E2920C','Pre-approved','1',{dir:'flat',v:'expected',note:''})}${kpi('roles','#0E7C39','Avg. visit','38 min',null)}</div>
  <div class="card pad"><div class="flex ac jb" style="margin-bottom:12px"><h3 style="font-size:15px">Today's visitor log</h3>
  ${segBtns('visitors',['All','On-site','Checked out'],'All')}</div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Visitor</th><th>Purpose</th><th>Host</th><th>Check-in</th><th>Check-out</th><th>Status</th></tr></thead><tbody>
  ${VISITORS.filter(v=>{const f=getFilter('visitors','All');return f==='All'||v.status===f}).map(v=>`<tr style="cursor:pointer" onclick="openDrawer(visitorDetail('${v.name}'))"><td>${cellUser(v.name,'')}</td><td>${v.purpose}</td><td>${v.host}</td><td class="num">${v.in}</td><td class="num">${v.out}</td>
    <td>${chip(v.status,v.status==='On-site'?'green':v.status==='Pre-approved'?'amber':'gray')}</td></tr>`).join('')}
  </tbody></table></div></div>`};

