# Status.100SaaS (Status Page)

**Tool 17**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/status/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs status
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/status/pocketbase/SCHEMA.md`
- Tool notes: `tools/status/pocketbase/README.md`
