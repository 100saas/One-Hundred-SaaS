# Update.100SaaS (Client Progress Feed) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 26.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `projects`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `client_name` (text)
  - `share_token` (text, unique, required)
- API Rules:
  - Internal list/view:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `updates`
- Fields:
  - `project` (relation → `projects`, required)
  - `title` (text)
  - `body_html` (editor/text)
  - `type` (select: `milestone`, `update`, `blocker`)
  - `date` (date)
- API Rules:
  - Internal list/view:
    - `project.tenant.memberships.user.id ?= @request.auth.id`
  - Public access:
    - Use `GET /api/update/public/feed?token=...` (keeps collections private).
