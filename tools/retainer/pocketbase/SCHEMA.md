# Retainer.100SaaS (Hour Tracker) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `agreements`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `client_name` (text)
  - `total_hours` (number)
  - `period_start` (date)
  - `period_end` (date)
  - `hourly_rate` (number)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `time_entries`
- Fields:
  - `agreement` (relation → `agreements`, required)
  - `tenant` (relation → `tenants`, required) — denormalized from agreement
  - `description` (text)
  - `hours` (number)
  - `date` (date)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`
