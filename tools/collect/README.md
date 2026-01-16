# Collect.100SaaS (Asset Request)

**Tool 25**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/collect/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs collect
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/collect/pocketbase/SCHEMA.md`
- Tool notes: `tools/collect/pocketbase/README.md`
