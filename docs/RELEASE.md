# Release checklist (maintainers)

This repo ships continuously via PR merges. This checklist keeps releases boring.

## Before merging

- Run checks locally:
  - `node scripts/check_js_syntax.mjs`
  - `node scripts/verify_repo.mjs`
- Verify changes fail safely:
  - prefer `4xx` for bad input
  - prefer `503 <service>_not_configured` when optional keys are missing
- Keep PR scope small (one tool or one kernel change).

## After merging

- If the change affects contributors:
  - update `docs/` (especially `docs/SELF_HOST.md`)
  - add/adjust a `good first issue` if a follow-up is needed
- Post a ship note (weekly or when significant):
  - `docs/SHIP_NOTES.md`

