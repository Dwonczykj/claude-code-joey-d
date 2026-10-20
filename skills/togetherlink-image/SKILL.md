---
name: togetherlink-image
description: Generate or edit raster images for the current project with Together Link. Use when the user asks for a photo, illustration, texture, sprite, mockup, background, or another bitmap asset. Prefer repo-native code or SVG for deterministic vector graphics.
---

# Together Link Image Generation

Use the installed Together Link CLI. It reuses the configured Together API key and lets the hosted gateway select the image model.

Invoke this workflow automatically when the request calls for a raster asset; the user does not need to name Together Link. This workflow is supported in Claude Code and Desktop Code. If the current Claude surface cannot run shell commands or access project files, ask the user to open the project in Claude Code or Desktop Code instead of pretending the image was created. Do not claim that Chat or Cowork can run this workflow.

- If `togetherlink` is absent from PATH, use `"$HOME/.togetherlink/bin/togetherlink"` when installed there. If neither executable exists, report that Together Link must be installed; do not substitute a provider API call.
- For a new image, run `togetherlink image generate --prompt <text> --out <path.png>`.
- To edit or compose local images, run `togetherlink image edit --image <path> [--image <path> ...] --prompt <text> --out <path.png>`.
- Quality defaults to `auto`. Use `--quality draft` for quick disposable iterations, `--quality standard` for a balanced repo-ready asset, or `--quality best` when the user prioritizes fidelity over latency and cost.
- Together Link records the generated seed. Pass `--seed <integer>` only when the user wants a reproducible rerun or a controlled comparison.
- Keep `auto` unless the user clearly signals a quality preference. The hosted gateway resolves the operation and model; never put a provider model name in the command.
- Keep reference images in meaningful order and identify them as image 1, image 2, and so on in the prompt.
- Use PNG by default. JPEG is also supported. Do not request WebP output.
- Save project assets inside the workspace. Use a descriptive path supplied by the user or inferred from the project.
- Do not overwrite an existing asset unless the user explicitly requests replacement. Otherwise choose a sibling filename.
- After each generation or edit, visually inspect every output when a Read tool is available. For one output, read that image once. For multiple outputs, read each image in its own sequential Read tool call; never batch or parallelize image reads, because grouped reads hide previews in Claude Desktop.
- Present every resulting image individually in the final response with its filename and a short label. Do not show only a directory, table, or list of paths when visual previews are available.
- Never ask for or expose an API key, choose a provider model, or call the Together image endpoint directly.
