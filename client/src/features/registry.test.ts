import { describe, expect, it } from 'vitest';
import { APP_SCRIPTS, RUNTIME_MODULES } from './registry';

describe('production feature registry', () => {
  it('keeps every runtime id and script path unique', () => {
    expect(new Set(RUNTIME_MODULES.map(({ id }) => id)).size).toBe(RUNTIME_MODULES.length);
    expect(new Set(APP_SCRIPTS).size).toBe(APP_SCRIPTS.length);
  });

  it('loads rendering before the API integration layer', () => {
    expect(APP_SCRIPTS.at(-5)).toBe('assets/js/core/90-render-boot.js');
    expect(APP_SCRIPTS.at(-4)).toBe('assets/js/core/95-api-adapter.js');
    expect(APP_SCRIPTS.at(-3)).toBe('assets/js/core/96-crm-api-adapter.js');
    expect(APP_SCRIPTS.at(-2)).toBe('assets/js/core/97-parents-api-adapter.js');
    expect(APP_SCRIPTS.at(-1)).toBe('assets/js/core/98-roles-api-adapter.js');
  });

  it('registers the full established module chain', () => {
    expect(RUNTIME_MODULES).toHaveLength(53);
    expect(RUNTIME_MODULES.filter(({ kind }) => kind === 'feature')).toHaveLength(38);
    expect(RUNTIME_MODULES.some(({ id }) => id === 'documents')).toBe(true);
    expect(RUNTIME_MODULES.some(({ id }) => id === 'idcards')).toBe(true);
  });
});
