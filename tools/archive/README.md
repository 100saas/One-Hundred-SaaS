# Archive.100SaaS (Compliance)

**Tool 2**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/archive/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs archive
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/archive/pocketbase/SCHEMA.md`
- Tool notes: `tools/archive/pocketbase/README.md`
