# Signoff.100SaaS (Deliverable Approvals) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 24.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

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
