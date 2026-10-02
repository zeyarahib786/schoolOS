/* ---- Audit Log (System) ---- */
function auditSeverity(a){return ['Info','Warning','Critical'].includes(a.severity)?a.severity:'Info'}
function auditTime(a){try{return new Date(a.createdAt).toLocaleString('en-GB',{timeZone:window.SCHOOLOS_ADAPTER?.settings?.timezone||'UTC',dateStyle:'medium',timeStyle:'short'})}catch(e){return '—'}}
let auditExportBusy=false;
function exportAuditLog(){const adapter=window.SCHOOLOS_ADAPTER;if(!adapter?.live?.audit){toast('Audit log unavailable');return Promise.resolve()}if(auditExportBusy)return Promise.resolve();auditExportBusy=true;
  return adapter.api('/audit-log/exports',{method:'POST',body:'{}'}).then(()=>{
    exportCSV('audit-log.csv',['User','Action','Module','Time (ISO UTC)','Severity'],AUDIT.map(a=>[a.user,a.action,a.module,a.createdAt,auditSeverity(a)]));
    if(typeof refreshAuditLog==='function')return refreshAuditLog();
  }).catch(e=>{toast('Export not recorded — '+e.message)}).finally(()=>{auditExportBusy=false})}
M.audit=()=>{const loaded=Boolean(window.SCHOOLOS_ADAPTER?.live?.audit);const exps=AUDIT.filter(a=>/export/i.test(a.action)).length;const apr=AUDIT.filter(a=>/approv|reject/i.test(a.action)).length;
  const sev=a=>({Info:['Info','gray'],Warning:['Warning','amber'],Critical:['Critical','red']})[auditSeverity(a)];
  const filter=state._auditSev||'All';
  const filtered=filter==='All'?AUDIT:AUDIT.filter(a=>sev(a)[0]===filter);
  return `
  <div class="page-head"><div class="ph-l"><h2>Audit Log</h2><p>${loaded?`${AUDIT.length} server-recorded events loaded. Actions without server audit coverage do not appear here.`:'Audit log unavailable — refresh or check your access.'}</p></div>
  <div class="ph-r">${filter!=='All'?`<button class="btn" onclick="state._auditSev='All';render()">${ic('audit',16)} Clear filter</button>`:''}<button class="btn" onclick="refreshAuditLog()">${ic('audit',16)} Refresh</button><button class="btn" ${loaded?'':'disabled'} onclick="exportAuditLog()">${ic('download',16)} Export log</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('audit','#17A24A','Events loaded',loaded?String(AUDIT.length):'—',null,"state._auditSev='All';render()")}${kpi('roles','#2563EB','Recorded approvals & rejections',loaded?String(apr):'—',null,"state._auditSev='All';render()")}
    ${kpi('download','#E2920C','Recorded exports',loaded?String(exps):'—',null,"state._auditSev='All';render()")}${kpi('settings','#0E7C39','Log API','Read-only',null)}</div>
  <div class="card pad"><div class="flex ac jb" style="margin-bottom:12px;flex-wrap:wrap;gap:8px"><h3 style="font-size:15px">Activity stream${filter!=='All'?' - '+filter:''}</h3>
   <div class="flex ac" style="gap:6px">${['All','Info','Warning','Critical'].map(sv=>`<button class="btn sm ${filter===sv?'primary':''}" onclick="state._auditSev='${sv}';render()">${sv}</button>`).join('')}</div></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>User</th><th>Action</th><th>Module</th><th>Severity</th><th>Time</th></tr></thead><tbody>
  ${filtered.slice(0,30).map(a=>{const sv=sev(a);return `<tr><td>${cellUser(escHtml(a.user),'')}</td><td>${escHtml(a.action)}</td><td><span class="badge b-gray"><span class="bd"></span>${escHtml(a.module)}</span></td><td>${chip(sv[0],sv[1])}</td><td class="num muted">${escHtml(auditTime(a))}</td></tr>`}).join('')}
  </tbody></table></div>
  ${!loaded?'<div class="muted">Unable to load server audit records.</div>':filtered.length>30?`<div class="muted" style="font-size:12px;margin-top:10px">Showing 30 of ${filtered.length} events${filter!=='All'?' matching '+filter:''} · export the full log above.</div>`:filtered.length===0?`<div class="empty"><div class="ei">${ic('audit',26)}</div><h3>No ${filter.toLowerCase()} events</h3><p>Nothing matches this filter yet.</p></div>`:''}</div>`};
function auditRows(list){return list.map(a=>`<tr><td>${cellUser(escHtml(a.user),a.user==='System'?'Automated':'User')}</td><td>${escHtml(a.action)}</td><td>${chip(escHtml(a.module),'blue')}</td><td class="num muted">${escHtml(auditTime(a))}</td></tr>`).join('')||`<tr><td colspan="4"><div class="empty"><div class="ei">${ic('audit',26)}</div><h3>No events match</h3></div></td></tr>`}
function filterAudit(){const q=($('#audSearch')?.value||'').toLowerCase(),m=$('#audModule')?.value||'';const rows=AUDIT.filter(a=>(a.user.toLowerCase().includes(q)||a.action.toLowerCase().includes(q))&&(!m||a.module===m));$('#audCount').textContent=rows.length+' events';$('#audBody').innerHTML=auditRows(rows)}
