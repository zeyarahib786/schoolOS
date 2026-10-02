import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Static product assets are served from /assets and /data.
  publicDir: 'public',
  server: {
    port: 5173,
    strictPort: true,
  },
});
