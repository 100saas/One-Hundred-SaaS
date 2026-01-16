# Triage (maintainers)

This is a lightweight process for keeping the repo clean and contributor-friendly.

## New Issues

1) Add `status:triage`
2) Add a `type:*` label
3) Add `tool:<slug>` (or propose a new tool)
4) Add `priority:p0|p1|p2`

If it’s unclear, ask for:
- expected workflow (3–7 steps)
- sample data
- success criteria (“done means…”)

## How we label issues

- `type:*`
  - `type:bug` regressions / broken behavior
  - `type:feature` new behavior
  - `type:docs` documentation-only changes
  - `type:chore` refactors / cleanup
  - `type:security` security-related work (use private reporting for vulns)
- `tool:<slug>`: scope to a specific tool folder
- `priority:*`: how urgent it is
- `status:*`: workflow state

Use these two sparingly:
- `good first issue`: small + clear + easy to verify
- `help wanted`: bigger or ambiguous, but worth outside help

## Good first issues

Use `good first issue` for:
- doc improvements
- small endpoint hardening (4xx/503 instead of 500)
- tests/verification improvements (no new deps)
- small schema/rules fixes

Keep the scope to < 1 hour.

## Security

If it smells like a security issue:
- do not ask for exploit details in public
- point them to `SECURITY.md`
- label `type:security`
