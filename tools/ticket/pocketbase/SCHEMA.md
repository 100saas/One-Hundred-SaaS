# Ticket.100SaaS (Simple Helpdesk) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 19.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `tickets`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `form` (relation → `forms`)
  - `subject` (text)
  - `status` (select: `new`, `open`, `pending`, `resolved`)
  - `priority` (select: `low`, `medium`, `high`)
  - `requester_email` (email)
  - `assigned_agent` (relation → `users`)
  - `sla_breach_at` (date) — calculated from `forms.sla_hours`
- API Rules:
  - Internal list/view:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `ticket_messages`
- Fields:
  - `ticket` (relation → `tickets`, required)
  - `sender_type` (select: `agent`, `customer`)
  - `body_html` (editor/text)
  - `is_internal_note` (bool)
- API Rules:
  - Internal list/view:
    - `ticket.tenant.memberships.user.id ?= @request.auth.id`

### `forms`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `name` (text)
  - `sla_hours` (number)
- API Rules:
  - View: `""` (public)

