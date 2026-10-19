// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect,vi} from 'vitest';
const source=readFileSync('public/assets/js/modules/52-crm.js','utf8');
function runtime(navigator={}){
 class MediaURL extends URL{static createObjectURL=vi.fn(()=> 'blob:fictional');static revokeObjectURL=vi.fn()}
 const r={state:{_socialText:{Facebook:'Actual edited caption',Instagram:'Edited Instagram caption'}},AI_DEFAULT_MESSAGES:{'event-details':'Draft'},navigator,URL:MediaURL,document,toast:vi.fn(),open:vi.fn(),openDrawer:vi.fn(),studentEscape:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),ic:()=>'',detailDrawer:v=>v,samplePlaceholder:()=>''};r.window=r;
 runInNewContext(source.slice(source.indexOf('const SOCIAL_SAMPLES='),source.indexOf('function crmDetail(')),r);return r;
}
describe('External social compose handoff',()=>{
 it('copies the edited caption and opens synchronously without waiting for clipboard',async()=>{
  const calls=[],r=runtime({clipboard:{writeText:vi.fn(async text=>{calls.push('copy');expect(text).toBe('Actual edited caption')})}});r.open=vi.fn(()=>calls.push('open'));
  r.socialCompose('Facebook');expect(calls).toEqual(['open','copy']);expect(r.open).toHaveBeenCalledWith('https://www.facebook.com/','_blank','noopener,noreferrer');await Promise.resolve();
 });
 it('passes original photo and video files with the edited caption to native sharing',async()=>{
  const photo=new File(['photo'],'photo.jpg',{type:'image/jpeg'}),video=new File(['video'],'clip.mp4',{type:'video/mp4'});
  const share=vi.fn(async()=>{}),r=runtime({share,canShare:()=>true});r.socialAddMedia([photo,video]);await r.socialShareMedia('Instagram');
  expect(share.mock.calls[0][0].files).toEqual([photo,video]);expect(share.mock.calls[0][0].text).toBe('Edited Instagram caption');expect(r.open).not.toHaveBeenCalled();
 });
 it('does not report publication or open another window when native sharing is cancelled',async()=>{
  const r=runtime({share:vi.fn(async()=>{throw Object.assign(new Error('Cancelled'),{name:'AbortError'})}),canShare:()=>true});r.socialAddMedia([new File(['x'],'x.jpg',{type:'image/jpeg'})]);await r.socialShareMedia('Facebook');expect(r.toast).not.toHaveBeenCalled();expect(r.open).not.toHaveBeenCalled();
 });
 it('rejects wrong-host, script and credential URLs, while allowing a school page',()=>{
  const r=runtime({});for(const url of ['javascript:alert(1)','https://facebook.com.evil.example/','https://user:password@facebook.com/school']){r.state._socialProfiles={Facebook:url};r.socialOpenPlatform('Facebook');}expect(r.open).not.toHaveBeenCalled();r.state._socialProfiles={Facebook:'https://www.facebook.com/fictionalschool'};r.socialOpenPlatform('Facebook');expect(r.open).toHaveBeenCalledWith('https://www.facebook.com/fictionalschool','_blank','noopener,noreferrer');
 });
 it('keeps empty edits, escapes caption markup and includes Instagram without fabricated share links',()=>{
  const r=runtime();r.state._socialText.Facebook='';expect(r.socialCaption('Facebook')).toBe('');r.state._socialText.Facebook='</textarea><img src=x onerror=alert(1)>';const drawer=r.socialComposerDrawer();document.body.innerHTML=drawer.sections.map(s=>s.html).join('');expect(document.querySelector('img[src=x]')).toBeNull();expect(drawer.sections.some(s=>s.h==='Instagram')).toBe(true);expect(document.body.innerHTML).not.toContain('alnoor.ae');
 });
 it('rejects non-media files and releases removed media previews',()=>{
  const r=runtime();r.socialAddMedia([new File(['x'],'x.html',{type:'text/html'}),new File(['x'],'x.jpg',{type:'image/jpeg'})]);expect(r.URL.createObjectURL).toHaveBeenCalledTimes(1);r.socialMediaRemove(0);expect(r.URL.revokeObjectURL).toHaveBeenCalledWith('blob:fictional');
 });
 it('prefills the X web intent with the exact edited caption',()=>{
  const r=runtime();r.state._socialText['X (Twitter)']='مرحبا & welcome';r.socialCompose('X (Twitter)');const u=new URL(r.open.mock.calls[0][0]);expect(u.searchParams.get('text')).toBe('مرحبا & welcome');
 });
});


describe('Direct platform compose with attached media',()=>{
 it('opens the selected school page and never invokes the device picker',()=>{
  const share=vi.fn(),writeText=vi.fn(async()=>{}),r=runtime({share,canShare:()=>true,clipboard:{writeText}});
  r.state._socialProfiles={LinkedIn:'https://www.linkedin.com/company/fictional-school'};
  r.socialAddMedia([new File(['photo'],'photo.jpg',{type:'image/jpeg'})]);r.socialCompose('LinkedIn');
  expect(share).not.toHaveBeenCalled();expect(r.open).toHaveBeenCalledWith('https://www.linkedin.com/company/fictional-school','_blank','noopener,noreferrer');expect(writeText).toHaveBeenCalled();
 });
});
