import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadNycConfig } = require('@istanbuljs/load-nyc-config');
it('loads normal coverage YAML with the patched scoped YAML dependency', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'schoolos-coverage-config-'));
  try {
    await writeFile(join(dir, '.nycrc.yaml'), 'all: true\ninclude:\n  - src/**/*.ts\n');
    const config = await loadNycConfig({ cwd: dir });
    expect(config.all).toBe(true);
    expect(config.include).toEqual(['src/**/*.ts']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
