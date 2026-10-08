import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { transformWithEsbuild, type Plugin } from 'vite';
import { APP_SCRIPTS } from '../src/features/registry';

// Keep classic-script global bindings: inline handlers and direct eval use them.
export function runtimeBundle(): Plugin {
  const virtualId = 'virtual:schoolos-runtime';
  const resolvedId = '\0' + virtualId;
  let root: string;
  let command: string;
  const source = async () => (await Promise.all(APP_SCRIPTS.map(async (script) => {
    const filename = resolve(root, 'public', script);
    return `\n;\n// ${script}\n${await readFile(filename, 'utf8')}\n`;
  }))).join('');

  return {
    name: 'schoolos-runtime',
    configResolved(config) { root = config.root; command = config.command; },
    resolveId(id) { if (id === virtualId) return resolvedId; },
    async load(id) {
      if (id !== resolvedId) return;
      APP_SCRIPTS.forEach(script => this.addWatchFile(resolve(root, 'public', script)));
      if (command === 'serve') {
        return 'export default "/schoolos-runtime.js";';
      }
      const result = await transformWithEsbuild(await source(), 'schoolos-runtime.js', {
        loader: 'js', target: 'es2022', minifyWhitespace: true,
        minifySyntax: true, minifyIdentifiers: false,
      });
      const reference = this.emitFile({ type: 'asset', name: 'schoolos-runtime.js', source: result.code });
      return `export default import.meta.ROLLUP_FILE_URL_${reference};`;
    },
    configureServer(server) {
      server.middlewares.use('/schoolos-runtime.js', async (_req, res, next) => {
        try {
          res.setHeader('Content-Type', 'text/javascript');
          res.setHeader('Cache-Control', 'no-store');
          res.end(await source());
        } catch (error) { next(error); }
      });
    },
  };
}
