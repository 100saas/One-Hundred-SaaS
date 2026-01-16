# UTM.100SaaS (Link Governance) — PocketBase schema

## Shared Kernel collections (mandatory)

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
