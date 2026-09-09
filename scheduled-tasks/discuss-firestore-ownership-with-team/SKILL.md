---
name: discuss-firestore-ownership-with-team
description: Reminder to discuss the shared-Firestore / distributed-monolith data-ownership problem with the team
---

Remind Joey: discuss with the engineering team this morning the data-ownership problem behind splitting the `functions` monolith into services.

Context to surface:
- The blocking issue for service extraction is that every would-be service currently reads and writes the same shared Firestore via the shared repositories. Extracting services without fixing this creates a "distributed monolith" — network hops between things still coupled through the database, so a schema change becomes a coordinated multi-service deploy. Worst of both worlds.
- The team needs to agree a data-ownership model before extracting any service: which service OWNS which Firestore collections, and whether other services call the owning service (API) or keep hitting Firestore directly.
- Already agreed in principle: shared client adapters (anthropic, stripe, recall, etc.) become a shared importable directory (DRY), not per-client services. Labelling and chat-agent are the two candidates worth extracting first, driven by independent deploy cadence / blast radius.

Present this as a short reminder with the key question to resolve: "What is our Firestore data-ownership model for services?" Keep it brief.