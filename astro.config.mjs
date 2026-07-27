import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://deftday.com',
  integrations: [sitemap({ changefreq: 'weekly', priority: 1, lastmod: new Date() })],
  compressHTML: true,
  // One page, one 22 KB stylesheet: inlining removes the only render-blocking
  // request left on the critical path.
  build: { inlineStylesheets: 'always' },
});
