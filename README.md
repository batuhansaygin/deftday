# DeftDay — deftday.com

Marketing site for **DeftDay**, an independent app & game studio building
apps, games and everyday utilities for iOS, Android and the web. Home of
EatStep, Munchview, Pickorn and the live browser game
[SkyBattleSea](https://skybattlesea.com).

Single-page Astro site, static output, no UI framework — plain CSS
(`src/styles/global.css`) and vanilla TypeScript in component `<script>` tags.
Art direction: *daybreak on dark* — coral→amber sunrise gradient on near-black,
Space Grotesk display type with DM Serif Display italic accents.

## Setup

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output → dist/
npm run preview    # serve the production build locally
```

## Deploy

The build is fully static (`dist/`) and works on any static host:

- **Vercel** — connect the repo; `vercel.json` sets long-lived cache headers for
  `/fonts/*`, security headers, and `cleanUrls`.
- **Cloudflare Pages / Netlify** — same build, and `public/_headers` carries the
  equivalent caching rules for hosts that read that file.

The production domain is set in [astro.config.mjs](astro.config.mjs)
(`site: 'https://deftday.com'`); canonical URLs and the sitemap come from it.

**At launch, in the host's dashboard:** add both the apex and `www` domains and
turn on redirect-to-primary, so `www.deftday.com` and any `http://` variant issue
a single 301 to `https://deftday.com/` — everything on the page canonicalises to
the apex.

## Structure

| Content | File |
|---|---|
| Titles, meta, OG cards, JSON-LD | `src/layouts/Base.astro` |
| Loader, cursor, nav + global scripts | `src/components/SiteChrome.astro` |
| Hero + marquee | `src/components/Hero.astro` |
| Studio manifesto | `src/components/Manifesto.astro` |
| "What we build" cards | `src/components/AppsGrid.astro` |
| "In the lab" products + counters | `src/components/Lab.astro` |
| Craft list | `src/components/Craft.astro` |
| Contact CTA | `src/components/Contact.astro` |
| Footer + section nav | `src/components/Footer.astro` |
| 404 page | `src/pages/404.astro` |
| Design tokens & styling | `src/styles/global.css` |
| Self-hosted `@font-face` rules | `src/styles/fonts.css` |

## Fonts

Space Grotesk, Inter and DM Serif Display are **self-hosted** from
`public/fonts/` so the critical path has no third-party hop. Space Grotesk and
Inter are variable, so one file covers every weight in use. Only the three
`latin` files are preloaded; `latin-ext` is declared with a `unicode-range` and
fetched only if a character in that range appears.

To refresh them, request the Google Fonts CSS with a modern browser
`User-Agent`, download the `woff2` files it references into `public/fonts/`, and
keep the `unicode-range` values in `src/styles/fonts.css` in sync.

## Social card

`public/og.png` (1200×630) is rendered from [scripts/og-card.html](scripts/og-card.html)
with headless Chrome:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --screenshot=public/og.png \
  --window-size=1200,630 --hide-scrollbars --virtual-time-budget=8000 \
  "file://$PWD/scripts/og-card.html"
```

It deliberately carries no grain overlay — noise defeats PNG compression and
pushed the file past the size where WhatsApp silently drops link previews.

## SEO & accessibility notes

- `@astrojs/sitemap` emits `sitemap-index.xml` with `lastmod`; `public/robots.txt`
  points to it. The 404 page is `noindex` and stays out of the sitemap.
- Unique title (58 chars) and description (152 chars), canonical, full Open Graph
  and Twitter cards including image dimensions and alt text, and
  `max-image-preview:large`.
- JSON-LD `@graph`: Organization (512px logo, contactPoint), WebSite, WebPage and
  a node per product — every claim matches copy that is visible on the page.
  Emitted only on indexable pages so the entity `@id`s bind to one URL.
- Single `h1` inside `<main>`, one semantic `h2` per section, `<header>` banner
  landmark, and a keyboard skip link.
- Works with JavaScript disabled: content is plain HTML, counters ship their real
  values, and the loader and reveal animations are gated behind an `html.js` class.
- All motion respects `prefers-reduced-motion`; small text meets 4.5:1 contrast.
- Lighthouse on the production build: **99 performance / 100 accessibility /
  100 best practices / 100 SEO**.
