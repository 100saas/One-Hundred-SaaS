# Uptime.100SaaS (Monitor) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `monitors`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `url` (url, required)
  - `name` (text)
  - `interval_sec` (number) — minimum 60 (MVP)
  - `status` (select: `up`, `down`)
  - `last_checked` (date)
  - `latency_ms` (number)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `outage_logs`
- Fields:
  - `monitor` (relation → `monitors`, required)
  - `started_at` (date)
  - `ended_at` (date)
  - `duration_sec` (number)
- API Rules:
  - List/View:
    - `monitor.tenant.memberships.user.id ?= @request.auth.id`
