---
name: format-slack-message
description: Convert a plain-text or markdown-formatted message into Slack desktop HTML and copy it to the clipboard via pbcopy. Handles bold, italic, inline code, emoji, and line breaks. Usable standalone or referenced from /slack-update and /product-idea.
user_invocable: true
---

# Format Slack Message

Convert a confirmed message into Slack-compatible HTML and copy it to the user's clipboard so they can paste directly into Slack's message input.

## Why This Exists

Slack's desktop/web app renders pasted HTML natively. This skill converts markdown-style formatting into the exact HTML that Slack expects, so the user can paste a fully formatted message without fiddling with Slack's editor.

## HTML Formatting Patterns

Every output must be prefixed with:
```
<meta charset='utf-8'>
```

Then apply these patterns:

### Bold
```html
<b style="font-weight: 700; font-weight: 700">text</b>
```
Convert `**text**` or standalone section header lines to this tag.

### Italic
```html
<i style="font-style: italic; font-style: italic">text</i>
```
Convert `*text*` (single asterisk) or `_text_` to this tag.

### Inline Code
```html
<code style="background-color: #f8f8f8; border: 1px solid #dddddd; border-radius: 3px; padding: 2px 4px; font-family: Monaco, Menlo, Consolas, &quot;Courier New&quot;, monospace; font-size: 12px; background-color: #f8f8f8; border: 1px solid #dddddd; border-radius: 3px; padding: 2px 4px; font-family: Monaco, Menlo, Consolas, &quot;Courier New&quot;, monospace; font-size: 12px">text</code>
```
Convert `` `text` `` (backtick-wrapped) to this tag. The duplicated CSS properties are intentional.

### Emoji
```html
<span aria-describedby="sk-tooltip-0" style="color: inherit"><img src="https://a.slack-edge.com/production-standard-emoji-assets/15.0/apple-medium/UNICODE@2x.png" aria-label="LABEL emoji" alt=":SHORTCODE:" data-stringify-emoji=":SHORTCODE:" style="height: 1.2em; width: 1.2em; vertical-align: text-bottom"></span>
```
Convert emoji shortcodes (e.g. `:bar_chart:`, `:rocket:`, `:white_check_mark:`) to this tag. Replace:
- `UNICODE` with the emoji's unicode codepoint (e.g. `1f4ca` for bar_chart, `1f680` for rocket)
- `LABEL` with the human-readable name (e.g. "bar chart")
- `SHORTCODE` with the Slack shortcode without colons (e.g. `bar_chart`)
- The `aria-describedby` tooltip ID can be any value (use `sk-tooltip-0`, incrementing for each emoji)

Common emoji unicode mappings:
- `:bar_chart:` = `1f4ca`
- `:rocket:` = `1f680`
- `:white_check_mark:` = `2705`
- `:bulb:` = `1f4a1`
- `:chart_with_upwards_trend:` = `1f4c8`
- `:fire:` = `1f525`
- `:warning:` = `26a0-fe0f`
- `:tada:` = `1f389`
- `:eyes:` = `1f440`
- `:mega:` = `1f4e3`
- `:pushpin:` = `1f4cc`
- `:star:` = `2b50`
- `:point_right:` = `1f449`
- `:green_circle:` = `1f7e2`
- `:red_circle:` = `1f534`
- `:large_blue_circle:` = `1f535`

If you encounter an emoji not in this list, look up its unicode codepoint.

### Line Breaks
```html
<br aria-hidden="true">
```
Convert each newline to this tag. Double newlines (paragraph breaks) become two `<br>` tags.

## Process

### Step 1: Accept Input

- **Standalone** (`/format-slack-message` called directly): Ask the user to paste the message they want formatted.
- **From another skill** (e.g. after `/slack-update` or `/product-idea`): Use the most recently approved output from that skill's workflow. Ask the user to confirm which message to format.

### Step 2: Convert to HTML

Apply conversions in this order:
1. Add `<meta charset='utf-8'>` prefix
2. Convert emoji shortcodes (`:shortcode:`) to the full `<span><img></span>` tag
3. Convert `**text**` to the bold `<b>` tag
4. Convert `*text*` or `_text_` to the italic `<i>` tag
5. Convert `` `text` `` to the inline code `<code>` tag
6. Strip unsupported markdown (bullet points become plain text lines, `#` headers become bold, numbered lists become plain text with numbers)
7. Convert newlines to `<br aria-hidden="true">`

The output is a single flat HTML string. Not a full HTML document.

### Step 3: Output and Copy

1. Show the formatted HTML string to the user so they can review it.
2. Copy to clipboard using Bash. Use a heredoc to handle the quotes and special characters safely:
   ```bash
   pbcopy <<'SLACK_EOF'
   THE_HTML_STRING
   SLACK_EOF
   ```
3. Confirm to the user: "Copied to clipboard. Paste directly into Slack."

### Step 4: Multi-Part Messages

If the input includes both a main message and a sub-thread (common from `/slack-update`):
1. Format and copy the main message first.
2. Tell the user: "Main message copied. Paste it into Slack, then let me know when you're ready for the sub-thread."
3. When the user confirms, format and copy the sub-thread.

## Constraints

- Never modify the wording or content of the message. This skill only formats.
- Preserve Unicode emoji characters as-is if they're already in the text (don't convert them to shortcode img tags unless requested).
- The duplicated CSS properties in style attributes are intentional and must be preserved exactly.
- This skill uses `pbcopy` (macOS). If the user is not on macOS, output the HTML string for manual copying and note the limitation.

## Example

**Input:**
```
:bar_chart: *MCP Chat Analysis - WhatsApp/iMessage Business Case*

I ran an AI analysis on 5,000 user queries to the MCP (Sep 2025 - Feb 2026) to understand whether a WhatsApp/iMessage interface is worth building. The data is pretty compelling.
```

**Output HTML:**
```html
<meta charset='utf-8'><span aria-describedby="sk-tooltip-0" style="color: inherit"><img src="https://a.slack-edge.com/production-standard-emoji-assets/15.0/apple-medium/1f4ca@2x.png" aria-label="bar chart emoji" alt=":bar_chart:" data-stringify-emoji=":bar_chart:" style="height: 1.2em; width: 1.2em; vertical-align: text-bottom"></span> <i style="font-style: italic; font-style: italic">MCP Chat Analysis - WhatsApp/iMessage Business Case</i><br aria-hidden="true"><br aria-hidden="true">I ran an AI analysis on 5,000 user queries to the MCP (Sep 2025 - Feb 2026) to understand whether a WhatsApp/iMessage interface is worth building. The data is pretty compelling.
```
