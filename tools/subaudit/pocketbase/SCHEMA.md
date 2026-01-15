# SubAudit.100SaaS (Change Logger) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 7.

Subdomain: `audit.100saas.com` (conflicts with Tool 34; see `NEW_PRD/PROGRESS.md`).

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

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

