# Stack (contribution standard)

This repo is designed to stay **uniform** so contributors can move between tools without re-learning everything.

## Backend (default)

- **PocketBase** (schema + JS hooks)
- Shared backend lives in `kernel/` and is reused by tools.

## Frontend (default)

We use a **TanStack-first** approach for frontend plumbing:
- React 18 + TypeScript
- Vite
- TailwindCSS
- shadcn/ui
- TanStack Query (data fetching)
- TanStack Router (routing)

If you’re adding UI, keep it consistent with this stack unless a maintainer explicitly approves a deviation.

## What “backend-first” means today

Many tools currently ship backend logic (collections + hooks + custom routes) without a full UI.

That’s intentional:
- the PocketBase Admin UI is enough to validate behavior early
- it keeps PRs small and reviewable
- it makes self-hosting straightforward

UI work is welcome, but please keep it incremental and tool-scoped.

