# Runbook.100SaaS (Interactive Ops) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 48.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `runbooks`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `title` (text)
  - `markdown_content` (text)
  - `tags` (json)
- API Rules:
  - List/View/Create/Update:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `incidents_runs`
- Fields:
  - `runbook` (relation → `runbooks`, required)
  - `started_at` (date)
  - `completed_by` (relation → `users`)
  - `checklist_state` (json)
- API Rules:
  - List/View/Create/Update:
    - `runbook.tenant.memberships.user.id ?= @request.auth.id`

## Notes

- Start run endpoint: `POST /api/runbook/:id/start`.
- Update checklist endpoint: `POST /api/run/:id/checklist`.
