// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {randomUUID} from 'node:crypto';
import {describe,it,expect,vi} from 'vitest';
const code=readFileSync('public/assets/js/modules/66-lms.js','utf8');
const mapping=(grade,subject='Science',academicYear='2026-2027')=>({grade,subject,academicYear});
function runtime(teaching){
 const r={M:{},state:{role:'Teacher',module:'lms',lmsWorkspace:{userId:'teacher',courses:[],assignments:[],teaching}},commUserId:()=> 'teacher',crypto:{randomUUID},SCHOOLOS_ADAPTER:{settings:{academicYear:'2026-2027'}},document,healthDay:()=> '2026-10-16',studentEscape:s=>String(s),localizeView:()=>{},toast:vi.fn()};r.window=r;
 r.studentFormDrawer=vi.fn((title,sub,fields)=>{document.body.innerHTML='<div id="drawer"><div><div class="form-body"></div></div></div>';const form=document.querySelector('.form-body');for(const f of fields){if(!f.key)continue;const el=document.createElement(f.opts?'select':f.area?'textarea':'input');el.dataset.fkey=f.key;if(f.opts)for(const o of f.opts){const opt=document.createElement('option');opt.textContent=o;el.append(opt)}el.value=String(f.val??'');form.append(el)}});
 r.readForm=()=>Object.fromEntries([...document.querySelectorAll('[data-fkey]')].map(n=>[n.dataset.fkey,n.value]));
 runInNewContext(code,r);return r;
}
describe('Teacher assignment workspace',()=>{
 it('requires a real teaching mapping before opening a creation form',()=>{const r=runtime([]);r.lmsWorkspaceAssignmentForm();expect(r.studentFormDrawer).not.toHaveBeenCalled();expect(r.toast).toHaveBeenCalledWith('Ask school leadership to assign your class and subject first')});
 it('offers mapped class/subject choices and explicit schedule/email controls',()=>{
  const r=runtime([mapping('Grade 7 · A')]);r.lmsWorkspaceAssignmentForm();const fields=r.studentFormDrawer.mock.calls[0][2];expect(fields.find(f=>f.key==='grade').opts).toEqual(['Grade 7 · A']);expect(fields.find(f=>f.key==='status').opts).toContain('Scheduled');expect(fields.find(f=>f.key==='notifyEmail').val).toBe('In-app only');expect(fields.find(f=>f.key==='remindersEnabled').val).toBe('Off');
 });
 it('limits additional targets to the selected subject and year and preserves selected sections during edits',()=>{
  const r=runtime([mapping('Grade 7 · A'),mapping('Grade 7 · B'),mapping('Grade 8 · A','Math'),mapping('Grade 9 · A','Science','2027-2028')]);r.lmsWorkspaceAssignmentForm();
  expect([...document.querySelectorAll('[data-lms-target]')].map(n=>n.value)).toEqual(['Grade 7 · B']);document.querySelector('[data-lms-target]').checked=true;r.lmsWorkspaceTargets();expect(document.querySelector('[data-lms-target]').checked).toBe(true);
  document.querySelector('[data-fkey=subject]').value='Math';r.lmsWorkspaceTargets();expect([...document.querySelectorAll('[data-lms-target]')].map(n=>n.value)).toEqual(['Grade 8 · A']);
 });
});

describe('Compact teaching directory',()=>{
 it('shows readable options while submitting exact database IDs',async()=>{
  const r=runtime([]);r.state.role='Administrator';
  r.state.lmsWorkspace.teachingOptions={teachers:[{_id:'teacher-id',name:'Sarah Ahmed'}],classes:[{_id:'class-12',grade:'Grade 12',section:'A'},{_id:'class-kg',grade:'KG 1',section:'A'},{_id:'class-2',grade:'Grade 2',section:'A'}]};
  r.lmsTeachingForm();
  expect(document.querySelector('[data-fkey=teacher]').textContent).toBe('Sarah Ahmed');
  expect([...document.querySelectorAll('[data-fkey=classSection] option')].map(o=>o.textContent)).toEqual(['KG 1 · A','Grade 2 · A','Grade 12 · A']);
  expect(document.querySelector('[data-fkey=teacher]').value).toBe('teacher-id');
  r.SCHOOLOS_ADAPTER.api=vi.fn().mockResolvedValue({data:{}});r.lmsWorkspaceLoad=vi.fn();r.lmsTeachingPanel=vi.fn();
  await r.lmsTeachingSave({teacher:'teacher-id',classSection:'class-kg',subject:'English',academicYear:'2026-2027'});
  expect(JSON.parse(r.SCHOOLOS_ADAPTER.api.mock.calls[0][1].body)).toMatchObject({teacher:'teacher-id',classSection:'class-kg'});
 });
 it('paginates a large directory and combines search, class and status filters',()=>{
  const rows=Array.from({length:30},(_,i)=>({_id:'mapping-'+i,teacher:{name:i%2?'Sarah Ahmed':'Rohan Mehta'},grade:i%2?'Grade 1 · A':'Grade 2 · A',subject:i%2?'English':'Math',academicYear:'2026-2027',active:i<26}));
  const r=runtime(rows);r.detailDrawer=o=>o.sections.map(s=>s.html).join('');r.openDrawer=html=>{document.body.innerHTML=html;};
  r.lmsTeachingPanel();expect(document.querySelectorAll('.teaching-card')).toHaveLength(12);expect(document.getElementById('teachingCount').textContent).toBe('26 / 30');
  r.state.lmsWorkspace.teachingPage=3;r.lmsTeachingRender();expect(document.querySelectorAll('.teaching-card')).toHaveLength(2);
  document.getElementById('teachingSearch').value='Sarah';document.getElementById('teachingClass').value='Grade 1 · A';r.lmsTeachingRender(true);
  expect(r.state.lmsWorkspace.teachingPage).toBe(1);expect(document.getElementById('teachingCount').textContent).toBe('13 / 30');
  document.getElementById('teachingStatus').value='archived';r.lmsTeachingRender(true);expect(document.querySelectorAll('.teaching-card')).toHaveLength(2);
  expect(document.querySelectorAll('[onclick*=lmsTeachingRevoke]')).toHaveLength(0);
 });
});
