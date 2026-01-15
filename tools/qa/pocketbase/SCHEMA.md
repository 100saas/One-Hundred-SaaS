# QA.100SaaS (Checklist Runner) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 32.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `qa_templates`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `name` (text)
  - `items` (json) — array of strings
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `qa_runs`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `template` (relation → `qa_templates`, required)
  - `target_url` (url)
  - `status` (select: `in_progress`, `passed`, `failed`)
  - `results` (json) — map `{index:boolean}` keyed by string index
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

