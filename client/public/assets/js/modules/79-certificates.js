/* ---- Certificates ---- */
M.certificates=()=>{const api=window.SCHOOLOS_ADAPTER;
 const records=api?.connected&&!api.live.certificates?[]:CERTS;
 const visible=records.filter(c=>{const f=getFilter('certificates','All');return f==='All'||c.status===f});
 return `
  <div class="page-head"><div class="ph-l"><h2>Certificates</h2><p>Issue and review certificate records — official signed copies require school-office verification.</p></div>
  <div class="ph-r"><button class="btn" onclick="openDrawer(templateLibrary())">${ic('curric',16)} Templates</button><button class="btn primary" onclick="issueCertForm()">${ic('plus',16)} Issue certificate</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('cert','#17A24A','Issued records',api?.connected&&!api.live.certificates?'—':String(records.filter(c=>c.status==='Issued').length),null,"setFilter('certificates','Issued')")}${kpi('exam','#E2920C','Pending',api?.connected&&!api.live.certificates?'—':String(records.filter(c=>c.status==='Pending').length),null,"setFilter('certificates','Pending')")}
    ${kpi('curric','#2563EB','Templates',String(Object.keys(CERT_TEMPLATE_BODY).length),null,"openDrawer(templateLibrary())")}${kpi('reports','#0E7C39','Server records',api?.connected?(api.live.certificates?String(records.length):'Unavailable'):'Demo',null)}</div>
  <div class="card pad"><div class="flex ac jb" style="margin-bottom:12px"><h3 style="font-size:15px">Recent requests</h3>
  ${segBtns('certificates',['All','Pending','Issued'],'All')}</div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Class</th><th>Document</th><th>Reference</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>
  ${visible.map(c=>`<tr style="cursor:pointer" onclick="openDrawer(certDetail('${c.ref}'))"><td>${cellUser(c.name,'')}</td><td class="num">${c.cls}</td><td>${c.type}</td><td class="num">${c.ref}</td><td class="num">${c.date}</td>
    <td>${chip(c.status,c.status==='Issued'?'green':c.status==='Rejected'?'red':'amber')}</td><td class="right">${c.status==='Issued'?`<button class="btn sm" onclick="event.stopPropagation();downloadCertificate('${c.name}','${c.type}','${c.ref}','${c.cls}')">${ic('download',13)} Record</button>`:c.status==='Pending'?`<button class="btn sm primary" onclick="event.stopPropagation();approveCert('${c.ref}')">Approve</button>`:'<span class="muted">Closed</span>'}</td></tr>`).join('')}
  ${!visible.length?'<tr><td colspan="7" class="muted">No certificate records in this view.</td></tr>':''}
  </tbody></table></div>${api?.connected?'<p class="muted" style="margin-top:10px">Pending requests require Administrator or Principal approval. Printed copies require school signature; digital signing and public verification are not available.</p>':''}${api?.connected&&!api.live.certificates?'<p class="muted">Certificate records are unavailable.</p>':''}</div>`};
