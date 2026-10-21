import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import SITE from './site.config.js';

export default defineConfig({
  base: SITE.base,
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        privacy: resolve(import.meta.dirname, 'privacy/index.html'),
        notFound: resolve(import.meta.dirname, '404.html'),
      },
    },
  },
});
