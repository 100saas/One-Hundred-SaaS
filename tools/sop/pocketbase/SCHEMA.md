# SOP.100SaaS (Process Builder) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 23.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `procedures`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `title` (text)
  - `description` (text)
  - `tags` (json)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `procedure_steps`
- Fields:
  - `procedure` (relation → `procedures`, required)
  - `order` (number)
  - `text` (text)
  - `image` (file)
  - `type` (select: `action`, `info`, `warning`)
- API Rules:
  - List/View:
    - `procedure.tenant.memberships.user.id ?= @request.auth.id`

