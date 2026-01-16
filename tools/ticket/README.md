# Ticket.100SaaS (Helpdesk)

**Tool 19**

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
