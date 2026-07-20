---
name: mp4-for-llm
description: Convert a video (mp4/mov/webm/etc.) into images a vision LLM can actually read. Use this whenever the user wants to "show a video to an LLM/Claude/GPT", "convert mp4 to gif for an LLM", feed video to a model, analyse/describe/summarise video content with a model, or extract frames from a video. Trigger even if the user says "gif" — vision APIs take still images, not animations, so this skill produces sampled JPEG frames or a tiled contact sheet instead. Also trigger on requests to sample, downsample, or screenshot frames from a video at intervals.
---

# mp4-for-llm

Vision LLM APIs (Claude, GPT-4o) ingest **still images**, not animated GIFs. A GIF is treated as one frame or rejected. So to "let an LLM see a video", sample it into frames.

Requires `ffmpeg` (`brew install ffmpeg`). PDF mode also needs `img2pdf` (`pip install img2pdf`).

## Three strategies

**Contact sheet (default)** — one image tiling N frames, each stamped with its timestamp. Best when you want the model to reason over the whole clip in a single request and minimise tokens/cost.

```bash
scripts/contact_sheet.sh INPUT.mp4 [FPS] [COLS] [OUTFILE]
# e.g. scripts/contact_sheet.sh demo.mp4 1 4 sheet.jpg
```

**Separate frames** — one JPEG per sampled frame. Use when the clip is long, temporal detail matters, or the model must inspect frames individually.

```bash
scripts/extract_frames.sh INPUT.mp4 [FPS] [WIDTH] [OUTDIR]
# e.g. scripts/extract_frames.sh demo.mp4 2 768 frames/
```

**PDF** — one multi-page PDF, one timestamped frame per page. Use when the target tool ingests PDFs more cleanly than multiple image uploads (some do), or to keep a whole clip in one attachment.

```bash
scripts/to_pdf.sh INPUT.mp4 [FPS] [WIDTH] [OUTFILE]
# e.g. scripts/to_pdf.sh demo.mp4 1 768 frames.pdf
```

## Choosing FPS

`fps` is frames sampled per second of video, not playback rate.

- Static/slow content (screen recording, slideshow): `0.5`–`1`
- Normal action: `1`–`2`
- Fast motion you must not miss: `3`+

A 60s clip at `fps=1` = 60 frames. Watch the count — each frame is tokens. If a contact sheet exceeds ~20 tiles, drop fps or split into multiple sheets.

## Then feed the output to the model

Pass the resulting `.jpg`(s) as image input. For the contact sheet, tell the model the frames are chronological left-to-right, top-to-bottom, and that timestamps are stamped top-left.

## Notes

- Works for any ffmpeg-readable container (mov, webm, mkv, avi), not just mp4.
- If the user genuinely wants a GIF for a human, that's out of scope here — `ffmpeg -i in.mp4 -vf "fps=10,scale=480:-1" out.gif`.
