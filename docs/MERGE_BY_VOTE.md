# Merge by vote

This repo supports an optional “merge by vote” loop inspired by projects like openchaos.dev — but with **guardrails** so we keep shipping useful tools.

## How it works

- PRs that want to participate add the label: `vote-merge`
- People vote by reacting on the PR:
  - 👍 counts as +1
  - 👎 counts as -1
- On a schedule, the automation merges the **top-scoring** PR.

## Guardrails (important)

The automation will **skip** a PR if:

- It has **0** 👍 (we require at least 1 👍 and a positive score).
- It’s a **draft** PR.
- GitHub says it’s not mergeable or not in a **clean** mergeable state.
- It touches protected paths (example: `.github/` and the secret-scan / merge scripts).

Protected paths are enforced in `scripts/merge_by_vote.mjs`.

## How to vote

1) Open PRs eligible for voting:
   - `https://github.com/100saas/One-Hundred-SaaS/pulls?q=is%3Apr+is%3Aopen+label%3Avote-merge`
2) Open a PR and react 👍 / 👎.

## How to use it as a maintainer

- The workflow is `merge-by-vote` in `.github/workflows/merge_by_vote.yml`.
- Run manually from Actions (workflow_dispatch) if you want to test it.
- For a safe rehearsal, run the script in dry-run mode:
  - `node scripts/merge_by_vote.mjs --dry-run`

## Why we have guardrails

Pure “anything goes” voting quickly turns into chaos, bikeshedding, and security risk.

This project needs:
- a stable direction (roadmap + epics),
- a stable fitness function (tests + CI),
- and a safe boundary (protected paths + maintainer escalation).

The merge-by-vote loop is meant to create momentum and fun without letting the repo get hijacked.

