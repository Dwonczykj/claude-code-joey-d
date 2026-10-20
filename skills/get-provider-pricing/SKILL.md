---
name: get-provider-pricing
description: Look up what Fyxer pays a provider, per model or SKU, from the signed supplier-agreement pricing JSON in /Users/joey/FyxerGh/fyxer-supplier-agreements, then fill any gaps from the provider's live pricing page. Use whenever a task needs a price, a cost estimate or a before/after saving for OpenAI, Groq, Pinecone, Exa, Recall, Algolia, Deepgram, ElevenLabs, Google Vertex embeddings, Google DLP or SendGrid. Triggers: "what do we pay for X", "provider pricing", "model cost lookup", "price this", "/get-provider-pricing".
---

# get-provider-pricing

Read the pricing Fyxer actually pays. Start from the agreement files; go to the web only for what they lack.

## 1. Find the file

The directory is `/Users/joey/FyxerGh/fyxer-supplier-agreements` (not a git repo, read only). File names are not uniform, so glob rather than guess:

```bash
ls /Users/joey/FyxerGh/fyxer-supplier-agreements
```

Names seen so far: `openai.pricing.json`, `groq-pricing.json`, `recall-pricing.json`, `pinecone.pricing.json`, `exa.pricing.json`, `algolia.pricing.json`, `deepgram.pricing.json`, `elevenlabs.pricing.json`, `sendgrid.pricing.json`, `googleDLP.pricing.json`, `googleVertexAI.embeddings.pricing.json`. A provider with no file goes straight to step 3.

## 2. Read it

Every file has a `_meta` block, then one object per model or SKU. Read `_meta` first: it states the unit (for example USD per 1,000,000 tokens), where the list price came from, the contract term and any credits.

Each entry has `list` (public price), `discount_pct` and `effective` (what Fyxer pays). **Use `effective`.** Price keys are whatever the provider bills (`input`, `cached_input`, `output` for LLMs; `bot_hour`, `read_units` and so on elsewhere), so read the keys, don't assume tokens.

Things that trip people up:

- **Reasoning tokens are billed as output.** `reasoning` equals `output` for reasoning models and is `null` otherwise. Count reasoning tokens inside output; never add them on top.
- **`null` means unknown, not free.** An entry with null prices, or a `price_source` saying "verify", needs a live check (step 3) and a note to the user.
- **Model ids differ from code.** Fine-tunes are keyed `ft:<base>` (for example `ft:gpt-4.1-mini` covers every `ft:gpt-4.1-mini-2025-...:fyxer:...` id). The code may use a different name for the same model from the file (the chat catalogue says `gpt-6-luna`; the OpenAI file and usage events say `gpt-5.6-luna`). Say which you matched.
- **Catalogue prices can be stale.** `domains/chat/src/flows/chat/chatModelCatalogue.ts` holds hand-copied prices. The agreement file wins. (It once had gpt-5.4-mini at $0.25 / $2.00 where the agreement file says $0.75 / $4.50.)
- **Unlisted models bill at list.** For OpenAI, a model not on the signed discount schedule gets no discount until a new order form adds it. A discount in `discount_note` that is "being negotiated" is not a price yet.
- **Credits are separate from the percentage.** A recurring monthly credit lowers the bill but not the per-token price, so leave it out of unit costs unless asked.

## 3. Fill gaps from the live price list

Only for prices the file lacks, or when the user asks for today's list price.

1. `WebFetch` the provider's own pricing page. Prefer the URL in `_meta.list_price_source`.
2. Apply the file's `discount_pct` for that family if there is one. Otherwise assume none and say so.
3. Label each number you give as one of: **contracted** (from the file), **live list** (web, no discount) or **live list less discount** (web plus the file's percentage).
4. Record the page URL and the date fetched.

If the live list differs from the file's `list` for the same model, report both and say which you used. Do not edit the agreement files. To refresh or extend them, run the `provider-pricing` skill, which cross-checks numbers with a second model.

## 4. Answer

Give the price per unit with its unit, the source label, and the file or URL. For a cost estimate, show the maths (tokens by rate, cached input billed separately from uncached) so it can be rechecked.
