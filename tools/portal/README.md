# Portal.100SaaS (Client Home)

**Tool 22**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/portal/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs portal
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/portal/pocketbase/SCHEMA.md`
- Tool notes: `tools/portal/pocketbase/README.md`
