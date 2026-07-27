import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://deftday.com',
  integrations: [sitemap({ changefreq: 'weekly', priority: 1, lastmod: new Date() })],
  compressHTML: true,
  // Emit privacy.html rather than privacy/index.html so /privacy is served
  // directly instead of 307-ing to /privacy/ — a cleaner URL to hand to the
  // Play Console, and one canonical form rather than two.
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
});
