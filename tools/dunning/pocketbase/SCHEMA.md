# Dunning.100SaaS (Copy & Schedule) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `sequences`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `name` (text)
  - `trigger` (select: `payment_failed`, `card_expiring`)
- API Rules:
  - List/View/Create/Update:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `steps`
- Fields:
  - `sequence` (relation → `sequences`, required)
  - `day_delay` (number)
  - `subject` (text)
  - `body_html` (text/editor)
  - `type` (select: `email`, `in_app_banner`)
- API Rules:
  - List/View/Create/Update:
    - `sequence.tenant.memberships.user.id ?= @request.auth.id`

## Notes

- Seed templates via `POST /api/dunning/seed?tenant=...` (admin-only).
