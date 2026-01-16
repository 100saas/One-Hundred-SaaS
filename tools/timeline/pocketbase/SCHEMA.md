# Timeline.100SaaS (Single Customer View) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `customer_notes`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `stripe_customer_id` (text)
  - `author` (relation → `users`)
  - `content` (text)
  - `is_pinned` (bool)
- API Rules:
  - List/View/Create/Update:
    - `tenant.memberships.user.id ?= @request.auth.id`

## Notes

- Timeline also uses `stripe_connections` from the Shared Kernel when proxying Stripe calls from `/api/timeline/stripe/*`.
