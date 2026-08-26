---
name: customer-interview-summary
description: Write the short summary post for a customer/user interview in Rosie's pod-channel format, ready to paste into Slack. Reads the call transcript to infer your reactions and takeaways, asks you to confirm them, then outputs a plain-text message in a code block. Use after a user interview, or when the user says "write up my interview", "interview summary post", "/customer-interview-summary".
---

# Customer interview summary post

Produce the summary Rosie asked every pod to post after a user interview, in her exact format, as a copy-paste Slack message.

## The format (Rosie, non-negotiable)

```
*Customer:* Name, persona (eve/mike/bill), company size, role, location
*Biggest pains:* [name them]
*What was interesting*:
• bullet 1
• bullet 2
• bullet 3
```

That is the whole message. Keep it short: pains named in one line, at most 3 "interesting" bullets. Append the recording share link on its own last line if you have one.

## The quality bar (Rosie's all-hands + Leah's feedback)

Same principle from both: **facts over opinions. Trust what they did, not what they say they would do.**

- A stated "yes, that would be useful" to a hypothetical feature is nearly worthless. It is easy to say yes when you have to imagine it being true. Do not write these up as findings.
- Weight evidence of past, concrete behaviour: what they did today / this week, the last draft they edited, what you saw on their screen.
- The strongest bullets are pains and behaviours they volunteered or demonstrated, not answers to "would X help?".
- When a candidate takeaway rests only on a hypothetical yes, drop it or reframe it around what they actually did. If nothing concrete backs it, leave it out.

## Steps

1. **Find the interview.** Default to the most recent customer call. Use the Fyxer meeting connector (`find_recordings` / `search_meetings`, then `get_transcript`); fall back to the Granola connector if Fyxer has nothing. If ambiguous, ask which call.

2. **Read the transcript for two things:**
   - **The facts:** customer name, persona (eve/mike/bill), company size, role, location (city/state or city/country, whatever they state or is inferable from context, e.g. timezone talk or office mentions), and their biggest pains (what they actually struggle with, ideally shown or described in the past tense).
   - **Your reactions:** where the interviewer (Joey / "Me") got interested, surprised, dug in with a follow-up, or agreed. Those moments are the candidate takeaways. Note each with the customer line that triggered it.

3. **Screen every candidate against the quality bar above.** Separate real findings (past behaviour, demonstrated pain) from hypothetical "would be useful" answers. Discard or reframe the hypotheticals.

4. **Ask the user for their main takeaways.** Use AskUserQuestion, multiSelect, pre-filled with the takeaways you inferred from their reactions (each option = one candidate bullet, with a one-line note on the evidence behind it). Let them confirm, deselect, or add their own via Other. This is the point of the skill: their takeaways, informed by how they reacted.

5. **Write the message** in Rosie's format, using only the confirmed takeaways as the "What was interesting" bullets.

## Output rules

- Put the whole message in one fenced code block so it copies clean.
- Plain text only. The only formatting is Slack-native `*bold*` for the three labels and `•` for bullets, exactly as in the format above.
- No em-dashes, no smart quotes, no markdown headings, no extra links (recording link excepted).
- Keep it tight. If a bullet needs two sentences it is too long.

## Example (Jared Mancil interview)

```
*Customer:* Jared Mancil, mike, mid-size property insurance firm, leads the sales team, Tampa FL
*Biggest pains:* emails leaving the inbox after he replies or forwards, before he has finished both actions and moved it himself
*What was interesting*:
• Wants automated outbound follow-up sequences off proposal templates, with 24h/72h timing windows
• Certain referral sources always get immediate replies, so sender familiarity maps to real urgency for him
• 70% desktop / 30% phone, and email is where he wants to stay focused, not iMessage/Slack/Teams
```
