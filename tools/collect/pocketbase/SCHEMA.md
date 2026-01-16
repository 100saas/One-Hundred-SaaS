# Collect.100SaaS (Asset Intake) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `requests`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `title` (text)
  - `instructions` (text)
  - `slug` (text, unique)
  - `is_active` (bool)
- API Rules:
  - Internal view/list:
    - `tenant.memberships.user.id ?= @request.auth.id`
  - Public access:
    - Use `GET /api/collect/public/request?slug=...` (prevents cross-tenant enumeration)

### `uploads`
- Fields:
  - `request` (relation → `requests`, required)
  - `file` (file, required)
  - `uploader_email` (text)
- API Rules:
  - Create: `""` (public)
  - Internal list/view:
    - `request.tenant.memberships.user.id ?= @request.auth.id`
