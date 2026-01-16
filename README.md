# One Hundred SaaS (100saas)

This repo is the public monorepo for the **100saas tool suite**.

## What this is

- A growing set of small, practical tools that replace pricey single‑purpose SaaS.
- A build-in-public workflow: requests live in Issues/Discussions; code ships via PRs.
- PocketBase-first by default, so contributors can run tools locally quickly.

## How the repo is organized

- `kernel/` — shared code used by many tools.
- `tools/<toolSlug>/` — each tool lives in its own folder.
  - Today, the default backend for tools is **PocketBase** (see below).

## Where to start

- Run a tool locally: `docs/SELF_HOST.md`
- First contribution: `docs/GETTING_STARTED.md`
- How we work in GitHub: `docs/GOVERNANCE.md`
- Shared backend kernel: `docs/KERNEL.md`
- Adding a new tool: `docs/ADDING_A_TOOL.md`
- Roadmap: `docs/ROADMAP.md`
- FAQ: `docs/FAQ.md`

## Why PocketBase (for now)

PocketBase is the default because it’s:
- simple to run (single binary),
- easy to self‑host,
- good enough for the “first version” of many tools.

We expect the community to push additional implementations over time (e.g. Postgres + a service layer). When that happens, we’ll keep PocketBase as the easiest default and add other stacks as optional paths.

## Self‑hosting (high level)

1) Pick a tool under `tools/<toolSlug>/`.
2) Run PocketBase for that tool.
3) Apply the included migrations + hooks.
4) Put it behind your reverse proxy (Caddy/Nginx/etc).

Self‑host docs will live under `docs/` as we keep tightening the workflow.

## Where to help decide “what we build next”

After tool #50, we keep shipping the next highest‑impact tool the community wants:
- Discussions: `https://github.com/100saas/One-Hundred-SaaS/discussions`
- Start here: `https://github.com/100saas/One-Hundred-SaaS/discussions/1`
- How to contribute: `https://github.com/100saas/One-Hundred-SaaS/discussions/7`
- Tool request template: `https://github.com/100saas/One-Hundred-SaaS/discussions/8`
