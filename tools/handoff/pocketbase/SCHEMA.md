# Handoff.100SaaS (Deliverable Portal) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 29.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `packages`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `client_name` (text)
  - `title` (text)
  - `share_token` (text, unique, required)
  - `expires_at` (date)
  - `download_count` (number)
- API Rules:
  - Internal list/view:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `package_files`
- Fields:
  - `package` (relation → `packages`, required)
  - `file` (file, required)
  - `label` (text)
- API Rules:
  - Public view by token is typically done by filtering `package.share_token`

