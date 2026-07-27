# Platform-native motion for the DeftDay marketing site

Date: 2026-07-26
Status: approved

## Problem

The site looks finished but is technically dated. It uses none of the modern CSS
platform: no `@property`, `oklch()`, `animation-timeline`, anchor positioning,
container queries, `text-wrap`, `content-visibility`, `@starting-style` or view
transitions. Instead, 428 lines of imperative JavaScript across four components
drive effects the platform now does natively — an IntersectionObserver for every
reveal, a scroll handler that measures the manifesto on each frame, a
`setInterval` ticking a fake score, and percentage maths positioning the hero
chips.

The brand is "daybreak on dark", but nothing on the page actually breaks into
day. The sunrise is a static gradient.

## Goal

Make the page visually richer *and* technically current, without giving up what
the site already earns: Lighthouse 99/100/100/100, full function with JavaScript
disabled, and complete `prefers-reduced-motion` support.

## Signature: the page is a sunrise

One scroll timeline on the document root drives a typed custom property
`--dawn` from 0 to 1 across the whole page. Every ambient layer reads it, so
scrolling literally moves the site from night to daybreak: the hero opens in
deep night, and the contact CTA is the brightest moment on the page.

```css
@property --dawn { syntax: '<number>'; inherits: true; initial-value: 0; }

@supports (animation-timeline: scroll()) {
  :root {
    animation: daybreak linear both;
    animation-timeline: scroll(root block);
  }
  @keyframes daybreak { from { --dawn: 0 } to { --dawn: 1 } }
}
```

`--dawn` feeds, in order of visual weight:

1. an ambient light layer behind the content (opacity and vertical position),
2. the hero blobs' elevation and opacity,
3. the brand gradient's angle,
4. the grain overlay's strength.

This is only possible because `@property` makes a bare number animatable and
`animation-timeline` binds it to scroll position. Neither existed in the
codebase before.

## Technical layers

| Feature | What it replaces or adds |
|---|---|
| `@property` | Animatable `--dawn` and `--grad-angle`; a live gradient angle |
| `animation-timeline: scroll()` | The page-wide daybreak timeline; the scroll progress bar |
| `animation-timeline: view()` | Every `.rv` reveal, the manifesto lighting, the Lab phone screens — replaces the global IntersectionObserver, the manifesto scroll handler and the score `setInterval` |
| `oklch()` + `color-mix()` | The coral→amber ramp, which currently passes through a muddy dark orange in sRGB |
| `anchor-name` / `position-anchor` | Hero chips attach to the phone element instead of being placed by percentage against `.stage` |
| Container queries | Phone mockups and discipline cards size their internals from their own width, removing viewport media queries |
| `text-wrap: balance` / `pretty` | The one-word widows the visual review found ("day.", "on.") |
| `@starting-style` | Declarative loader curtain and hero entrance |
| `content-visibility: auto` | Below-fold sections skip rendering work while off-screen |
| View Transitions | Cross-document transition between `/` and the 404 page |
| Scroll progress bar | A 2px sunrise-gradient strip at the top, driven by `scroll()`, zero JavaScript |

## Supporting motion

Each Lab product's phone screen animates on its own `view()` timeline as the row
enters the viewport: EatStep's order rows check off, Munchview's player bar
fills, Pickorn's poster settles, SkyBattleSea's score climbs. This removes the
`setInterval` that currently fakes a live score.

## Guardrails

- **Progressive enhancement.** Every new feature sits inside `@supports`. A
  browser without support renders exactly today's site — the fallback JS stays
  in place, gated by `@supports not`, and is removed only where the CSS path is
  universally available.
- **Reduced motion.** The existing `prefers-reduced-motion` block disables all
  new animations, including the daybreak timeline.
- **No-JS.** Improves rather than regresses: reveals stop depending on
  JavaScript entirely.
- **Performance.** Lighthouse must stay at or above 95 in all four categories,
  measured on the production build served statically, before and after. Paint
  cost of `--dawn` is measured, not assumed — the earlier `will-change`
  experiment made Style & Layout three times worse, so every new property that
  drives animation gets a before/after measurement.
- **Language.** English only, everywhere.
- **Copy integrity.** No label may contradict what it sits next to, on the page
  or in structured data.

## Risks

- Anchor positioning may lag in Firefox. The `@supports` fallback keeps the
  current percentage placement, which is already verified correct from 1024 to
  2560px.
- Driving many properties from one custom property can be expensive. Mitigation:
  `--dawn` only feeds opacity, transform and a fixed background layer — never
  layout — and the result is measured.
- Scroll-driven reveals fire on a different schedule than IntersectionObserver,
  so the reveal ranges need tuning per section rather than a single global rule.

## Success criteria

1. Scrolling the page visibly moves it from night to daybreak.
2. Lighthouse ≥95 in all four categories on the production build.
3. Content fully readable with JavaScript disabled.
4. Nothing animates under `prefers-reduced-motion`.
5. No horizontal overflow and no sub-44px tap target from 320 to 2560px.
6. Net JavaScript across components goes down, not up.
