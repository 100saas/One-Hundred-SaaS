# Uptime.100SaaS (Website Monitor)

**Tool 18**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/uptime/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs uptime
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/uptime/pocketbase/SCHEMA.md`
- Tool notes: `tools/uptime/pocketbase/README.md`
