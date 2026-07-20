---
name: no-response
description: Receive the current user message and stop without replying. Only acts when explicitly invoked as /no-response on a message — never infer it. Applies to the current message only, not the whole thread or session.
---

# no-response

When this skill is invoked, do not respond to the current user message.

- Produce no reply, no tool calls, no acknowledgement text.
- End the turn immediately.
- This applies only to the message that invoked the skill. The next message is handled normally.
