# GitHub setup (recommended)

This repo is designed to run in public and stay maintainable.

## Turn on these features

- Issues (with templates)
- Discussions (Ideas + Q&A)
- Projects (for roadmaps and triage)
- Wiki (optional, if you prefer wiki-style docs)

## Labels (recommended)

This repo includes a small starter label set:

```bash
export GITHUB_TOKEN=...   # classic token with repo scope
node scripts/setup_labels.mjs
```

## Suggested workflow

- **Ideas** start as Discussions.
- When an idea is clear + scoped, it becomes an Issue.
- PRs reference Issues; Issues close on merge.
- Ship notes are posted weekly (automatable later).
