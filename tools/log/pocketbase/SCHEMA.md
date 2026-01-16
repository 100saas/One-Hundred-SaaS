# Log.100SaaS (Audit Aggregator) — PocketBase schema

## Shared Kernel collections (mandatory)

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
