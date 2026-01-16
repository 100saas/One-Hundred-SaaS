# Update.100SaaS (Status Feed)

**Tool 26**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/update/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs update
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/update/pocketbase/SCHEMA.md`
- Tool notes: `tools/update/pocketbase/README.md`
