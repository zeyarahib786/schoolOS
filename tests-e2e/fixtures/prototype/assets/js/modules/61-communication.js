/* ---- Communication ---- */
function audienceCount(aud){aud=(aud||'All').toLowerCase();
 if(aud.includes('all'))return STUDENTS.length+STAFF.length;
 if(aud.includes('staff'))return STAFF.length;
 if(aud.includes('grade')||aud.includes('class')||aud.includes('route'))return Math.max(8,Math.round(STUDENTS.length/9));
 return STUDENTS.length}
function annDetail(idx){const a=ANN[idx];if(!a)return '';const n=audienceCount(a.aud);
 const delivered=a.status==='Draft'?0:Math.round(n*0.97),read=a.status==='Draft'?0:Math.round(n*0.68),failed=a.status==='Draft'?0:n-delivered;
 return detailDrawer({title:a.t,sub:a.by+' · '+a.tm,color:CVAR[a.c]||'#2563EB',badge:ic(a.ic,18),
  stats:[['Status',a.status||'Published',a.status==='Draft'?'amber':a.status==='Pending approval'?'blue':'green'],['Audience',a.aud||'All','blue'],['Recipients',String(n),'gray'],['Delivered',delivered+' ('+Math.round(delivered/n*100)+'%)','green']],
  sections:[{h:'Message',html:`<div class="card pad" style="box-shadow:none;font-size:13px;color:var(--slate-700)">${a.bd}</div>`},
   {h:'Delivery tracking',rows:[['Queued',String(n)],['Delivered',String(delivered)],['Read',String(read)],['Failed / bounced',String(failed)]]}],
  footer:a.status==='Draft'?[['Submit for approval',"submitAnnForApproval("+idx+")",true]]:a.status==='Pending approval'?[['Approve & publish',"approveAnn("+idx+")",true],['Reject',"rejectAnn("+idx+")"]]:[['Resend to failed',"resendFailed("+idx+")"],['Close','closeDrawer()',true]]})}
window.submitAnnForApproval=function(i){if(ANN[i]){ANN[i].status='Pending approval'}logAudit('Submitted announcement for approval - '+ANN[i].t,'Communication');closeDrawer();render();toast('Sent for approval')};
window.approveAnn=function(i){if(ANN[i]){ANN[i].status='Published';ANN[i].tm='Just now'}logAudit('Approved & published announcement - '+ANN[i].t,'Communication');closeDrawer();render();toast('Published to '+audienceCount(ANN[i].aud)+' recipients')};
window.rejectAnn=function(i){if(ANN[i])ANN[i].status='Draft';logAudit('Rejected announcement - '+ANN[i].t,'Communication');closeDrawer();render();toast('Returned to draft')};
window.resendFailed=function(i){const a=ANN[i];const n=Math.round(audienceCount(a.aud)*0.03);logAudit('Resent to failed contacts - '+a.t+' ('+n+')','Communication');closeDrawer();toast('Resent to '+n+' failed contact'+(n===1?'':'s'))};
M.comm=()=>{const totalRecipients=ANN.reduce((a,x)=>a+(x.status!=='Draft'?audienceCount(x.aud):0),0);const pending=ANN.filter(a=>a.status==='Pending approval').length;
 return `
  <div class="page-head"><div class="ph-l"><h2>Communication</h2><p>Broadcast announcements with audience preview, approval workflow and delivery tracking.</p></div>
  <div class="ph-r"><button class="btn primary" onclick="newAnnouncementForm()">${ic('plus',16)} New announcement</button></div></div>
  <div class="grid cols-4" style="margin-bottom:16px">
    ${kpi('comm','#17A24A','Sent this term',String(ANN.filter(a=>a.status!=='Draft').length),null)}${kpi('roles','#E2920C','Pending approval',String(pending),pending?{dir:'flat',v:'review needed',note:''}:null)}
    ${kpi('students','#2563EB','Total recipients reached',String(totalRecipients),null)}${kpi('reports','#0E7C39','Avg. delivery rate','97%',{dir:'flat',v:'computed',note:''})}</div>
  <div class="grid cols-3">
    <div class="card pad span-2"><div class="sec-head"><h3>Recent announcements</h3></div>${ANN.map((a,i)=>`<div class="lrow" style="cursor:pointer" onclick="openDrawer(annDetail(${i}))"><span class="kp-ic" style="width:34px;height:34px;background:${CVAR[a.c]||'#2563EB'}1a;color:${CVAR[a.c]||'#2563EB'}">${ic(a.ic,16)}</span><div style="flex:1;min-width:0"><div style="font-weight:600;color:var(--slate-900);font-size:13.5px">${a.t}</div><div class="muted" style="font-size:11.5px">${a.by} · ${a.tm} · ${audienceCount(a.aud)} recipients</div></div>${chip(a.status||'Published',a.status==='Draft'?'gray':a.status==='Pending approval'?'amber':'green')}</div>`).join('')}</div>
    <div class="card pad"><div class="sec-head"><h3>Channels</h3></div>
    ${[['In-app portal',(STUDENTS.length+STAFF.length)+' reach','green'],['Email','97% delivered','green'],['SMS',String(8420-ANN.length*40)+' credits','blue'],['WhatsApp','Connected','green']].map(c=>`<div class="lrow" style="padding:11px 0"><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13px">${c[0]}</div><div class="muted" style="font-size:11.5px">${c[1]}</div></div></div>`).join('')}
    <div class="card pad mt" style="box-shadow:none;background:var(--brand-soft);border-color:var(--brand-line)"><div style="font-weight:600;color:var(--brand-deep);font-size:13px">Templates</div><div class="muted" style="font-size:12px;margin-top:4px">Fee reminder, absence alert, event invite, transport delay - select when composing.</div></div>
    </div>
  </div>`};
window.postAnnouncement=function(v){const t=(v.title||'').trim();if(!t){toast('Title is required');return false}
 const isDraft=(v.action||'')==='Save as draft';const status=isDraft?'Draft':'Pending approval';const n=audienceCount(v.audience);
 ANN.unshift({t,by:'You - '+state.role,tm:'Just now',bd:v.message||'',ic:v.category==='Finance'?'fees':v.category==='Emergency'?'helpdesk':v.category==='Transport'?'trans':'comm',c:v.priority&&v.priority.indexOf('Urgent')>=0?'red':'green',aud:v.audience||'All',status,category:v.category||'General',priority:v.priority||'Normal'});
 logAudit((isDraft?'Saved draft':'Submitted for approval')+' - '+t+' ('+n+' recipients)','Communication');closeDrawer();render();toast(isDraft?'Saved as draft':'Submitted for approval - '+n+' recipients when published');return false};
function newAnnouncementForm(){formDrawer('New announcement','Preview recipient count before sending',[
 {label:'Title',key:'title',req:true,ph:'e.g. Half-term break'},{label:'Category',key:'category',opts:['Academic','Finance','Attendance','Transport','Health','Emergency','Event','General'],half:true},
 {label:'Priority',key:'priority',opts:['Normal','Urgent - pin to top'],half:true},
 {label:'Audience',key:'audience',opts:['All','Staff only','Grade 10','Selected class','Route 7 parents'],half:true},{label:'Language',key:'lang',opts:['English','+ Arabic translation'],half:true},
 {label:'Message',key:'message',area:true,req:true,val:AI_DEFAULT_MESSAGES['general'],aiContext:'general',maxlen:600},
 {label:'Action',key:'action',opts:['Save as draft','Submit for approval']}
 ],'Create announcement','','postAnnouncement')}
