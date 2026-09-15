---
name: provider-pricing
description: Research a third-party provider's pricing from its docs, cross-verify every number with a cursor-agent running a DIFFERENT model provider, and emit a JSON pricing dictionary (list price + contracted discount + effective price per billable dimension). Use to build or refresh pricing infra for any provider Fyxer pays — GCP/Vertex inference, GCP embeddings, Pinecone, Exa, Recall, Algolia, Deepgram, AssemblyGPT, OpenAI, ElevenLabs, etc. Triggers: "build pricing for <provider>", "price a provider", "get <provider>'s pricing into json", "refresh the pricing dict", "/provider-pricing".
---

# provider-pricing

Turn a provider's public pricing (plus any negotiated discount) into a verified JSON
dictionary. The output is machine-usable pricing infra: one object per billable model/SKU,
each with `list`, `discount_pct`, and `effective` prices per billable dimension.

The non-negotiable part is **cross-verification**: after gathering numbers with one model
(you, Claude), a `cursor-agent` running a *different* provider's model independently
re-derives them from the same docs. Two models with independent failure modes catch each
other's hallucinated prices. A price nobody cross-checked doesn't ship.

## When to use

Building or refreshing the effective cost of anything Fyxer pays a third party for. The
provider registry is `functions/src/clients/firebase/secrets.ts` — every `*Credentials`
secret is a provider that may need a pricing entry (openai, googleVertexAI, pinecone, exa,
recall, algolia, groq, deepgram, assembly, elevenlabs, sendgrid, …).

Two sourcing modes, often both in one run:

- **Public docs** — Vertex, Pinecone, Exa, Algolia, Recall, Deepgram: the list price is on a
  pricing page. `WebFetch` it.
- **Contracted / negotiated** — OpenAI, ElevenLabs: the *discount off list* (or a bespoke
  rate) lives in a Slack thread, an email, or an order-form PDF, not on the public page.
  Pull it from Slack/email (see the OpenAI supplier-agreement note in the Obsidian vault for
  the pattern) and layer it on top of the public list price.

## The billable-dimension idea (this is why the schema flexes)

Providers don't all bill per token. The schema's price keys are **whatever dimensions the
provider actually bills** — you name them per provider, you don't force a token shape:

| Provider kind | Typical billable dimensions (the keys under `list`/`effective`) |
|---|---|
| LLM inference (OpenAI, Vertex, Groq) | `input`, `cached_input`, `output`, `reasoning` (per 1M tokens) |
| Embeddings (Vertex, OpenAI) | `input` only (per 1M tokens) |
| Vector DB (Pinecone) | `read_units`, `write_units`, `storage_gb_month` (+ any per-index fee) |
| Search (Algolia) | `search_1k`, `records_1k_month` |
| Web search (Exa) | `search`, `contents_per_page`, `search_with_contents` |
| Meeting bots (Recall) | `bot_hour`, `recording`, `transcription_hour`, `storage` |
| Transcription (Deepgram, Assembly) | `audio_minute` (by tier/model) |

Reasoning caveat (LLM only): OpenAI-style APIs don't bill a separate reasoning rate —
reasoning tokens are output tokens, so `reasoning == output` for reasoning models and `null`
otherwise. Vertex is the same. Don't invent a distinct reasoning number.

## Process

### 1. Enumerate the priced units
- **Inference/embeddings**: get the exact model strings the repo uses — don't price models we
  don't call. Delegate an `Explore` agent over the repo (grep the client/types files under
  `functions/src/clients/<provider>/`) for the deduped model list, base + fine-tune variants.
  This is what the OpenAI run did.
- **Usage-priced providers** (Pinecone, Algolia, Exa, Recall): the "units" are the billable
  dimensions above, not models. List the SKUs/tiers the provider charges (e.g. Pinecone
  serverless read/write/storage; Algolia search vs record).

### 2. Gather list prices from the primary source
- `WebFetch` the provider's own pricing page. Record the exact URL and the date fetched — it
  goes in `_meta.list_price_source`.
- One number per billable dimension per unit. If the page hides prices behind a calculator or
  "contact sales", note that and fall back to the contracted source.
- For contracted providers, ALSO pull the negotiated discount/rate from Slack + email now
  (search the `supplier-<provider>` channel and DMs; check for an order-form PDF). Capture the
  contract term and any credits, like the OpenAI note captured mid-2027 + the $61k credit.

### 3. Cross-verify with a different-provider cursor-agent (required)
You gathered the numbers with a Claude model. Verify with a **non-Anthropic** model via the
`cursor-agent` skill so the failure modes are independent — e.g. `gpt-5.6-sol-high` or
`gemini-3.1-pro`. Run `agent models` first if unsure a slug still resolves.

Give it the provider + the exact doc URL(s) and your draft numbers, and have it re-derive
independently and flag every mismatch:

```bash
echo "Independently verify third-party pricing. Provider: <provider>.
Authoritative source(s): <pricing URL(s)> (and <any secondary URL>).
Fetch those pages yourself and read the current prices. Do NOT trust my figures below —
derive each number from the page, then compare.

Here are the figures I extracted (USD, state the unit):
<paste the list block: each unit -> each billable dimension -> price>

For EACH number report: MATCH, or MISMATCH with the value you read and the exact line/section
you read it from. Also flag: any billable dimension I missed, any unit/currency/per-1K-vs-per-1M
error, any SKU on the page I didn't include, and any price that looks stale vs the page.
End with a VERDICT line: ALL MATCH, or a numbered list of discrepancies.
Read-only: only fetch the given URLs and use read tools. If a command is rejected, don't retry it." \
  | node ~/.claude/local-plugins/sf/skills/cursor-agent/scripts/run-agent.mjs \
    --model gpt-5.6-sol-high --timeout 400
```

(Use the `cursor-agent` skill's wrapper path; if this machine's path differs, invoke the skill
normally. For a doc that isn't web-fetchable — a PDF order form, a Slack screenshot — paste the
extracted text into the prompt instead of a URL and ask it to sanity-check internal consistency
and unit math rather than re-fetch.)

### 4. Reconcile
- On any MISMATCH, re-fetch the doc yourself and settle it against the page — the page wins over
  both models. Fix the number.
- If the verifier flags a dimension or SKU you missed, add it.
- If a value genuinely can't be verified (internal codename, calculator-only, sales-gated),
  don't fake it: set it `null` and add a `price_source` note saying why.
- Re-run step 3 only if you changed enough that the whole block needs re-checking; a one-number
  fix doesn't need a full re-verify.

### 5. Emit the JSON
Write to `functions/src/clients/<provider>/pricing.json` **only if the user asked for it in the
repo** — otherwise write to the scratchpad and send it with SendUserFile (default; don't add
files to the repo uninvited). Validate it parses (`python3 -m json.tool`).

Schema (keys under `list`/`effective` are the provider's real billable dimensions):

```json
{
  "_meta": {
    "provider": "<name>",
    "unit": "USD per <1M tokens | 1K searches | bot-hour | GB-month | …>",
    "list_price_source": "<exact doc URL> (fetched YYYY-MM-DD)",
    "discount_source": "<Slack/email/order-form ref, or 'none — public list only'>",
    "verified_by": "cursor-agent <model slug> on YYYY-MM-DD — VERDICT: <all match | resolved N discrepancies>",
    "discount_note": "discount_pct is a single % off list applied uniformly to every dimension; effective = round(list * (1 - discount_pct/100)).",
    "notes": "<reasoning==output caveat / FT premium / any per-provider gotcha>"
  },
  "<model-or-sku>": {
    "family": "<group>",
    "discount_pct": 25,
    "price_source": "<only when a value is inferred/knowledge/unverifiable — say which>",
    "list":      { "<dimension>": 0.40, "<dimension>": 1.60 },
    "effective": { "<dimension>": 0.30, "<dimension>": 1.20 }
  }
}
```

Rules for the object:
- `discount_pct: null` when the provider/model isn't on a contracted schedule (public list only,
  or a separate/unsettled negotiation) — then `effective == list`, or `null` if the discount is
  mid-negotiation.
- Every inferred, from-memory, or unverifiable number carries a `price_source` string saying so.
  Don't let an estimate look like a verified fact.
- Group a provider's non-priced/differently-billed units (e.g. Groq-served models under an
  OpenAI run, or free-tier SKUs) under their own key with an explicit note rather than faking a
  price.

## Reference implementation
The OpenAI run this skill generalises: model dict at the OpenAI supplier-agreement discount
schedule (25% on the 4.1 family + o4-mini, 7% on the rest) layered over the captured list
prices, with reasoning==output and fine-tune premiums flagged. The Obsidian note
"OpenAI Supplier Agreement Discount Schedule" holds the contracted-discount half; the public
list-price half came from the provider's pricing page.

## Failure modes to avoid
- Pricing models the repo never calls (enumerate from code first).
- per-1K vs per-1M and USD vs EUR unit errors — the single most common real discrepancy; the
  verifier prompt calls these out on purpose.
- Skipping cross-verification because "the numbers look right" — the whole point is that a
  hallucinated price also looks right. Always run step 3.
- Committing pricing JSON into the repo when the user only wanted the numbers — send the file,
  don't add it to the tree unprompted.
