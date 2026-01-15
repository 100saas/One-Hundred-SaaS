# Action.100SaaS (Meeting Tracker) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 28.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `meetings`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `title` (text)
  - `date` (date)
  - `attendees` (text)
  - `notes` (text)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `action_items`
- Fields:
  - `meeting` (relation → `meetings`, required)
  - `tenant` (relation → `tenants`, required)
  - `task` (text)
  - `assignee` (text)
  - `due_date` (date)
  - `is_done` (bool)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

