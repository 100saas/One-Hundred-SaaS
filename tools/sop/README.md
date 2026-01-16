# SOP.100SaaS (Process Builder)

**Tool 23**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/sop/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs sop
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/sop/pocketbase/SCHEMA.md`
- Tool notes: `tools/sop/pocketbase/README.md`
