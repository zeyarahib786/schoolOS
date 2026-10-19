// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {randomUUID} from 'node:crypto';
import {describe,it,expect,vi,beforeEach} from 'vitest';
const code=readFileSync('public/assets/js/modules/66-lms.js','utf8');
const mapping={grade:'Grade 7 · A',subject:'Science',academicYear:'2026-2027',active:true};
function runtime(role='Teacher'){
 document.body.innerHTML='<div id="drawer"></div>';
 const r={M:{},state:{role,module:'lms',lang:'en',lmsWorkspace:{userId:'teacher',courses:[],assignments:[],submissions:[],teaching:[mapping]}},commUserId:()=> 'teacher',crypto:{randomUUID},SCHOOLOS_ADAPTER:{api:vi.fn(),settings:{academicYear:'2026-2027'}},document,URL,Blob,URLSearchParams,setTimeout,localizeView:()=>{},toast:vi.fn()};r.window=r;
 r.studentEscape=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 r.studentFormDrawer=vi.fn((title,sub,fields)=>{document.getElementById('drawer').innerHTML='<div><div class="form-body"></div><div class="df"><button class="btn primary">Generate draft</button></div></div>';const form=document.querySelector('.form-body');for(const f of fields){const el=document.createElement(f.opts?'select':f.area?'textarea':'input');el.dataset.fkey=f.key;if(f.opts)for(const text of f.opts){const opt=document.createElement('option');opt.textContent=text;el.append(opt)}el.value=String(f.val??'');form.append(el)}});
 r.readForm=()=>Object.fromEntries([...document.querySelectorAll('[data-fkey]')].map(n=>[n.dataset.fkey,n.value]));
 r.detailDrawer=o=>'<div><h3>'+o.title+'</h3><p>'+(o.sub||'')+'</p>'+o.sections.map(s=>s.html||'').join('')+'</div>';r.openDrawer=html=>{document.getElementById('drawer').innerHTML=html};
 runInNewContext(code,r);return r;
}
const draft={_id:'draft1',status:'Draft',updatedAt:'2026-10-18T00:00:00.000Z',request:{kind:'Quiz',...mapping},sources:[],facts:{},content:{title:'<img src=x onerror=alert(1)>',body:'Review <script>evil</script>',questions:[{id:'q1',type:'MCQ',prompt:'A < B?',marks:20,options:['A','B'],answer:'A',rubric:'Exact answer'}],suggestedScore:null,warnings:['Review <img src=x>']}};
beforeEach(()=>{vi.restoreAllMocks();document.documentElement.lang='en';});
describe('Teacher AI Studio active runtime',()=>{
 it.each(['Student','Parent','Accountant'])('does not open staff AI for %s',async(role)=>{const r=runtime(role);await r.lmsAiOpen();expect(r.SCHOOLOS_ADAPTER.api).not.toHaveBeenCalled()});
 it('uses a real mapping and offers guided controls for all five priorities',()=>{
  const r=runtime();for(const kind of ['Quiz','Assignment','LessonPlan','Feedback']){r.lmsAiForm(kind);const fields=r.studentFormDrawer.mock.calls.at(-1)[2];expect(fields[0].opts).toEqual(['Grade 7 · A / Science / 2026-2027']);expect(fields.some(f=>f.key==='language')).toBe(true);}
  r.state.lmsWorkspace.teaching=[];r.studentFormDrawer.mockClear();r.lmsAiForm('Quiz');expect(r.studentFormDrawer).not.toHaveBeenCalled();
 });
 it('escapes AI draft content and provides separate question, answer and rubric editors',async()=>{
  const r=runtime();r.SCHOOLOS_ADAPTER.api.mockResolvedValue({data:draft});await r.lmsAiPreview('draft1');expect(document.querySelector('#drawer img')).toBeNull();expect(document.querySelector('#drawer script')).toBeNull();expect(document.querySelector('[data-ai=title]').value).toBe(draft.content.title);expect(document.querySelector('[data-ai=answer]').value).toBe('A');expect(document.querySelector('[data-ai=rubric]')).not.toBeNull();
 });
 it('reuses the same generation identity on retries and changes it when inputs change',async()=>{
  const r=runtime();r.lmsAiForm('Quiz');r.SCHOOLOS_ADAPTER.api.mockRejectedValue(new Error('Temporary failure'));
  const v={scope:'Grade 7 · A / Science / 2026-2027',topic:'Plants',instructions:'',language:'English',questionCount:'5',maxScore:'20'};
  await r.lmsAiGenerate(v);await r.lmsAiGenerate(v);await r.lmsAiGenerate({...v,topic:'Roots'});
  const sent=r.SCHOOLOS_ADAPTER.api.mock.calls.map(c=>JSON.parse(c[1].body));expect(sent[0].requestId).toBe(sent[1].requestId);expect(sent[2].requestId).not.toBe(sent[1].requestId);expect(sent[0].questionCount).toBe(5);
 });
 it('requires review confirmation and does not apply drafts automatically',async()=>{
  const r=runtime();r.lmsAiState().active=draft;await r.lmsAiApply({reviewed:'Select confirmation'});expect(r.SCHOOLOS_ADAPTER.api).not.toHaveBeenCalled();expect(r.toast).toHaveBeenCalledWith('Review confirmation is required');
 });
 it('uses structured question responses for students instead of one text field',()=>{
  const r=runtime('Student');r.state.lmsWorkspace.assignments=[{...draft,_id:'quiz',title:'Quiz',questions:draft.content.questions}];r.lmsWorkspaceSubmitForm('quiz');const fields=r.studentFormDrawer.mock.calls[0][2];expect(fields[0].key).toBe('q1');expect(fields[0].opts).toEqual(['Select answer','A','B']);expect(fields[0].answer).toBeUndefined();
 });
 it('does not replace another drawer when a generation returns late',async()=>{
  const r=runtime();r.lmsAiForm('Quiz');let resolve;r.SCHOOLOS_ADAPTER.api.mockImplementation(()=>new Promise(r=>resolve=r));
  const generating=r.lmsAiGenerate({scope:'Grade 7 · A / Science / 2026-2027',topic:'Plants',instructions:'',language:'English'});document.getElementById('drawer').innerHTML='<div>Other drawer</div>';resolve({data:{_id:'draft1'}});await generating;expect(document.getElementById('drawer').textContent).toBe('Other drawer');expect(r.SCHOOLOS_ADAPTER.api).toHaveBeenCalledTimes(1);
 });
 it('defaults generated content to the selected Arabic UI language',()=>{
  const r=runtime();document.documentElement.lang='ar';r.lmsAiForm('LessonPlan');expect(r.studentFormDrawer.mock.calls[0][2].find(f=>f.key==='language').val).toBe('Arabic');
 });
 it('filters grading suggestions to the selected teaching context and prefills the selected submission',()=>{
  const r=runtime();r.state.lmsWorkspace.assignments=[{_id:'a1',title:'Science work',...mapping},{_id:'a2',title:'Other class',...mapping,grade:'Grade 9 · A'}];
  r.state.lmsWorkspace.submissions=[{_id:'s1',assignment:'a1',student:{name:'Fictional student'}},{_id:'s2',assignment:'a2',student:{name:'Other student'}}];
  r.lmsAiFeedbackFor('s1');expect(r.lmsAiState().submissionChoices.map(s=>s.id)).toEqual(['s1']);expect(r.readForm().topic).toBe('Science work');expect(r.readForm().submission).toContain('Fictional student');
 });

});
