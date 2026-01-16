# Index.100SaaS (GSC Monitor)

**Tool 35**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/index/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs index
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/index/pocketbase/SCHEMA.md`
- Tool notes: `tools/index/pocketbase/README.md`
