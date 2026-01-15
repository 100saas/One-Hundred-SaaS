# Spy.100SaaS (Competitor Change Monitor) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 38.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `targets`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `url` (url)
  - `name` (text)
  - `selector` (text)
  - `last_hash` (text)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `changes`
- Fields:
  - `target` (relation → `targets`, required)
  - `detected_at` (date)
  - `diff_text` (text)
- API Rules:
  - List/View:
    - `target.tenant.memberships.user.id ?= @request.auth.id`

## Worker

Worker script:
- `NEW_PRD/workers/spy/worker.js`

