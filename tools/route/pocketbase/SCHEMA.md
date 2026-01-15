# Route.100SaaS (Lead Router) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 40.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `sources`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `name` (text)
  - `api_key` (text, unique)
- API Rules:
  - List/View/Create/Update:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `routes`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `priority` (number)
  - `condition_field` (text)
  - `condition_value` (text) — supports `>100`, `<=5`, `contains:foo`, exact match
  - `destination` (select: `slack`, `email`, `webhook`)
  - `destination_config` (json)
- API Rules:
  - List/View/Create/Update:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `lead_logs`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `source` (relation → `sources`)
  - `idempotency_key` (text, unique) — recommended: `<tenantId>:<externalEventId>`
  - `payload` (json)
  - `matched_route` (relation → `routes`)
  - `status` (select: `success`, `failed`, `skipped`)
  - `error` (text)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

## Notes

- Inbound endpoint: `POST /api/ingest/:apiKey` (public), with idempotency to avoid double-routing.
