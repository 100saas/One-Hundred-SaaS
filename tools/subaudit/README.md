# SubAudit.100SaaS (Change Logger)

**Tool 7**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/subaudit/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs subaudit
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/subaudit/pocketbase/SCHEMA.md`
- Tool notes: `tools/subaudit/pocketbase/README.md`
