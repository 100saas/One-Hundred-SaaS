# Proposal.100SaaS (Document Gen) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `templates`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `name` (text)
  - `content_html` (editor/text)
  - `variables` (json) — e.g. `["client_name","price","date"]`
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `proposals`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `template` (relation → `templates`) — source template
  - `client_name` (text)
  - `variable_values` (json)
  - `content_html` (editor/text) — rendered snapshot for public view
  - `status` (select: `draft`, `sent`, `accepted`)
  - `view_count` (number)
  - `public_token` (text, unique)
  - `signature_name` (text) — typed signature on accept
  - `accepted_at` (date)
- API Rules:
  - Internal list/view:
    - `tenant.memberships.user.id ?= @request.auth.id`
  - Public view by token:
    - typically fetched by filtering `public_token`
