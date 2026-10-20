---
name: quick-design-proto
description: Turn a rough Fyxer web-app idea into a clickable, fake-data HTML prototype published as a private Artifact, in the Fyxer app shell, in a few minutes. Asks five short questions first, builds one self-contained page, then refines it in rounds from one-line feedback. Use when the user says "quick design proto", "/quick-design-proto", "prototype this idea", "mock this up", "make a clickable concept", or wants to show a product idea to the team without writing app code.
---

# Quick design proto

Goal: a page someone can click through and react to. Not production code, not a spec. Nothing touches the repo.

## 1. Ask (one message, five questions, skip any the user already answered)

Offer a default for each so the user can reply "defaults".

1. **Idea in one sentence.** What does the user get that they didn't have before?
2. **Who is it for?** Default: Mike (see the `icp` skill). Eve or Bill only if the idea is team or admin.
3. **Where does it appear?** Default: in the surface he already uses (Gmail, Outlook, a meeting, the web app). Not a new destination.
4. **The one moment to show.** The click or input that makes the idea land. Default: the first 60 seconds of use.
5. **What fake data tells the story?** Default: invent a believable sales day (named client, deal, thread). Label it "illustrative data".

Also ask for a screenshot of the nearest real screen and the Fyxer logo if the user has them. If not, use the tokens below.

If the idea fights `product-philosophy` (dashboard-only discovery, more categories, auto-send, new UI to learn), say so in one line and build the version that fits instead.

## 2. Build

One `.html` file. Load the `artifact-design` skill first, then write the file to the scratchpad and publish with the Artifact tool (private by default).

- **Self-contained.** Inline CSS and JS. Only external resource allowed: Google Fonts (DM Sans, JetBrains Mono). Embed any logo or icon as a data URI, since artifacts can't load outside images.
- **Fyxer app shell.** Left sidebar 260px, then a content column. Tokens: `--bg:#fff; --panel:#faf9f7; --text:#1a1a1a; --muted:#6b6b6b; --line:#ebebeb; --orange:#f26522; --tint:#fff0e8; --green:#328265; --greenbg:#edf7f1`; sidebar `#f7f6f2` with border `#e6e5df`; font DM Sans 14px. Check `app/src` for the real nav labels so the shell matches.
- **Fake data in arrays; render with JS.** No fetches, no storage, no real people or customers.
- **One working interaction per screen**, the one from question 4. A toggle that changes a preview beats three static cards.
- **Mobile.** Sidebar collapses to a top bar under 760px, 16px gutters, no horizontal scroll.
- **Footer on every view:** `Fyxer <Feature> · concept / illustrative data`.
- **Several ideas?** One page, an "Idea 1 / 2 / 3" switch at the top, each idea's CSS and IDs scoped under its own prefix so they don't collide.

## 3. Hand back

Give the link and three lines: what the page shows, what is faked, and what you assumed. Then ask for the first round of feedback.

## 4. Refine in rounds

Each reply from the user ("controls too small", "keep the preview in view on mobile", "add an empty state") is one round. Edit the same file, republish to the same URL, and don't restructure unless asked. Leave a CSS comment like `/* Round 2: ... */` so the history is readable.

## Rules

- Publish private. Don't share the link outside the user, and don't impersonate a real person or customer in the sample data.
- No real Fyxer customer data, ever. If the idea needs realistic data, invent it.
- Don't write to the repo. If the user wants to build the idea for real, hand off to `product-spec` or `design-to-requirements`.
