# Repo settings (100saas/One-Hundred-SaaS)

This repo is public. These settings are chosen to keep contributions safe and the history clean.

## General

- Template repository: **off**
- Require contributors to sign off on web-based commits (DCO-style): **on**
- Release immutability: **recommended on** (manual toggle in GitHub UI)
- Social preview: **recommended** (upload 1280×640 image)

## Features

- Issues: **on** (use templates)
- Discussions: **on** (Ideas + Q&A)
- Projects: **on** (roadmap/triage)
- Wiki: **off** (keep docs in-repo under `docs/`)

## Pull requests / merges

- Allow merge commits: **off**
- Allow squash merges: **on** (default)
- Allow rebase merges: **off**
- Allow auto-merge: **on**
- Automatically delete head branches: **on**

## Branch protection (main)

- Require pull request reviews: **1**
- Dismiss stale approvals: **on**
- Require conversation resolution: **on**
- Require linear history: **on**
- Require status checks to pass: **later** (paused)
  - GitHub rulesets can be finicky until Actions permissions + a first successful workflow run exist.
  - For now: rely on PR-only merges + conversation resolution + linear history + force-push/deletion blocks.

## Safety rails

- CI runs `scripts/verify_repo.mjs` to ensure:
  - `tools/*` structure exists
  - basic “no secrets” scan passes

## Reminder (re-enable later)

When ready, re-enable required status checks on `main`:
1) Ensure Actions permissions allow GitHub-hosted actions (e.g. `actions/checkout`, `actions/setup-node`).
2) Trigger at least one successful `ci` run on `main`.
3) Add required check `verify` (or `ci / verify` depending on UI).
