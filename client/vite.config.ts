import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { runtimeBundle } from './build/runtime';

export default defineConfig({
  plugins: [react(), runtimeBundle()],
  // Static product assets are served from /assets and /data.
  publicDir: 'public',
  server: {
    port: 5173,
    strictPort: true,
  },
});
