# Spy.100SaaS (Competitor Change Monitor) — PocketBase schema

## Shared Kernel collections (mandatory)

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
