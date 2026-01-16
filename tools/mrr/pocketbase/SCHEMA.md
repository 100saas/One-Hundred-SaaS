# MRR.100SaaS (Bridge Reporting) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `mrr_snapshots` (daily state)
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `date` (date, required) — normalize to UTC day (e.g. `YYYY-MM-DD 00:00:00.000Z`)
  - `sub_id` (text, required)
  - `mrr_cents` (number)
  - `status` (text)
- Indexing recommendation:
  - Unique composite (`tenant`, `date`, `sub_id`)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `mrr_movements` (the bridge)
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `date` (date, required)
  - `type` (select: `new`, `churn`, `expansion`, `contraction`)
  - `amount_delta` (number)
- Indexing recommendation:
  - Unique composite (`tenant`, `date`, `type`) (so cron can be idempotent)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

## Required wiring notes

- The MRR cron iterates `stripe_connections` and uses `stripe_connections.access_token` to call Stripe for that tenant.
- If a tenant has no `stripe_connections` record, it will be skipped.
