---
name: fyxer-doc
description: Generate a pretty, Fyxer-branded, self-contained interactive HTML document from any content. Wraps an HTML body you author in the official Fyxer design system (brand tokens, Poppins, inline logo, hard shadows) plus inline interactivity (tabs, sub-filters, tooltips, accordions, code-copy). Use whenever you want a polished branded HTML page, one-pager, report, dashboard, brief, changelog, or share-out — anywhere, not tied to any specific data source. Triggers: "branded html", "Fyxer-branded doc/page/report", "make a pretty html", "one-pager", "html dashboard".
---

Turn any content into a polished, on-brand, **single self-contained `.html` file** (inline CSS + JS + logo, no external deps except the Google Fonts link). You author the page body using the bundled components; `build.py` wraps it in the Fyxer shell.

This skill is the general-purpose authoring tool. (`fyxer-html-report` is the narrower sibling that renders the three fixed weekly reports from rigid data contracts — use this one for everything else.)

## Workflow

1. Decide the document: title, optional eyebrow + subtitle, theme (parchment default / white / dark).
2. Read `COMPONENTS.md` for copy-paste HTML snippets, then write the page **body fragment** (everything that goes inside `<div class="wrap">`, after the header) to a file.
3. Build:
   ```
   python3 ~/.claude/skills/fyxer-doc/build.py \
     --title "Q2 retrieval-quality review" \
     --eyebrow "Internal brief" \
     --subtitle "Prepared 2026-06-07 · LLM Ops" \
     --body /tmp/body.html \
     --out ~/Desktop/q2-review.html
   ```
   Or pipe the body on stdin (omit `--body`). Open the result in a browser.

`build.py` options: `--title` (req), `--out` (req), `--body <file>` (else stdin), `--eyebrow`, `--subtitle` (HTML ok), `--theme parchment|white|dark`, `--logo auto|orange|white|symbol|none` (auto = white on dark, else orange), `--no-header`, `--extra-css <file>`.

## Brand rules (non-negotiable — from the official brand system)

- **No emojis. No exclamation marks. No hype words** ("revolutionary", "game-changing"). Confident, understated copy.
- Exact colors only: orange `#FF5A39`, parchment `#F2F3EB`. Use the CSS vars, never approximate.
- Orange is an **accent** (headlines, stats, CTAs, borders, logo), never a full-page background — except a closing CTA band (~40% max).
- **Poppins** everywhere. Body copy is Regular 400 and **never bold**. Eyebrows are ALL CAPS Semibold. Headlines sentence case. Left-aligned (center only single stat numbers or standalone CTA buttons).
- Hard Y-offset shadows (`var(--shadow-card)` = `0 10px 0 #C6C7B8`), never soft/blurry. Small radius 8px, large 24px.
- The real logo is bundled (orange/white wordmark + black nav symbol) and inlined automatically — never make a text placeholder. Never put the orange logo on an orange/dark background (that's why `--logo auto` flips to white on `--theme dark`).
- Tertiary colors (yellow/greens/blues/purple/pink) only for small data-viz or illustration accents, max ~10% of visual weight.
- Orange text on light fails WCAG for small text — only use orange for large/bold text, borders, and icons; body text is black on white/parchment.

`assets/base.css` already encodes all of this. Stick to its classes and CSS vars and you stay on-brand by construction. For deeper brand guidance (voice, layout math, marketing recipes like the case-study one-pager) consult `anthropic-skills:branding`.

## What's bundled

- `build.py` — wraps a body fragment in the branded, self-contained shell.
- `assets/base.css` — the full brand design system + component library (the official `brand-system.md` class names: `.stats-triplet`, `.bullet-list`, `.card--accent-top/left`, `.cta-band`, `.eyebrow`, `.cta-button`/`.btn`, `.stat-number`, plus callouts, tags, tabs, sub-filter, accordion, data table, code block, timeline, grids, tooltip).
- `assets/report.js` — interactivity: tooltip engine (`data-tooltip`), panel tabs, status sub-filter, select-driven table filter, code-copy buttons, `location.hash` deep-linking. Native `<details>` powers accordions/drawers (no JS needed).
- `assets/logo-wordmark-orange.b64`, `-white.b64`, `logo-symbol-black.b64` — official logos as inline data URIs.
- `COMPONENTS.md` — the snippet cookbook. Read it before authoring a body.

## Interactivity contract (markup ↔ report.js)

- **Tabs**: `data-panel-tab="key"` buttons in a `.tabbar` + `<section data-panel="key">` panels. One panel shows at a time; arrow-key navigable; deep-linked via hash.
- **Sub-filter**: `.subfilter [data-filter="key"]` buttons (mark the default/all one `data-filter-all`) + items `[data-filterable][data-status="tokens"]`.
- **Table filter**: wrap in `[data-rowscope]`, add `<select data-rowfilter="surface">`, tag rows `[data-row] data-surface="...">`.
- **Tooltips**: `data-tooltip="..."` on any element (never also set native `title=`).
- **Accordions / drawers**: native `<details class="accordion">` or `<details class="drawer">`.
- **Code copy**: `<pre class="code" data-copy>` gets an auto Copy button.
- **Entrance animation**: add class `entrance` (or use `.card.entrance`).
