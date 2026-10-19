// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {randomUUID} from 'node:crypto';
import {describe,it,expect,vi} from 'vitest';
const source=readFileSync('public/assets/js/modules/52-crm.js','utf8');
function runtime(leads,api){
 const r={state:{module:'crm'},crypto:{randomUUID},document,Set,crmActive:()=>leads,studentEscape:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),ic:()=>'',detailDrawer:v=>v,toast:vi.fn(),localizeView:()=>{},SCHOOLOS_ADAPTER:{api,hydrateCrm:async()=>{}}};r.window=r;
 runInNewContext(source.slice(source.indexOf('function crmLeadEmail('),source.indexOf('const SOCIAL_SAMPLES=')),r);return r;
}
const leads=[{mongoId:'a',name:'Child <img src=x>',email:'actual@example.invalid',stage:'New'}, {mongoId:'b',name:'Sibling',email:'ACTUAL@example.invalid',stage:'New'}, {mongoId:'c',name:'No contact',stage:'New'}, {mongoId:'d',name:'Converted',email:'converted@example.invalid',stage:'Won'}];
function render(r){const view=r.crmBulkOutreach();document.body.innerHTML='<div id="drawer"><div>'+view.sections.map(s=>s.html).join('')+'</div></div>';}
describe('Reviewed CRM bulk outreach',()=>{
 it('uses only stored contacts, deduplicates addresses and escapes personal data',()=>{
  const r=runtime(leads);render(r);expect(r.state.crmBulkReview).toHaveLength(1);expect(r.state.crmBulkReview[0].email).toBe('actual@example.invalid');expect(document.querySelector('[src=x]')).toBeNull();expect(document.body.textContent).toContain('Child <img src=x>');expect(document.body.textContent).not.toContain('@family.ae');
 });
 it('blocks duplicate clicks and reuses the reviewed request identity after an uncertain response',async()=>{
  let reject;const api=vi.fn(()=>new Promise((_,no)=>reject=no)),r=runtime(leads,api);render(r);
  const first=r.crmBulkSend();await r.crmBulkSend();expect(api).toHaveBeenCalledTimes(1);reject(new Error('Connection interrupted'));await first;
  api.mockResolvedValue({data:{results:[{email:'actual@example.invalid',status:'Pending',deliveryId:'saved'}]}});await r.crmBulkSend();
  const requests=api.mock.calls.map(c=>JSON.parse(c[1].body));expect(requests[0]).toEqual(requests[1]);expect(requests[0].recipients).toEqual([{id:'a',email:'actual@example.invalid'}]);
 });
 it('does not replace a newer drawer with late batch results',async()=>{
  let resolve;const r=runtime(leads,()=>new Promise(yes=>resolve=yes));render(r);const pending=r.crmBulkSend();document.querySelector('#drawer').innerHTML='<div>New unrelated draft</div>';resolve({data:{results:[]}});await pending;expect(document.querySelector('#drawer').textContent).toBe('New unrelated draft');
 });
});


describe('Admissions draft accuracy',()=>{
 it('uses the configured school and does not promise admission when only an application exists',()=>{
  const r={state:{schoolProfile:{legalName:'Fictional Academy'}}};
  runInNewContext(source.slice(source.indexOf('const CONTENT_TONES='),source.indexOf('function crmDraftEmail(')),r);
  const lead={name:'Fictional Child',grade:'Grade 4',stage:'Won',guardian:'Fictional Guardian',owner:'Admissions Office'};
  const draft=r.crmGenerateContent(lead,0);expect(draft.body).toContain('Fictional Academy');expect(draft.body).toContain('not confirmation of admission');expect(draft.body).not.toContain('Congratulations');
  expect(r.crmGenerateContent({...lead,stage:'New'},0).subject).toContain('Fictional Academy');
 });
});


describe('CRM follow-up KPI destinations',()=>{
 it('separates scheduled upcoming leads from due leads and resets the tab to all groups',()=>{
  const state={},r={state,CRMCHIP:{New:'blue'},ic:()=>'',render:()=>{},crmActive:()=>[
   {name:'Future child',follow:3,owner:'Office',stage:'New',log:[]},
   {name:'Overdue child',follow:-2,owner:'Office',stage:'New',log:[]},
   {name:'Today child',follow:0,owner:'Office',stage:'New',log:[]}
  ],studentEscape:s=>s,cellUser:s=>s,chip:s=>s,followLabel:s=>String(s),followColor:()=>'',isStale:()=>false};
  runInNewContext(source.slice(source.indexOf('function setCrmView('),source.indexOf('function crmFocus('))+source.slice(source.indexOf('function crmFollowups('),source.indexOf('function crmArchivedView(')),r);
  r.setCrmView('followups','scheduled');expect(r.crmFollowups()).toContain('Future child');expect(r.crmFollowups()).not.toContain('Overdue child');expect(r.crmFollowups()).not.toContain('Today child');
  r.setCrmView('followups','due');expect(r.crmFollowups()).toContain('Overdue child');expect(r.crmFollowups()).toContain('Today child');expect(r.crmFollowups()).not.toContain('Future child');
  r.setCrmView('followups');expect(r.crmFollowups()).toContain('Future child');expect(r.crmFollowups()).toContain('Overdue child');
 });
});
