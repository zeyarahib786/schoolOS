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
