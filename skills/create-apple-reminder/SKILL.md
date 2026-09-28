---
name: create-apple-reminder
description: Create an Apple reminder on Joey's Mac with a title, deadline (date and time), and optional url/notes. ONLY use when Joey explicitly asks for an Apple reminder — e.g. "add an apple reminder", "remind me in Apple Reminders", "/create-apple-reminder". Do NOT use for a generic "remind me to X" or "create a reminder" that doesn't name Apple Reminders. Tries Apple Reminders on his Mac first; if that's unreachable (running in the cloud, no Bash/osascript, Reminders permission denied), falls back to a Slack DM to himself in the "/remind" slash-command format.
---

# Create a reminder

Two paths, tried in order. Use the first one that's actually available — don't ask which to use.

## 1. Apple Reminders (preferred, Mac-local sessions only)

Only possible when this session has a working Bash tool on Joey's Mac. Use JXA (JavaScript for Automation), not AppleScript — date handling is far less fiddly:

```bash
osascript -l JavaScript -e '
  const args = $.NSProcessInfo.processInfo.arguments;
  const Reminders = Application("Reminders");
  Reminders.includeStandardAdditions = true;
  const list = Reminders.defaultList();
  const r = Reminders.Reminder({
    name: "TITLE",
    body: "NOTES_AND_URL",
    dueDate: new Date("2026-09-25T14:30:00")
  });
  list.reminders.push(r);
'
```

In practice, build the JS as a string yourself (with `title`, `dueDateIso`, and a `body` made of `notes` + `url` on their own lines, skipping either when absent) and pass it via `osascript -l JavaScript -e "$JS"` — quote/escape carefully since this runs through the shell. `dueDateIso` should be a local ISO datetime (`YYYY-MM-DDTHH:MM:SS`, no `Z`) matching Joey's timezone (Europe/London), since JS `Date` parses that as local time.

Treat it as unavailable, and fall through to Slack, if:
- there's no Bash tool in this session (cloud session), or
- `osascript` isn't on PATH (`command -v osascript` fails — not macOS), or
- the command errors (e.g. Reminders automation permission not granted, exit code non-zero).

Don't retry a failure — one clean attempt, then fall back.

On success, confirm briefly: reminder title, due date/time, and that it's in Apple Reminders.

## 2. Slack DM to self (fallback)

Send via `mcp__821107f7-6b5a-46ec-9ef5-8d53e3dc7c2a__slack_send_message` (search with ToolSearch for `slack_send_message` if that prefix differs) with `channel_id: U08G4A2GR89` — Joey's own Slack user id; DMing yourself uses your user_id as the channel.

Message body, exactly this shape (`/remind` is Slack's own reminder slash-command, so pasting this into the DM lets Joey trigger it with one click/re-send if he wants a native Slack reminder too — but as a plain message it's already a readable note in his own DM):

```
/remind to <title> at <deadline>
```

Only when `url` and/or `notes` were actually given, append:

```
 with additional details: <url> and <notes>
```

(omit the `and <notes>`/`<url>` half if only one of the two was passed; omit the whole "with additional details" clause if neither was passed)

`<deadline>` is the date and time as Joey gave it (or a plain readable form of it, e.g. `25 Sep 2:30pm`) — don't reformat into ISO for this message, it's meant to read naturally.

On success, tell Joey it went to Apple Reminders' unreachable, so it sent the reminder as a Slack DM instead, and show him the message text.
