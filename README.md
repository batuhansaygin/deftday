# DeftDay — deftday.com

Marketing site for **DeftDay**, an independent app & game studio building
apps, games and everyday utilities for iOS, Android and the web. Home of
EatStep, Munchview, Pickorn and the live browser game
[SkyBattleSea](https://skybattlesea.com).

Single-page Astro site, static output, no UI framework — plain CSS
(`src/styles/global.css`) and vanilla TypeScript in component `<script>` tags.
Art direction: *daybreak on dark* — coral→amber sunrise gradient on near-black,
Space Grotesk display type with Fraunces italic accents.

## Setup

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output → dist/
npm run preview    # serve the production build locally
```

## Deploy

The build is fully static (`dist/`) and works on any static host:

- **Vercel / Netlify** — connect the repo; the Astro framework preset is
  auto-detected (build command `npm run build`, output directory `dist`).
- **Cloudflare Pages / GitHub Pages** — same build command and output dir.

The production domain is set in [astro.config.mjs](astro.config.mjs)
(`site: 'https://deftday.com'`); canonical URLs and the sitemap are generated
from it, so update it if the site moves.

## Structure

| Content | File |
|---|---|
| Titles, meta, OG cards, JSON-LD | `src/layouts/Base.astro` |
| Loader, nav, hero, marquee | `src/components/DesktopHero.astro` |
| Studio manifesto | `src/components/Manifesto.astro` |
| "What we build" cards | `src/components/AppsGrid.astro` |
| "In the lab" projects + counters | `src/components/Lab.astro` |
| Craft list | `src/components/Craft.astro` |
| Contact CTA | `src/components/Contact.astro` |
| Footer | `src/components/Footer.astro` |
| Design tokens & all styling | `src/styles/global.css` |

## SEO & accessibility notes

- `@astrojs/sitemap` emits `sitemap-index.xml`; `public/robots.txt` points to it.
- Unique title/description, canonical, Open Graph + Twitter cards
  (`public/og.png`, 1200×630), JSON-LD Organization + WebSite.
- Single `h1`, one semantic `h2` per section.
- Everything works with JavaScript disabled (content is plain HTML; the loader
  and reveal animations are gated behind an `html.js` class).
- All motion respects `prefers-reduced-motion`; small text meets 4.5:1 contrast.
