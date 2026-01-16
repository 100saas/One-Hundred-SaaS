# NPS.100SaaS (Micro-Surveys)

**Tool 13**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/nps/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs nps
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/nps/pocketbase/SCHEMA.md`
- Tool notes: `tools/nps/pocketbase/README.md`
