# QA.100SaaS (Launch Checklist)

**Tool 32**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/qa/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs qa
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/qa/pocketbase/SCHEMA.md`
- Tool notes: `tools/qa/pocketbase/README.md`
