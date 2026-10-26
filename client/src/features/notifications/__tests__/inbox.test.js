import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect} from 'vitest';
const source=readFileSync('public/assets/js/core/40-helpers-infra.js','utf8').split('function schoolInboxState()')[1];
function runtime(api){const r={state:{},document,window:{},SCHOOLOS_ADAPTER:{user:{_id:'a'},connected:true,api},openNotifs:()=>{},studentEscape:s=>String(s),localizeView:()=>{},toast:()=>{}};r.window.SCHOOLOS_ADAPTER=r.SCHOOLOS_ADAPTER;runInNewContext('function schoolInboxState()'+source,r);return r;}
describe('Personal inbox UI',()=>{
 it('does not expose a late inbox response after changing accounts or replace an unrelated form',async()=>{
  document.body.innerHTML='<div id="drawer"><input value="Draft remains"></div>';
  let resolve;const r=runtime(()=>new Promise(r=>resolve=r));const loading=r.schoolInboxRefresh();r.SCHOOLOS_ADAPTER.user={_id:'b'};resolve({data:[{body:'Private a'}],meta:{unread:1,pagination:{total:1}}});await loading;
  expect(r.schoolInboxState().rows).toHaveLength(0);expect(document.querySelector('input').value).toBe('Draft remains');
 });
 it('retains read history and renders saved unread count without pretending delivery',async()=>{
  const r=runtime(async()=>({data:[],meta:{unread:4,pagination:{total:30}}}));await r.schoolInboxRefresh();expect(r.schoolInboxState().unread).toBe(4);expect(r.schoolInboxState().total).toBe(30);expect(r.schoolInboxHtml()).toContain('Mark all read');
 });
});

describe('Inbox pagination race',()=>{
 it('reloads the latest page instead of displaying the previous response under a new page number',async()=>{
  let finish;const requests=[];const r=runtime(path=>{requests.push(path);return requests.length===1?new Promise(resolve=>finish=resolve):Promise.resolve({data:[],meta:{unread:0,pagination:{total:30}}});});
  const first=r.schoolInboxRefresh();r.schoolInboxState().page=2;finish({data:[{body:'Old page'}],meta:{unread:1,pagination:{total:30}}});await first;await Promise.resolve();expect(requests).toEqual(['/inbox?page=1','/inbox?page=2']);expect(r.schoolInboxState().rows).toHaveLength(0);expect(r.schoolInboxState().page).toBe(2);
 });
});

it('opens message notifications in the canonical communication workspace and correct conversation',async()=>{
 document.body.innerHTML='<div id="schoolInboxContent"></div>';
 const r=runtime(async()=>({data:[]}));const comm={};let opened;
 r.schoolInboxState().rows=[{_id:'notification',module:'communication',recordId:'message'}];
 r.schoolInboxRead=async()=>{};r.closeDrawer=()=>{};r.go=module=>{r.state.module=module;};
 r.SCHOOLOS_ADAPTER.apiAll=async()=>({data:[{_id:'message'}]});r.commState=()=>comm;r.render=()=>{};r.commMessageDetail=async id=>{opened=id;};
 await r.schoolInboxOpen('notification');expect(r.state.module).toBe('comm');expect(comm.tab).toBe('Inbox');expect(opened).toBe('message');
});
