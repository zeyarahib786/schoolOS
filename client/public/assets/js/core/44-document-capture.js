/* ---- shared data helpers for create handlers ---- */
/* ============ DOCUMENT CAPTURE (upload, preview, store) ============ */
const ADM_DOCS=[
  {key:'id',label:'Passport / Emirates ID',req:true},
  {key:'birth',label:'Birth certificate',req:true},
  {key:'photo',label:'Passport-size photo',req:true},
  {key:'report',label:'Previous school report',req:false},
  {key:'immun',label:'Immunisation record',req:false},
  {key:'tc',label:'Transfer certificate',req:false}];
const STAFF_DOCS=[
  {key:'id',label:'Passport / Emirates ID',req:true},
  {key:'degree',label:'Degree certificate',req:true},
  {key:'photo',label:'Passport-size photo',req:true},
  {key:'experience',label:'Experience / relieving letter',req:false},
  {key:'visa',label:'Visa / work permit',req:false},
  {key:'attestation',label:'Certificate attestation',req:false}];
function staffDocsChecklist(){return STAFF_DOCS.map(d=>({key:d.key,label:d.label,req:d.req,done:false,file:null}))}
function staffInitDocs(s){if(!s.docs||!s.docs[0]||!('key' in s.docs[0]))s.docs=staffDocsChecklist();return s}
function findStaffDoc(id,key){const s=STAFF.find(x=>x.id===id);if(!s)return null;staffInitDocs(s);return s.docs.find(d=>d.key===key)||null}
window.staffDocPick=function(input,id,key){const f=input.files&&input.files[0];docReadFile(f,file=>{const d=findStaffDoc(id,key);if(d){d.file=file;d.done=true}openDrawer(staffProfile(id));toast('Attached · '+file.name)})};
window.staffDocDrop=function(e,id,key){e.preventDefault();const el=e.currentTarget;el&&el.classList.remove('drag');const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];docReadFile(f,file=>{const d=findStaffDoc(id,key);if(d){d.file=file;d.done=true}openDrawer(staffProfile(id));toast('Attached · '+file.name)})};
window.staffDocDownload=function(id,key){const d=findStaffDoc(id,key);if(d&&d.file)dlUrl(d.file.url,d.file.name)};
window.staffDocView=function(id,key){const d=findStaffDoc(id,key);if(d&&d.file)docPreview(Object.assign({label:d.label},d.file))};
window.staffDocRemove=function(id,key){const d=findStaffDoc(id,key);if(d){d.file=null;d.done=false;openDrawer(staffProfile(id));toast('Document removed')}};
window.staffDocMark=function(id,key){const d=findStaffDoc(id,key);if(d){d.done=true;openDrawer(staffProfile(id));toast('Marked as received')}};
function staffDocsDone(s){staffInitDocs(s);return s.docs.filter(d=>d.req).every(d=>d.done)}
const STUDENT_DOCS=[
  {key:'id',label:'Passport / Emirates ID',req:true},
  {key:'birth',label:'Birth certificate',req:true},
  {key:'photo',label:'Passport-size photo',req:true}];
const DOC_MAX=4*1024*1024;
let DOC_BUFFER={},DOC_SLOTCFG={};
function fmtSize(b){if(b<1024)return b+' B';if(b<1048576)return (b/1024).toFixed(0)+' KB';return (b/1048576).toFixed(1)+' MB'}
function escHtml(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function dlUrl(url,name){try{const a=document.createElement('a');a.href=url;a.download=name||'document';document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),120);toast('Downloaded · '+(name||'document'))}catch(e){toast('Download ready')}}
const DOC_ICON='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
const UP_ICON='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></svg>';
const X_ICON='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
const EYE_ICON='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
function docBadge(d){return d.file?'<span class="doc-badge rcv">Received</span>':d.done?'<span class="doc-badge rcv">On file</span>':(d.req?'<span class="doc-badge pend">Required</span>':'<span class="doc-badge opt">Optional</span>')}
function docThumb(file){return (file.type&&file.type.indexOf('image')===0)?`<img class="dthumb" src="${file.url}" alt="${escHtml(file.label||'document')}">`:`<span class="dthumb">${DOC_ICON}</span>`}
/* --- capture in a NEW form (buffer-backed) --- */
function docCaptureHtml(slots){DOC_SLOTCFG={};return `<div class="doc-cap">`+slots.map(sl=>{DOC_SLOTCFG[sl.key]=sl;return `<div id="docslot-${sl.key}">${docSlotInner(sl.key)}</div>`}).join('')+`</div>`}
function docSlotInner(key){const sl=DOC_SLOTCFG[key]||{key,label:key};const d=DOC_BUFFER[key]?{file:DOC_BUFFER[key],req:sl.req,done:true,label:sl.label}:{req:sl.req,label:sl.label};
  const head=`<div class="doc-slot-h"><span class="dl">${DOC_ICON} ${escHtml(sl.label)}${sl.req?'<span style="color:var(--red)"> *</span>':''}</span>${docBadge(d)}</div>`;
  let body;
  if(d.file){body=`<div class="doc-file">${docThumb(d.file)}<div class="dmeta"><div class="dname">${escHtml(d.file.name)}</div><div class="dsize">${fmtSize(d.file.size)} · ${escHtml(d.file.type||'file')}</div></div>
    <div class="doc-act"><button type="button" class="iconbtn sm" title="Preview" onclick="docPreview(DOC_BUFFER['${key}'])">${EYE_ICON}</button><button type="button" class="iconbtn sm" title="Remove" onclick="docRemoveBuf('${key}')">${X_ICON}</button></div></div>`;}
  else{body=`<label class="doc-drop" ondragover="event.preventDefault();this.classList.add('drag')" ondragleave="this.classList.remove('drag')" ondrop="docDropBuf(event,'${key}')"><span>${UP_ICON}</span><span>Click to upload or drag &amp; drop<br><span style="font-size:11px;color:var(--slate-500)">PDF, image or document · max 4&nbsp;MB</span></span><input type="file" accept="image/*,.pdf,.doc,.docx" style="display:none" onchange="docPickBuf(this,'${key}')" aria-label="Upload ${escHtml(sl.label)}"></label>`;}
  return `<div class="doc-slot">${head}${body}</div>`;
}
function docReadFile(f,cb){if(!f)return;if(f.size>DOC_MAX){toast('File too large (max 4 MB) · '+f.name);return}const rd=new FileReader();rd.onload=()=>cb({name:f.name,size:f.size,type:f.type||'file',url:rd.result});rd.onerror=()=>toast('Could not read file');rd.readAsDataURL(f)}
function docPickBuf(input,key){const f=input.files&&input.files[0];docReadFile(f,file=>{file.label=(DOC_SLOTCFG[key]||{}).label;DOC_BUFFER[key]=file;const el=document.getElementById('docslot-'+key);if(el)el.innerHTML=docSlotInner(key);toast('Attached · '+file.name)})}
function docDropBuf(e,key){e.preventDefault();const el=e.currentTarget;el&&el.classList.remove('drag');const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];docReadFile(f,file=>{file.label=(DOC_SLOTCFG[key]||{}).label;DOC_BUFFER[key]=file;const s=document.getElementById('docslot-'+key);if(s)s.innerHTML=docSlotInner(key);toast('Attached · '+file.name)})}
function docRemoveBuf(key){delete DOC_BUFFER[key];const el=document.getElementById('docslot-'+key);if(el)el.innerHTML=docSlotInner(key)}
function docResetBuffer(){DOC_BUFFER={}}
function docsFromBuffer(slots){return slots.map(d=>{const f=DOC_BUFFER[d.key];return {key:d.key,label:d.label,req:d.req,done:!!f,file:f?{name:f.name,size:f.size,type:f.type,url:f.url}:null}})}
/* --- documents stored on a record (admissions / students) --- */
function docRecordHtml(docs,handlerBase,recId){return `<div class="doc-cap">`+docs.map(d=>docRecordSlot(d,handlerBase,recId)).join('')+`</div>`}
function docRecordSlot(d,hb,recId){
  const head=`<div class="doc-slot-h"><span class="dl">${DOC_ICON} ${escHtml(d.label)}${d.req?'<span style="color:var(--red)"> *</span>':''}</span>${docBadge(d)}</div>`;
  let body;
  if(d.file){body=`<div class="doc-file">${docThumb(Object.assign({label:d.label},d.file))}<div class="dmeta"><div class="dname">${escHtml(d.file.name)}</div><div class="dsize">${fmtSize(d.file.size)} · ${escHtml(d.file.type||'file')}</div></div>
    <div class="doc-act"><button class="iconbtn sm" title="View" onclick="${hb}View('${recId}','${d.key}')">${EYE_ICON}</button><button class="iconbtn sm" title="Download" onclick="${hb}Download('${recId}','${d.key}')">${ic('download',15)}</button><button class="iconbtn sm" title="Remove" onclick="${hb}Remove('${recId}','${d.key}')">${X_ICON}</button></div></div>`;}
  else{body=`<label class="doc-drop" ondragover="event.preventDefault();this.classList.add('drag')" ondragleave="this.classList.remove('drag')" ondrop="${hb}Drop(event,'${recId}','${d.key}')"><span>${UP_ICON}</span><span>Upload ${escHtml(d.label.toLowerCase())}<br><span style="font-size:11px;color:var(--slate-500)">PDF, image or document · max 4&nbsp;MB</span></span><input type="file" accept="image/*,.pdf,.doc,.docx" style="display:none" onchange="${hb}Pick(this,'${recId}','${d.key}')" aria-label="Upload ${escHtml(d.label)}"></label>${d.done?'':`<div style="margin-top:7px;text-align:right"><button class="btn xs" onclick="${hb}Mark('${recId}','${d.key}')">Mark received (paper)</button></div>`}`;}
  return `<div class="doc-slot">${head}${body}</div>`;
}
function docPreview(file){if(!file)return;const isImg=file.type&&file.type.indexOf('image')===0,isPdf=file.type&&file.type.indexOf('pdf')>=0;
  const ov=document.createElement('div');ov.className='doc-lightbox';ov.setAttribute('role','dialog');ov.setAttribute('aria-label','Document preview');ov.onclick=()=>ov.remove();
  const inner=isImg?`<img src="${file.url}" alt="${escHtml(file.name)}">`:isPdf?`<iframe src="${file.url}" title="${escHtml(file.name)}"></iframe>`:`<div class="doc-lb-fallback">${DOC_ICON.replace('17','44').replace('17','44')}<div style="font-weight:600;color:var(--slate-800)">${escHtml(file.name)}</div><div class="muted" style="font-size:12px">${fmtSize(file.size)} · preview not available for this type</div><button class="btn primary" onclick="dlUrl('${file.url}','${escHtml(file.name)}')">${ic('download',15)} Download</button></div>`;
  ov.innerHTML=`<div class="doc-lb-box" onclick="event.stopPropagation()"><div class="doc-lb-head"><span>${escHtml(file.name)}</span><button class="iconbtn" aria-label="Close preview" onclick="this.closest('.doc-lightbox').remove()">${X_ICON}</button></div><div class="doc-lb-body">${inner}</div></div>`;
  document.body.appendChild(ov);
}
const TODAY='Today';
function stuInitDocs(st){if(!st.docs||!st.docs[0]||!('key' in st.docs[0]))st.docs=STUDENT_DOCS.map(d=>({key:d.key,label:d.label,req:d.req,done:false,file:null}));return st}
function findStuDoc(id,key){const st=STUDENTS.find(x=>x.id===id);if(!st)return null;stuInitDocs(st);return st.docs.find(d=>d.key===key)||null}
window.stuDocPick=function(input,id,key){const f=input.files&&input.files[0];docReadFile(f,file=>{const d=findStuDoc(id,key);if(d){d.file=file;d.done=true;}openDrawer(studentProfile(id));toast('Attached · '+file.name)})};
window.stuDocDrop=function(e,id,key){e.preventDefault();const el=e.currentTarget;el&&el.classList.remove('drag');const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];docReadFile(f,file=>{const d=findStuDoc(id,key);if(d){d.file=file;d.done=true;}openDrawer(studentProfile(id));toast('Attached · '+file.name)})};
window.stuDocDownload=function(id,key){const d=findStuDoc(id,key);if(d&&d.file)dlUrl(d.file.url,d.file.name)};
window.stuDocView=function(id,key){const d=findStuDoc(id,key);if(d&&d.file)docPreview(Object.assign({label:d.label},d.file))};
window.stuDocRemove=function(id,key){const d=findStuDoc(id,key);if(d){d.file=null;d.done=false;openDrawer(studentProfile(id));toast('Document removed')}};
window.stuDocMark=function(id,key){const d=findStuDoc(id,key);if(d){d.done=true;openDrawer(studentProfile(id));toast('Marked as received')}};
function nowTime(){const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
function nextNum(arr,prefix){let mx=0;arr.forEach(r=>{const n=parseInt(String(r.id||'').split('-')[1]||0,10);if(n>mx)mx=n});return prefix+'-'+(mx+1)}
function dateShort(){const d=new Date();return d.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}
function checklistHtml(items,onToggle){const done=items.filter(i=>i.done).length;
  return `<div class="muted" style="font-size:11.5px;font-weight:600;margin-bottom:8px">${done} of ${items.length} complete</div>
  <div class="bar" style="margin-bottom:12px"><i style="width:${Math.round(done/items.length*100)}%;background:${done===items.length?'var(--brand)':'var(--blue)'}"></i></div>
  <div class="card pad" style="box-shadow:none;padding:6px 12px">${items.map((it,idx)=>`<div class="lrow" style="border:0;padding:9px 0;cursor:pointer" onclick="${onToggle}(${idx})"><span style="width:20px;height:20px;border-radius:6px;flex:none;display:grid;place-items:center;border:1.5px solid ${it.done?'var(--brand)':'var(--line)'};background:${it.done?'var(--brand)':'#fff'};color:#fff;font-size:11px">${it.done?'✓':''}</span><span style="font-size:13px;color:${it.done?'var(--slate-500)':'var(--slate-800)'};text-decoration:${it.done?'line-through':'none'}">${it.label}</span></div>`).join('')}</div>`}
