Generate a short, clear PR title for the current branch.

## Instructions

1. Determine the base branch from the user's request. Default to `staging` if not specified.
2. Run `git diff <base-branch>...HEAD` and `git log <base-branch>..HEAD --oneline` to understand all changes on this branch.
3. Write a PR title following these rules:
   - Use the project's PR prefix convention: `feat:`, `fix:`, `experiment:`, or `chore:`
   - Keep it under 60 characters after the prefix
   - Write it so a CTO skimming a PR list instantly understands what changed and why
   - Focus on the *what* and *why*, not implementation details
   - No ticket numbers, no file names, no jargon
4. Output only the title, nothing else.
