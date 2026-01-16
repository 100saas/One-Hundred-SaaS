# Log.100SaaS (Audit Trail)

**Tool 46**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/log/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs log
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/log/pocketbase/SCHEMA.md`
- Tool notes: `tools/log/pocketbase/README.md`
