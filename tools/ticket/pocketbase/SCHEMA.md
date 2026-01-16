# Ticket.100SaaS (Simple Helpdesk) — PocketBase schema

## Shared Kernel collections (mandatory)

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
