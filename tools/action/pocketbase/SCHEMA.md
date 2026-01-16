# Action.100SaaS (Meeting Tracker) — PocketBase schema

## Shared Kernel collections (mandatory)

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
