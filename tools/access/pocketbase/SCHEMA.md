# Access.100SaaS (User Access Reviews) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 50.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `review_cycles`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `name` (text)
  - `due_date` (date)
  - `status` (select: `active`, `completed`)
  - `auditor_signed_at` (date)
- API Rules:
  - List/View/Create/Update:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `review_items`
- Fields:
  - `cycle` (relation → `review_cycles`, required)
  - `system_name` (text)
  - `user_email` (text)
  - `role` (text)
  - `last_login` (date)
  - `decision` (select: `pending`, `keep`, `revoke`, `modify`)
  - `notes` (text)
- API Rules:
  - List/View/Create/Update:
    - `cycle.tenant.memberships.user.id ?= @request.auth.id`

## Notes

- Internal snapshot endpoint: `POST /api/access/cycle/:id/snapshot_internal`.
- CSV import endpoint: `POST /api/access/cycle/:id/import_csv`.
