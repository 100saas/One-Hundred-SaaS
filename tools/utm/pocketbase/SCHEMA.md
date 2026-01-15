# UTM.100SaaS (Link Governance) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 31.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `presets`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `category` (select: `source`, `medium`, `campaign`)
  - `value` (text)
- Indexing recommendation:
  - Unique composite (`tenant`, `category`, `value`)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `generated_links`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `target_url` (url)
  - `full_url` (url)
  - `parameters` (json) — `{source,medium,campaign}`
  - `created_by` (relation → `users`)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

