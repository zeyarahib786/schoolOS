/* ---- Behaviour ---- */
M.behaviour=()=>{const merits=BEHAVIOUR.filter(b=>b.type==='Merit').length;const incidents=BEHAVIOUR.filter(b=>b.type==='Incident').length;
 const detentions=BEHAVIOUR.filter(b=>b.type==='Detention').length;const houses=houseLbRows().sort((a,b)=>b[1]-a[1]);const topHouse=houses[0]||['-',0];
 return `
  <div class="page-head"><div class="ph-l"><h2>Behaviour</h2><p>Merits, incidents, detentions and pastoral notes — house points roll up to the leaderboard.</p></div>
  <div class="ph-r"><button class="btn" onclick="openDrawer(houseLeaderboard())">${ic('roles',16)} Leaderboard</button><button class="btn primary" onclick="logBehaviourForm()">${ic('plus',16)} Log entry</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('behaviour','#17A24A','Merits logged',String(merits),{dir:'flat',v:'live',note:'computed'},"setFilter('behaviour','Merits')")}${kpi('exam','#E11D2A','Incidents',String(incidents),null,"setFilter('behaviour','Incidents')")}
    ${kpi('roles','#2563EB','Top house',topHouse[0],{dir:'flat',v:topHouse[1]+' pts',note:''},"openDrawer(houseLeaderboard())")}${kpi('students','#0E7C39','Detentions',String(detentions),null,"setFilter('behaviour','Detentions')")}</div>
  <div class="card pad"><div class="flex ac jb" style="margin-bottom:12px;flex-wrap:wrap;gap:8px"><h3 style="font-size:15px">Recent entries</h3>
  ${segBtns('behaviour',['All','Merits','Incidents','Detentions','Pastoral notes'],'All')}</div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Class</th><th>Type</th><th>Note</th><th class="right">Points</th><th>Date</th></tr></thead><tbody>
  ${BEHAVIOUR.filter(b=>{const f=getFilter('behaviour','All');if(f==='All')return true;if(f==='Merits')return b.type==='Merit';if(f==='Incidents')return b.type==='Incident';if(f==='Detentions')return b.type==='Detention';if(f==='Pastoral notes')return b.type==='Pastoral note';return true}).map(b=>`<tr style="cursor:pointer" onclick="openDrawer(behaviourDetail('${b.name}'))"><td>${cellUser(b.name,'')}</td><td class="num">${b.cls}</td><td>${chip(b.type,b.c)}</td><td>${b.note}</td>
    <td class="right num" style="font-weight:700;color:${b.pts[0]==='+'?'var(--brand-deep)':'var(--red)'}">${b.pts}</td><td class="num">${b.date}</td></tr>`).join('')}
  </tbody></table></div></div>`};

