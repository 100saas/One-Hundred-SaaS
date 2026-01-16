# Signoff.100SaaS (Deliverable Approvals) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `deliverables`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `title` (text)
  - `description` (text)
  - `files` (file, multiple)
  - `status` (select: `pending`, `changes_requested`, `approved`)
  - `access_token` (text, unique, required) — public access
  - `approved_at` (date)
  - `approved_by_ip` (text)
- API Rules:
  - Internal view:
    - `tenant.memberships.user.id ?= @request.auth.id`
  - Public view:
    - `viewRule` is public to allow `/api/files/...` access; public state changes use `/api/signoff/public/*`.
