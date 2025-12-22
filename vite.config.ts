import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const normalizeBase = (value: string) => {
  const withTrailing = value.replace(/\/+$/, '') + '/';
  if (withTrailing === './') return withTrailing;
  if (/^(https?:)?\/\//.test(withTrailing)) return withTrailing;
  return withTrailing.startsWith('/') ? withTrailing : `/${withTrailing}`;
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const base = normalizeBase(env.VITE_BASE || './');
    return {
      base,
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      assetsInclude: ['**/*.wasm'],
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      test: {
        environment: 'jsdom',
        setupFiles: './vitest.setup.ts'
      }
    };
});
