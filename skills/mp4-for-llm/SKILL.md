---
name: mp4-for-llm
description: Convert a video (mp4/mov/webm/etc.) into images a vision LLM can actually read. Use this whenever the user wants to "show a video to an LLM/Claude/GPT", "convert mp4 to gif for an LLM", feed video to a model, analyse/describe/summarise video content with a model, or extract frames from a video. Trigger even if the user says "gif" — vision APIs take still images, not animations, so this skill produces sampled JPEG frames or a tiled contact sheet instead. Also trigger on requests to sample, downsample, or screenshot frames from a video at intervals.
---

# mp4-for-llm

Vision LLM APIs (Claude, GPT-4o) ingest **still images**, not animated GIFs. A GIF is treated as one frame or rejected. So to "let an LLM see a video", sample it into frames.

Requires `ffmpeg` (`brew install ffmpeg`). PDF mode also needs `img2pdf` (`pip install img2pdf`).

No bundled scripts — run the ffmpeg commands below directly. They're one-liners; substitute the input path, fps, and tile grid.

Frames are chronological, so you don't need timestamps stamped on: sampled frame `N` (0-indexed) is at `N / fps` seconds. Stamping the time visually needs an ffmpeg built with libfreetype (`drawtext`), which many Homebrew builds lack — check with `ffmpeg -filters | grep drawtext`. If you have it, insert `drawtext=text='%{pts\:hms}':x=5:y=5:fontcolor=yellow:box=1:boxcolor=black@0.5` into the filter chain (before `tile` for the contact sheet). The defaults below skip it so they run everywhere.

## Three strategies

**Contact sheet (default)** — one image tiling N frames chronologically (left-to-right, top-to-bottom). Best when you want the model to reason over the whole clip in a single request and minimise tokens/cost. Set the `tile=COLSxROWS` grid so `COLS*ROWS` >= the number of sampled frames (`fps * clip_seconds`).

```bash
ffmpeg -i INPUT.mp4 -vf "fps=1,scale=320:-1,tile=5x5" -frames:v 1 sheet.jpg
```

**Separate frames** — one JPEG per sampled frame. Use when the clip is long, temporal detail matters, or the model must inspect frames individually.

```bash
mkdir -p frames && ffmpeg -i INPUT.mp4 -vf "fps=2,scale=768:-1" frames/frame_%04d.jpg
```

**PDF** — one multi-page PDF, one frame per page. Use when the target tool ingests PDFs more cleanly than multiple image uploads (some do), or to keep a whole clip in one attachment.

```bash
mkdir -p frames && ffmpeg -i INPUT.mp4 -vf "fps=1,scale=768:-1" frames/frame_%04d.jpg && img2pdf frames/frame_*.jpg -o frames.pdf
```

## Choosing FPS

`fps` is frames sampled per second of video, not playback rate.

- Static/slow content (screen recording, slideshow): `0.5`–`1`
- Normal action: `1`–`2`
- Fast motion you must not miss: `3`+

A 60s clip at `fps=1` = 60 frames. Watch the count — each frame is tokens. If a contact sheet exceeds ~20 tiles, drop fps or split into multiple sheets.

## Then feed the output to the model

Pass the resulting `.jpg`(s) as image input. For the contact sheet, tell the model the frames are chronological left-to-right, top-to-bottom, and give it the fps so it can place any tile in time (`tile N / fps` seconds).

## Notes

- Works for any ffmpeg-readable container (mov, webm, mkv, avi), not just mp4.
- If the user genuinely wants a GIF for a human, that's out of scope here — `ffmpeg -i in.mp4 -vf "fps=10,scale=480:-1" out.gif`.
