/* ---- Roles ---- */
const PERMROWS=[['Students',[1,1,1,0,0,0]],['Admissions',[1,1,0,0,0,0]],['Attendance',[1,1,1,0,1,1]],['Exams & Gradebook',[1,1,1,0,1,1]],['Fees & Finance',[1,1,0,1,1,0]],['Payroll',[1,0,0,1,0,0]],['Communication',[1,1,1,0,1,1]],['AI Insights',[1,1,0,0,0,0]],['Reports',[1,1,0,1,0,0]],['Audit Log',[1,0,0,0,0,0]],['Settings',[1,1,0,0,0,0]]];
function liveRoleUserCount(){const a=window.SCHOOLOS_ADAPTER;return a&&a.live&&a.live.roles?a.rbacTotalUsers:(STAFF.length+STUDENTS.length+buildGuardians().length)}
function exportRoleMatrix(){studentDownloadCSV('permission-matrix.csv',[['Role','Access'],...ROLES.map((role,ci)=>[role,PERMROWS.filter(row=>row[1][ci]).map(row=>row[0]).join('; ')||'No governed modules'])])}
window.togglePerm=function(r,c){const before=PERMROWS[r][1][c];PERMROWS[r][1][c]=before?0:1;
 const risky=/Payroll|Audit Log|Fees|Settings/.test(PERMROWS[r][0]);
 logAudit((PERMROWS[r][1][c]?'Granted':'Revoked')+' '+PERMROWS[r][0]+' access - '+ROLES[c]+(risky?' (sensitive module)':''),'Roles & Access');
 render();toast(PERMROWS[r][0]+' · '+ROLES[c]+(PERMROWS[r][1][c]?' granted':' revoked')+(risky&&PERMROWS[r][1][c]?' - sensitive permission, review recommended':''))};
M.roles=()=>{if(state.role!=='Administrator')return '<div class="card pad">Roles & Access requires Administrator.</div>';if(!window.SCHOOLOS_ADAPTER?.live?.roles)return '<div class="card pad">Loading saved role permissions…</div>';return `
  <div class="page-head"><div class="ph-l"><h2>Roles & Access</h2><p>Module visibility permissions across the released workspaces. Click any cell to grant or revoke access; saved changes control each role’s module navigation while action-level security remains enforced by the server.</p></div>
  <div class="ph-r"><button class="btn" onclick="exportRoleMatrix()">${ic('download',16)} Export</button><button class="btn primary" onclick="formDrawer('Add custom role','Create a reusable permission template',[{label:'Template name',key:'role',req:true,ph:'e.g. Librarian'},{label:'Based on',key:'base',opts:ROLES},{label:'Description',key:'desc',area:true}],'Create role','','addRole')">${ic('plus',16)} Add role</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('roles','#17A24A','Defined roles',String(ROLES.length),null)}${kpi('staff','#2563EB','Users (live)',String(liveRoleUserCount()),{dir:'flat',v:'active portal accounts',note:''})}
    ${kpi('att','#0E7C39','Modules governed',String(PERMROWS.length),null)}${kpi('audit','#E2920C','Permission grants',String(PERMROWS.reduce((a,r)=>a+r[1].filter(Boolean).length,0)),null)}</div>
  <div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Module visibility matrix</h3><span class="muted" style="font-size:12px">Click a cell to toggle access</span></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Module</th>${ROLES.map(r=>`<th class="right">${studentEscape(r)}</th>`).join('')}</tr></thead><tbody>
  ${PERMROWS.map((row,ri)=>`<tr><td style="font-weight:600;color:var(--slate-900)">${row[0]}${/Payroll|Audit Log|Fees|Settings/.test(row[0])?' <span class="badge b-amber" style="font-size:9.5px;vertical-align:middle" title="Sensitive module - review grants carefully"><span class="bd"></span>Sensitive</span>':''}</td>${row[1].map((v,ci)=>`<td class="right"><button onclick="togglePerm(${ri},${ci})" title="Toggle access" style="background:none;border:0;cursor:pointer;padding:4px;border-radius:6px;line-height:0">${v?'<span style="color:var(--brand)">'+ic('att',16)+'</span>':'<span style="color:var(--line)">'+ic('plus',14)+'</span>'}</button></td>`).join('')}</tr>`).join('')}
  </tbody></table></div></div><p class="muted">Custom roles are permission templates; account roles remain the six supported roles. Visibility grants do not override server action or ownership rules.</p>`};

/* ---- shared helpers for module views ---- */
const CVAR={green:'var(--brand)',blue:'var(--blue)',amber:'var(--amber)',red:'var(--red)',gray:'var(--slate-400)'};
function cbar(pct,color){return `<div class="bar" style="flex:1;min-width:60px"><i style="width:${Math.min(pct,100)}%;background:${CVAR[color]||'var(--brand)'}"></i></div>`}
function chip(txt,color){return `<span class="badge b-${color}"><span class="bd"></span>${txt}</span>`}

