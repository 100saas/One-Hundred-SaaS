# Maintainers

This doc defines what maintainers do so contributors know what to expect.

## Responsibilities

- Keep contributions safe (no secrets, no private data).
- Keep PRs small and reviewable.
- Keep docs up to date as workflows evolve.
- Keep the label system and project board usable.

## Review expectations

- We prefer many small PRs over one huge PR.
- If a PR changes the kernel, ask for:
  - backwards compatibility
  - safe failure modes (`503 <service>_not_configured`)
  - quick local testing notes

## When maintainers can say “no”

We’ll close or decline work that:
- introduces lock-in traps
- adds major dependencies without justification
- adds an integration that can’t be self-hosted reasonably

