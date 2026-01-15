# Log.100SaaS (Audit Aggregator) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 46.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `api_keys`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `name` (text)
  - `key` (text, unique)
- API Rules:
  - List/View/Create/Update:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `external_logs`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `service` (text)
  - `actor` (text)
  - `action` (text)
  - `metadata` (json)
  - `ip` (text)
  - `severity` (select: `info`, `warn`, `error`, `critical`)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

## Notes

- Ingestion endpoint: `POST /api/ingest` with `X-API-Key` header.
