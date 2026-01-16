# MRR.100SaaS (Reporting)

**Tool 8**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/mrr/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs mrr
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/mrr/pocketbase/SCHEMA.md`
- Tool notes: `tools/mrr/pocketbase/README.md`
