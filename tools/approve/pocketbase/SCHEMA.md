# Approve.100SaaS (Visual Feedback) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 21.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

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

