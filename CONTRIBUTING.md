# Contributing

Thanks for contributing — this project only works if it stays easy to run and easy to review.

## Quick start

1) Pick a tool folder under `tools/<toolSlug>/`
2) Run it locally:

```bash
node scripts/pb/run.mjs recover
```

3) Make a small improvement
4) Open a PR

Docs:
- First contribution: `docs/GETTING_STARTED.md`
- Self-host quickstart: `docs/SELF_HOST.md`
- How to add tool #51+: `docs/ADDING_A_TOOL.md`

## Rules (so this stays sane)

- Keep changes small and reviewable.
- Security basics first (auth/rate limits/safe defaults) before feature growth.
- Do not commit secrets. PRs that include keys/tokens will be rejected.
- Prefer safe failures: return `4xx`/`503 <service>_not_configured` rather than `500`.

## Where things go

- Ideas / debates: Discussions
  - Start here: `https://github.com/100saas/One-Hundred-SaaS/discussions/1`
- Bug reports / scoped work: Issues
- Code changes: PRs (link the Issue/Discussion)

## Labels

If you open an Issue, label it if you can:
- `type:*` (`type:bug`, `type:feature`, `type:docs`, …)
- `tool:<slug>` (or propose a new tool)
- `priority:p0|p1|p2`
- `status:triage`

Maintainers use:
- `good first issue` for easy starter tasks
- `help wanted` for bigger items

## Licensing

By contributing, you agree your contributions are licensed under this repository’s license.
