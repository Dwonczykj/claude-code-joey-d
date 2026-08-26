---
name: excalidraw-presentation
description: Turn one finished .excalidraw diagram into a self-contained scrollable HTML presentation that reveals the diagram across N views — view 1 starts with the simplest seed (often one node), each later view adds/moves/labels elements to introduce one new concept, ending at the full diagram. The camera pans/zooms per view and each view carries post-it bullet notes for the speaker. A second renderer turns the same views into flat one-per-slide HTML for presenting, sharing or printing. Use when the user wants to "animate an excalidraw", "build up a diagram step by step for a talk/lecture", "turn a diagram into slides", "make a deck I can present cleanly", or "explain a system diagram progressively".
---

# Excalidraw → progressive presentation

An `.excalidraw` file is JSON, not an opaque string. Every element has a stable `id`; arrows bind to nodes by `startBinding.elementId` / `endBinding.elementId`; labels sit inside a container via `containerId`. So a "view" is just a **subset of node ids**, and the whole deck is a filter over one element pool — you never redraw the diagram N times.

Two renderers sit next to this file and take the **same** `.excalidraw` + `views.json`: `build.py` for the camera deck (progressive reveal, pan/zoom, collapsible nodes) and `slides.py` for flat slides (one view per slide, everything expanded, printable). Pick with "Which renderer" below. Your job is the thinking part either way: reverse-engineer the storyline from the finished diagram and decide how many views.

## Workflow

1. **Read the manifest.** Run:
   ```bash
   python3 ~/.claude/skills/excalidraw-presentation/build.py manifest <final.excalidraw>
   ```
   This lists every node id with its type and label text. You only ever reference nodes; the builder implies the rest (see "What the builder infers").

2. **Reverse-engineer the storyline.** Load the JSON and read the arrow topology to find the logical order:
   - Nodes with no inbound arrows are natural entry points — the seed of view 1.
   - Follow `endBinding` chains outward; the DAG gives a partial order to reveal in.
   - The simplest, most homogeneous starting point is usually a single node or one small cluster the speaker can introduce with context ("this is the system we're building").

3. **Decide N with the concept test — this is the point of the skill.** A view boundary is where the answer to *"and what new idea does this introduce?"* changes. Concretely:
   - If explaining a view needs two sentences joined by "and", **split it**.
   - If two consecutive views share the same explanatory sentence, **merge them**.
   - One concept per view usually lands at 1–4 new nodes plus their edges, but node count is an *output*, never the input. Never do one-node-per-view mechanically, and never cram two concepts to save a slide.
   - For a dense diagram (~50+ nodes) expect ~6–9 views.

   **Always propose the view breakdown to the user before building** — one line of story per view + the seed for view 1 — and settle N together. The concept boundaries are genuinely not in the JSON.

4. **Author `views.json`** (schema below). List cumulative `show` ids per view (reveals are NOT auto-cumulative — repeat earlier ids, or the earlier nodes disappear). Each view gets a `title` and 2–4 `notes` bullets describing *the change this view introduces*, not a description of what's on screen.

5. **Build and open** — the camera deck, the flat slides, or both from the same views:
   ```bash
   python3 ~/.claude/skills/excalidraw-presentation/build.py build <final.excalidraw> <views.json> <deck.html>
   python3 ~/.claude/skills/excalidraw-presentation/slides.py <final.excalidraw> <views.json> <slides.html>
   ```
   Open the HTML, sanity-check the camera framing and reveals, iterate on `views.json`.

## views.json schema

```json
[
  { "title": "The inbox",
    "notes": ["One agent watches the mailbox.", "Everything downstream hangs off this."],
    "show": ["ad1"] },

  { "title": "Normalisation",
    "notes": ["Raw events are normalised before anything reasons over them."],
    "show": ["ad1", "norm"],
    "patch": { "norm": { "x": 400, "y": 340 } } }
]
```

- `show` — node ids visible in this view (rectangles / diamonds / ellipses / free-standing text). **Cumulative is manual**: to keep earlier nodes, keep listing them.
- `patch` — optional per-view position override for a node. Use it when a node should sit in a simpler spot early on and slide to its final home later; the difference from its final position tweens automatically. Omit `patch` in the last view so everything settles at the true layout.
- `notes` — speaker post-its. Introduce the concept; don't narrate the pixels.

## What the builder infers (so you don't list it)

- A node's **bound label** appears with the node — and its **first line becomes the node's header** (see collapsible nodes below), so write the label's first line as a short title and the rest as detail.
- An **arrow** appears only when *both* its bound endpoints are visible — so edges light up for free as you reveal their endpoints. This depends entirely on every arrow actually carrying `startBinding` and `endBinding`; an unpinned arrow has no endpoints to test and will either never appear or float free of the nodes it describes. If the source diagram has loose arrows, pin them before building views.
- An **arrow's label** appears with the arrow.

## Which renderer

Both read the same two files, so this is not a fork in the work — build whichever is asked for, or both.

| | `build.py` — camera deck | `slides.py` — flat slides |
|---|---|---|
| Best for | you driving a live talk, building an idea up | handing the deck over, presenting off a laptop, printing, a room that will not click |
| Reveal | progressive, camera pans/zooms per view | none: each slide shows its view complete |
| Detail | hidden behind a node's header until clicked | always visible on every card |
| Notes | post-it card, collapsible | bottom panel, two columns, `s` hides it |
| Layout | the canvas geometry, exactly | canvas rows and columns, reflowed to the window |

Default to the camera deck when the user says "walk through" / "build up"; reach for the flat slides when the deck has to survive without you (shared file, print, someone else presenting). If they only say "make me a deck to present", build both and let them choose.

## Flat slides (`slides.py`)

Nothing to author: it reads the `title` / `notes` / `show` you already wrote.

- **Rows come from the canvas.** Nodes that overlap vertically stay on one row, so a fork's three branches read side by side instead of stacking into a list.
- **The supporting column becomes a sidebar.** It finds the main column (the `x` shared by the most nodes) and moves full-width cards to its left into a right-hand sidebar; a *narrower* box at that same `x` is treated as a grid cell and stays in the flow. Nothing to configure — it is derived per diagram.
- **Fit is decided in the browser, not at build time.** Each slide lays out in one column, shrinks to fit, and if that would push text below `0.72em` it deals the rows into two balanced columns instead. So the same file suits a laptop and a 27" display; it re-fits on resize and when notes are hidden.
- **Arrows are dropped** — row order carries the sequence. Number your headers (`1 · Extract facts`) if the sequence matters.
- **Print** with ⌘P: one slide per page, notes included.
- Keys: ← → / ↑ ↓ / space / PageUp-Down, Home / End, `s` toggles notes.
- Knobs at the top of `slides.py`: `TINT` (excalidraw fill → card tint), `ROW_OVERLAP`, `SIDE_WIDTH_FRAC` (how wide a card must be to count as sidebar detail). The two-column trigger and the `0.5em` floor live in `fit` / `scale` in the JS block.

## Interaction (the camera deck)

- **Collapsible nodes.** By default each node shows only its header (label line 0), enlarged for reading from the back of a room; single-clicking a node toggles its detail body. Box geometry stays fixed across the toggle, so expanding one node never reflows the others. Controlled by `START_COLLAPSED` / `HDR_SCALE`.
- **Double-click a node to focus it.** Zooms it to fill the safe area, expands it, and raises it in front of every other element. Any node is focusable (not just collapsible ones). "Reset view" or a slide change returns to the framed default.
- **Notes card collapses.** A chevron in the card's top-right hides/shows the bullets (title stays), so the card can get out of the way of the canvas.
- **Pinned view title.** Each view's `title` is shown floating at the top-centre of the viewport (as well as on the notes card).
- **Numbered dot rail.** The active dot is replaced by its 1-based view number; the rest stay as dots.
- **Slides** move on ↑ ↓ ← → / space / PageUp-Down and the dot rail. Keys `preventDefault`, so the native scroll never fights the snap.
- **Pan** the canvas with two-finger scroll (both axes) or click-drag. A click is told from a drag by the pointer's *net* distance from where it went down; do not change this to accumulated path length, or the dozen 1px wobbles in an ordinary trackpad click add up past the threshold and every click gets swallowed as a drag. **Zoom** toward the cursor with ⌘/ctrl-scroll (or pinch) and `+` / `-`; `0` or the "reset view" button restores the framing. The manual pan/zoom composes *over* the per-view framing and **resets on every slide change**, so each view still opens correctly composed.
- **Camera safe-area.** Each view is fit into a sub-rectangle of the viewport (not the whole window), so the fixed notes card (bottom-left) and dot rail (right) never sit on top of framed content. Controlled by `SAFE`.

## How the camera deck renders (so you know the limits)

- Deterministic SVG for the `roughness: 0` clean-diagram subset: rectangle, diamond, ellipse, arrow, line, text. This matches the house excalidraw style (plain font `fontFamily: 2`, `roughness: 0`) — keep diagrams in that style.
- The camera is a CSS-transformed `<g>`: each view frames the bounding box of its visible elements (plus `PAD`, inside the `SAFE` sub-rectangle), so view 1 frames its seed tightly instead of showing one box lost in a huge empty canvas, and the pan/zoom between views tweens.
- Post-it notes are HTML beside the canvas, never excalidraw elements, so they can't disturb layout or framing.
- **Skipped:** freedraw strokes, images, frames (prints a warning). If a deck needs them, extend `RENDER` in `build.py`.

## Tuning knobs (top of `build.py`)

- `PAD` — world-units of breathing room around each view's bbox (camera tightness).
- `START_COLLAPSED` (bool) — nodes open showing only the enlarged header; set `False` for the old always-expanded, non-clickable rendering.
- `HDR_SCALE` — cap on the collapsed header size. The header auto-sizes to fill its box width (so it stays legible when the camera zooms out on wide multi-column views) up to `HDR_SCALE`× the body size, never below body size.
- `SAFE` — `{left, right, top, bottom}` viewport fractions reserved for the notes card and dot rail.
- Zoom limits live in `zoomAt`; transition durations in the `<style>` block of `TEMPLATE` (`.camera` / `.el` / `.pan` / `.hdr`).
