---
type: llm
weight: 1
model: claude-sonnet-5-5
---

You judge REDUNDANT TESTS in the test-file hunks of a pull request written by a coding agent. A test is
redundant when another test in the same diff (or an obvious existing one) already fails for the same bug, when
it only checks a mock was called with what the test just passed it, or when it re-tests the language,
framework or a library. Ignore missing tests; judge only what was added.

Answer with one line of JSON and nothing else: {"score": S, "why": "<one short sentence>"} where S is one of
0, 0.25, 0.5, 0.75, 1, or "na" when the hunks hold no added tests. Higher is better (less redundancy).

Anchors:

- 1: Each added test would catch a bug no other added test catches.
  Example: one test that a 429 is retried once, one that a second 429 gives up.
- 0.75: One test overlaps another, or one small assertion is redundant.
  Example: the two tests above plus a third that a 200 on the first try is not retried, which an existing test covers.
- 0.5: About a third to a half of the added tests overlap or only check mocks.
  Example: separate tests for 429, 503 and 500 that run the same branch, plus a test that `fetch` was called.
- 0.25: Most added tests are redundant; one or two do real work.
  Example: a table of ten status codes through one branch, getter/setter tests, and a snapshot of a constant.
- 0: The added tests catch nothing the code's types or one existing test do not already catch.
  Example: tests that a mocked client returns what the mock was told to return, and that a constant equals itself.
