/* ---- Audit Log (System) ---- */
M.audit=()=>{const exps=AUDIT.filter(a=>/export/i.test(a.action)).length;const apr=AUDIT.filter(a=>/approv|reject/i.test(a.action)).length;
  const sev=a=>/delete|reject|failed/i.test(a.action)?['Critical','red']:/export|approv|permission|role/i.test(a.action)?['Warning','amber']:['Info','gray'];
  const filter=state._auditSev||'All';
  const filtered=filter==='All'?AUDIT:AUDIT.filter(a=>sev(a)[0]===filter);
  return `
  <div class="page-head"><div class="ph-l"><h2>Audit Log</h2><p>Live, append-only activity stream — ${AUDIT.length} events recorded this session. Every approval, export and sensitive action is logged.</p></div>
  <div class="ph-r">${filter!=='All'?`<button class="btn" onclick="state._auditSev='All';render()">${ic('audit',16)} Clear filter</button>`:''}<button class="btn" onclick="exportCSV('audit-log.csv',['User','Action','Module','Time','Severity'],AUDIT.map(a=>{const sv=/delete|reject|failed/i.test(a.action)?'Critical':/export|approv|permission|role/i.test(a.action)?'Warning':'Info';return [a.user,a.action,a.module,a.time,sv]}))">${ic('download',16)} Export log</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('audit','#17A24A','Events logged',String(AUDIT.length),{dir:'up',v:'live',note:'this session'},"state._auditSev='All';render()")}${kpi('roles','#2563EB','Approvals & rejections',String(apr),null,"state._auditSev='All';render()")}
    ${kpi('download','#E2920C','Exports',String(exps),null,"state._auditSev='All';render()")}${kpi('settings','#0E7C39','Log integrity','Append-only',{dir:'flat',v:'immutable',note:''})}</div>
  <div class="card pad"><div class="flex ac jb" style="margin-bottom:12px;flex-wrap:wrap;gap:8px"><h3 style="font-size:15px">Activity stream${filter!=='All'?' - '+filter:''}</h3>
   <div class="flex ac" style="gap:6px">${['All','Info','Warning','Critical'].map(sv=>`<button class="btn sm ${filter===sv?'primary':''}" onclick="state._auditSev='${sv}';render()">${sv}</button>`).join('')}</div></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>User</th><th>Action</th><th>Module</th><th>Severity</th><th>Time</th></tr></thead><tbody>
  ${filtered.slice(0,30).map(a=>{const sv=sev(a);return `<tr><td>${cellUser(a.user,'')}</td><td>${a.action}</td><td><span class="badge b-gray"><span class="bd"></span>${a.module}</span></td><td>${chip(sv[0],sv[1])}</td><td class="num muted">${a.time}</td></tr>`}).join('')}
  </tbody></table></div>
  ${filtered.length>30?`<div class="muted" style="font-size:12px;margin-top:10px">Showing 30 of ${filtered.length} events${filter!=='All'?' matching '+filter:''} · export the full log above.</div>`:filtered.length===0?`<div class="empty"><div class="ei">${ic('audit',26)}</div><h3>No ${filter.toLowerCase()} events</h3><p>Nothing matches this filter yet.</p></div>`:''}</div>`};
function auditRows(list){return list.map(a=>`<tr><td>${cellUser(a.user,a.user==='System'?'Automated':'User')}</td><td>${a.action}</td><td>${chip(a.module,'blue')}</td><td class="num muted">${a.time}</td></tr>`).join('')||`<tr><td colspan="4"><div class="empty"><div class="ei">${ic('audit',26)}</div><h3>No events match</h3></div></td></tr>`}
function filterAudit(){const q=($('#audSearch')?.value||'').toLowerCase(),m=$('#audModule')?.value||'';const rows=AUDIT.filter(a=>(a.user.toLowerCase().includes(q)||a.action.toLowerCase().includes(q))&&(!m||a.module===m));$('#audCount').textContent=rows.length+' events';$('#audBody').innerHTML=auditRows(rows)}

