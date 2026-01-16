# SubAudit.100SaaS (Change Logger) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `subscription_diffs`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `stripe_sub_id` (text, required)
  - `stripe_customer_id` (text)
  - `change_type` (select: `upgrade`, `downgrade`, `cancellation`, `quantity`)
  - `old_value` (text)
  - `new_value` (text)
  - `actor` (text)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`
