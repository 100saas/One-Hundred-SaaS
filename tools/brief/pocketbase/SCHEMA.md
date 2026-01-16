# Brief.100SaaS (Content Ops) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `brief_templates`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `name` (text)
  - `sections` (json) — array of `{title,type}` (type: `text`|`input`)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `briefs`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `title` (text)
  - `content_data` (json)
  - `status` (select: `draft`, `approved`)
  - `writer_link` (text, unique)
- API Rules:
  - Internal list/view:
    - `tenant.memberships.user.id ?= @request.auth.id`
  - Public view by token:
    - typically fetched by filtering `writer_link`
