import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
const script = readFileSync('public/assets/js/core/95-api-adapter.js', 'utf8');
const writeMap = script.slice(script.indexOf('  var WRITE_MAP = {'), script.indexOf('  function installSettingsWorkflow()'));
function staffUpload(api) {
  const context = { api, atob, Uint8Array, Promise, DOC_BUFFER: Object.fromEntries(['id', 'degree', 'photo'].map(key => [key, { name: key + '.png', type: 'image/png', url: 'data:image/png;base64,AQID' }])) };
  runInNewContext(writeMap, context);
  return context.WRITE_MAP.createStaff.after({}, { data: { _id: 'staff-test' } });
}
describe('staff onboarding attachment persistence', () => {
  it('uploads all selected document bytes against the newly created staff record', async () => {
    const calls = [];
    await staffUpload(async (path, options) => { calls.push({ path, options }); });
    expect(calls.map(c => c.path)).toEqual(['/staff/staff-test/documents/id', '/staff/staff-test/documents/degree', '/staff/staff-test/documents/photo']);
    for (const { options } of calls) {
      expect(options.method).toBe('PUT');
      expect(options.headers['Content-Type']).toBe('image/png');
      expect(Array.from(options.body)).toEqual([1, 2, 3]);
    }
  });
  it('waits for other uploads before rolling back and reports failure', async () => {
    const calls = []; let release;
    const pending = new Promise(resolve => { release = resolve; });
    const result = staffUpload(async (path, options) => {
      calls.push(options.method + ' ' + path);
      if (path.endsWith('/degree')) throw Error('Upload failed');
      if (path.endsWith('/photo')) await pending;
    });
    const assertion = expect(result).rejects.toThrow('Upload failed');
    await Promise.resolve();
    expect(calls.some(c => c.startsWith('DELETE'))).toBe(false);
    release();
    await assertion;
    expect(calls.at(-1)).toBe('DELETE /staff/staff-test');
  });
});
