import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const apiPort = process.env.PORT ?? '3000';
const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

/** Incrusta la base de dades de prova (camí a DEMO_DB) com a mòdul virtual en base64. */
function demoDb(): Plugin {
  const ID = 'virtual:demo-db';
  return {
    name: 'demo-db',
    resolveId: (id) => (id === ID ? '\0' + ID : null),
    load(id) {
      if (id !== '\0' + ID) return null;
      const file = process.env.DEMO_DB;
      if (!file) throw new Error('Cal indicar DEMO_DB (usa npm run build:demo).');
      return `export default ${JSON.stringify(readFileSync(file).toString('base64'))};`;
    },
  };
}

export default defineConfig(({ mode }) => {
  if (mode === 'demo') {
    // Versió autònoma: les rutes del servidor s'executen al navegador sobre sql.js.
    return {
      plugins: [react(), demoDb()],
      resolve: {
        alias: [
          { find: /^\.\/transport$/, replacement: src('demo/transport.ts') },
          { find: /^\.\.?\/db\.ts$/, replacement: src('demo/db.ts') },
          { find: /^express$/, replacement: src('demo/express.ts') },
          { find: /^node:(fs|os|path|crypto|https|async_hooks)$/, replacement: src('demo/node-stub.ts') },
          { find: /^basic-ftp$/, replacement: src('demo/node-stub.ts') },
          { find: /^nodemailer$/, replacement: src('demo/node-stub.ts') },
        ],
      },
      build: { outDir: 'dist-demo', target: 'es2022', assetsInlineLimit: 100_000_000 },
    };
  }
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { '/api': `http://127.0.0.1:${apiPort}` },
    },
  };
});
