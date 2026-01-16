# Env.100SaaS (Secrets Hygiene) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `environments`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `name` (text)
- API Rules:
  - List/View/Create/Update:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `secret_specs`
- Fields:
  - `environment` (relation → `environments`, required)
  - `key_name` (text)
  - `location` (text)
  - `last_rotated` (date)
  - `rotation_interval_days` (number)
  - `owner` (relation → `users`)
- API Rules:
  - List/View/Create/Update:
    - `environment.tenant.memberships.user.id ?= @request.auth.id`

## Notes

- This tool never stores secret values; only rotation metadata.
