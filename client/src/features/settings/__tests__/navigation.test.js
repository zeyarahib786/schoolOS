// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect, vi } from 'vitest';
const source=readFileSync('public/assets/js/core/41-shell-drawer-roles.js','utf8');
function runtime(){
 document.body.innerHTML='<button id="origin">Open</button><div class="main"></div><div id="scrim"></div><aside id="drawer"></aside>';
 const r={document,state:{module:'settings'},SCHOOLOS_ADAPTER:{user:{_id:'admin1'}},$:s=>document.querySelector(s),a11yEnhance:()=>{},localizeView:()=>{},setTimeout:()=>{}};r.window=r;runInNewContext(source,r);return r;
}
const page=(title,body='',form=false)=>'<div class="dh"><h3>'+title+'</h3></div><div class="db '+(form?'form-body':'')+'">'+body+'</div>';
describe('shared detail-page navigation',()=>{
 it('adds Back universally and preserves wizard inputs, scroll and live listeners',()=>{
  const r=runtime();r.openDrawer(page('Records','<button id="record">Open record</button>'));const clicked=vi.fn();document.getElementById('record').addEventListener('click',clicked);document.querySelector('.db').scrollTop=80;
  r.openDrawer(page('Step one','<input value="original">',true));document.querySelector('.db input').value='unsaved value';r.openDrawer(page('Step two','<input>',true));
  document.querySelector('.workspace-back').click();expect(document.querySelector('.db input').value).toBe('unsaved value');r.backDrawer();expect(document.querySelector('.db').scrollTop).toBe(80);document.getElementById('record').click();expect(clicked).toHaveBeenCalledTimes(1);r.backDrawer();expect(document.getElementById('drawer').classList.contains('on')).toBe(false);expect(document.querySelector('.main').hasAttribute('inert')).toBe(false);
 });
 it('does not resurrect completed forms or temporary credentials from history',()=>{
  const r=runtime();r.openDrawer(page('Directory'));r.openDrawer(page('Generate login','<input value="draft">',true));r.openDrawer(page('Credentials generated','<div id="schoolCredentialReceipt">secret</div>'),{replace:true});r.backDrawer();expect(document.getElementById('drawer').textContent).toContain('Directory');expect(document.body.textContent).not.toContain('secret');expect(r.schoolDrawerTrail).toHaveLength(0);
 });
 it('does not retain password forms and clears history on module/session changes',()=>{
  const r=runtime();r.openDrawer(page('Profile'));r.openDrawer(page('Password','<input type="password" value="private">',true));r.openDrawer(page('Next step','<input>',true));r.backDrawer();expect(document.getElementById('drawer').textContent).toContain('Profile');r.state.module='students';r.openDrawer(page('Students'));expect(r.schoolDrawerTrail).toHaveLength(0);r.SCHOOLOS_ADAPTER.user._id='another';r.backDrawer();expect(document.getElementById('drawer').classList.contains('on')).toBe(false);
 });
 it('replaces filter refreshes and invokes safe refresh on returning to a directory',()=>{
  const r=runtime(),restore=vi.fn();r.openDrawer(page('Profile'));r.openDrawer(page('Directory'),{onRestore:restore});r.openDrawer(page('Directory','filtered'),{replace:true,onRestore:restore});expect(r.schoolDrawerTrail).toHaveLength(1);r.openDrawer(page('Create','<input>',true));r.backDrawer();expect(document.getElementById('drawer').textContent).toContain('filtered');expect(restore).toHaveBeenCalledTimes(1);
 });
});
