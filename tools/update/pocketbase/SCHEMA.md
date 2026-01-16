# Update.100SaaS (Client Progress Feed) — PocketBase schema

## Shared Kernel collections (mandatory)

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
