# Handoff.100SaaS (Client Handoff Portal)

**Tool 29**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/handoff/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs handoff
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/handoff/pocketbase/SCHEMA.md`
- Tool notes: `tools/handoff/pocketbase/README.md`
