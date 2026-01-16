# Approve.100SaaS (Visual Feedback) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `projects`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `name` (text)
  - `share_token` (text, unique, required)
- API Rules:
  - View/List:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `proofs`
- Fields:
  - `project` (relation → `projects`, required)
  - `name` (text)
  - `image` (file)
- API Rules:
  - Public view by token is typically done by filtering `projects.share_token` in the client.

### `annotations`
- Fields:
  - `proof` (relation → `proofs`, required)
  - `x_percent` (number) — 0..100
  - `y_percent` (number) — 0..100
  - `comment` (text)
  - `status` (select: `open`, `resolved`)
- API Rules:
  - Public create/view by token is typically done by filtering `proof.project.share_token`.
