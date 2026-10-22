import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import SITE from './site.config.js';
import seoPlugin from './src/seo-plugin.js';

export default defineConfig({
  base: SITE.base,
  // UNISON_SPONSOR_URL / UNISON_UPI_ID turn the Support section on for a local preview (Plan 13, see DEV-GUIDE).
  plugins: [seoPlugin({ ...SITE, sponsorUrl: process.env.UNISON_SPONSOR_URL || SITE.sponsorUrl, upiId: process.env.UNISON_UPI_ID || SITE.upiId })],
  build: {
    // three.js is ~500 kB minified (~128 kB gzip) in one shared chunk; it loads only after the page text, when a scene comes near.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        privacy: resolve(import.meta.dirname, 'privacy/index.html'),
        notFound: resolve(import.meta.dirname, '404.html'),
      },
    },
  },
});
