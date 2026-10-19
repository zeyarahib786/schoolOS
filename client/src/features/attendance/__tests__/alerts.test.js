import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect} from 'vitest';
const code=readFileSync('public/assets/js/modules/58-attendance.js','utf8');
function runtime(){const r={state:{},key:'class-a',attDraftKey:()=>r.key,attRoster:()=>[],attCanMark:()=>true};runInNewContext(code.slice(code.indexOf('function attDraft()'),code.indexOf('function attChange('))+code.slice(code.indexOf('function attAlertOption('),code.indexOf('function attDaily(')),r);return r;}
describe('Register alert draft controls',()=>{
 it('keeps channel selection on a previously clean register',()=>{const r=runtime();r.attDraft();r.attAlertOption('notificationChannel','SMS');expect(r.attDraft().notificationChannel).toBe('SMS');expect(r.attDraft().dirty).toBe(true)});
 it('keeps opt-in and opt-out values without rebuilding the draft between assignments',()=>{const r=runtime();r.attAlertOption('notifyGuardians',true);expect(r.attDraft().notifyGuardians).toBe(true);r.attAlertOption('notifyGuardians',false);expect(r.attDraft().notifyGuardians).toBe(false)});
 it('isolates alert preferences across register contexts',()=>{const r=runtime();r.attAlertOption('notificationChannel','Email');r.key='class-b';expect(r.attDraft().notificationChannel).toBeUndefined();r.key='class-a';expect(r.attDraft().notificationChannel).toBe('Email')});
});
