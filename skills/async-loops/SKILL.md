---
name: implement-typescript-async
description: Implementation preferences for writing async loops in typescript
---

# Skill: Async Loops in TypeScript

## Pattern: Bluebird.map for Concurrent Async Operations

When writing loops with asynchronous TypeScript function calls, use `Bluebird.map` instead of `Promise.all` with `.map()` or sequential `for` loops.

## Core Pattern

```typescript
import Bluebird from "bluebird";

// When the async function can return nullish values on failure:
const results = (
  await Bluebird.map(
    items,
    async (item): Promise<ResultType | undefined> => {
      // async operation that returns undefined on failure
      return await someAsyncOp(item);
    },
    { concurrency: 10 }
  )
).flat();
```

Filter out failed (nullish) values from the typed output:

```typescript
const results = (
  await Bluebird.map(
    items,
    async (item): Promise<ResultType | undefined> => {
      return await someAsyncOp(item);
    },
    { concurrency: 10 }
  )
).filter((r): r is ResultType => r !== undefined);
```

## Concurrency Guidelines

| Scenario | Concurrency | Rationale |
|----------|------------|-----------|
| Firestore reads/writes (simple) | 10+ | Firestore handles high concurrency well |
| Firestore batch with inner concurrency | 3-5 | Limit outer when inner ops are concurrent |
| BigQuery / heavy external APIs | 2-3 | Avoid rate limits and resource exhaustion |
| CPU-bound or heavy processing | 3-5 | Prevent blocking |
| Lightweight HTTP calls | 10-20 | Network-bound, safe to parallelize |

**Key rule**: If the inner async function itself contains concurrent operations (e.g., multiple parallel Firestore calls), limit the outer `Bluebird.map` concurrency to avoid explosion of total concurrent operations.

## Anti-patterns

- Do NOT use `for...of` with `await` for independent async operations (sequential, slow)
- Do NOT use `Promise.all(items.map(...))` without concurrency control (unbounded parallelism)
- Do NOT forget to type the return as `Promise<T | undefined>` when the async op can fail silently
