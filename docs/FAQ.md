# FAQ

## Why is this PocketBase-first?

Because contributors can run it quickly:
- one binary
- simple local workflow
- easy to self-host

We expect alternative stacks over time, but PocketBase is the simplest default to get momentum.

## Do I need Stripe/Resend/RevenueCat keys to contribute?

No. You should be able to run most tools locally without any third‑party keys.

Some tools include **optional** integrations (webhooks, payment events, email providers, etc.). Those integrations should be:
- clearly documented as optional,
- safe by default (disabled unless configured),
- testable with local fixtures.

## How do I run a tool locally?

Start here:
- `docs/SELF_HOST.md`

## Where do I propose a new tool?

Use Discussions:
- `https://github.com/100saas/One-Hundred-SaaS/discussions/1`

## What license is this?

AGPL-3.0. See:
- `LICENSE`
- `docs/LICENSING.md`

## How do shared changes work?

Shared backend code lives in:
- `kernel/`

See:
- `docs/KERNEL.md`
