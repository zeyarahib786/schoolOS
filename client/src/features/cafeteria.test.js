import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const script = readFileSync('public/assets/js/modules/78-cafeteria.js', 'utf8');

function overview(menu) {
  return runInNewContext(script + '\n; cafeOverview();', {
    M: {}, window: {}, MENU: menu, WALLETS: [], CAFESTOCK: [], CAFEITEMS: [], CAFETXN: [],
    miniStat: () => '', cbar: () => '', cellUser: () => '', aed: (value) => String(value),
  });
}

describe('cafeteria overview', () => {
  it('renders an empty state when the live menu has no entries', () => {
    const html = overview([]);
    expect(html).toContain('No menu configured');
    expect(html).toContain('Weekly menu tab');
    expect(html).toContain('Recent transactions');
  });

  it('keeps configured meals visible', () => {
    const meal = { item: 'Test meal', cal: 250, alg: [], veg: true };
    const html = overview([{ day: 'Monday', b: meal, l: meal, s: meal }]);
    expect(html).toContain("Today's menu · Monday");
    expect(html).toContain('Test meal');
    expect(html).not.toContain('No menu configured');
  });
});
