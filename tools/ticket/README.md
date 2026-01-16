# Ticket.100SaaS (Helpdesk)

**Tool 19**

## What it does

A minimal helpdesk backend:
- public `forms` define the intake + SLA hours
- internal `tickets` + `ticket_messages` store the conversation
- `sla_breach_at` is computed when tickets are created

This is backend-first. You can manage tickets in PocketBase Admin UI, or build a small helpdesk UI on top of the API.

## Core workflow (MVP)

1) Create a form (name + SLA hours)
2) Accept inbound tickets linked to that form
3) Agents respond via ticket messages
4) SLA breach time is tracked on the ticket record

## Data model

See `tools/ticket/pocketbase/SCHEMA.md`:
- `forms`
- `tickets`
- `ticket_messages`

## API notes

Key routes:
- `GET /api/tool/health`
- `POST /api/ticket/demo/seed` (owner-only)
- `GET /api/ticket/public/form` (public)

Full list: `docs/ENDPOINTS.md`.

## What’s in here

- PocketBase backend (hooks + migrations): `tools/ticket/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs ticket
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/ticket/pocketbase/SCHEMA.md`
- Tool notes: `tools/ticket/pocketbase/README.md`
