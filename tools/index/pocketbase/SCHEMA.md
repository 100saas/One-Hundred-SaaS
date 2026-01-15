# Index.100SaaS (GSC Monitor) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 35.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `gsc_keys`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `service_account_json` (json) — encrypted in prod
  - `property_url` (text)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `tracked_urls`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `url` (url)
  - `is_indexed` (bool)
  - `last_checked` (date)
  - `gsc_state` (text)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

## Notes

- Actual GSC URL inspection requires service account + site property permissions.

