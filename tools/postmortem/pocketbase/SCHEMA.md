# Postmortem.100SaaS (Incident Retro) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 49.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `postmortems`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `title` (text)
  - `incident_date` (date)
  - `summary` (text)
  - `root_cause` (text)
  - `status` (select: `draft`, `review`, `published`)
  - `authors` (relation → `users`, multiple)
- API Rules:
  - List/View/Create/Update:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `pm_timeline`
- Fields:
  - `postmortem` (relation → `postmortems`, required)
  - `timestamp` (date)
  - `description` (text)
  - `type` (select: `detection`, `diagnosis`, `repair`, `recovery`)
- API Rules:
  - List/View/Create/Update:
    - `postmortem.tenant.memberships.user.id ?= @request.auth.id`

### `pm_actions`
- Fields:
  - `postmortem` (relation → `postmortems`, required)
  - `task` (text)
  - `owner` (text)
  - `status` (select: `open`, `done`)
- API Rules:
  - List/View/Create/Update:
    - `postmortem.tenant.memberships.user.id ?= @request.auth.id`

## Notes

- Summary endpoint: `GET /api/postmortem/report/:id` returns postmortem + timeline + actions.
