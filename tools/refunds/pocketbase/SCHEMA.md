# Refunds.100SaaS (Anomaly Detection) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `refund_metadata`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `stripe_refund_id` (text, unique, required)
  - `internal_reason` (select: `bug`, `fraud`, `pricing`, `goodwill`)
  - `note` (text)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `refund_daily_stats`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `date` (date, required)
  - `count` (number)
  - `volume_cents` (number)
  - `is_anomaly` (bool)
- Indexing recommendation:
  - Unique composite (`tenant`, `date`)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `refund_settings`
- Fields:
  - `tenant` (relation → `tenants`, unique, required)
  - `z_threshold` (number, default 2.0)
  - `slack_webhook_url` (text, hidden)
- API Rules:
  - View:
    - `tenant.memberships.user.id ?= @request.auth.id`
  - Update:
    - `tenant.memberships.user.id ?= @request.auth.id && tenant.memberships.role = 'owner'`
