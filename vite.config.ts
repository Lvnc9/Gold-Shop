import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

// Two builds from one source (docs/adr/0004-self-hosted-django-backend.md):
// - default: one self-contained HTML file for the claude.ai Artifact host, backed by the Artifact DB.
//   scripts/artifactize.mjs then strips the document skeleton for publishing.
// - `--mode api`: a normal multi-file build for nginx, backed by the Django API (dev server proxies /api).
export default defineConfig(({ mode }) => {
  const api = mode === 'api';
  return {
    plugins: [react(), ...(api ? [] : [viteSingleFile()])],
    resolve: {
      alias: { '#backend': src(api ? 'services/backend/api.ts' : 'services/backend/artifact.ts') },
    },
    server: api ? { proxy: { '/api': 'http://127.0.0.1:8000', '/admin': 'http://127.0.0.1:8000', '/static': 'http://127.0.0.1:8000' } } : {},
    build: api
      ? { target: 'es2022', outDir: 'dist-api', chunkSizeWarningLimit: 4000 }
      : { target: 'es2022', assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 4000 },
  };
});
