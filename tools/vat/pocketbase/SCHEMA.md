# VAT.100SaaS (Validator) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 6.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `tax_validations` (cache)
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `vat_number` (text, required)
  - `country_code` (text, required)
  - `is_valid` (bool)
  - `company_name` (text)
  - `consultation_number` (text) — optional proof token (if available)
  - `cached_until` (date)
- Indexing recommendation:
  - Unique composite (`tenant`, `country_code`, `vat_number`)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `vat_settings`
- Fields:
  - `tenant` (relation → `tenants`, unique, required)
  - `soft_fail` (bool, default true) — if VIES is down, return cached/unknown instead of hard error
- API Rules:
  - View:
    - `tenant.memberships.user.id ?= @request.auth.id`
  - Update:
    - `tenant.memberships.user.id ?= @request.auth.id && tenant.memberships.role = 'owner'`

### `footer_rules`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `country_iso` (text) — e.g. `DE`, `FR`, `*`
  - `footer_text` (text)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

