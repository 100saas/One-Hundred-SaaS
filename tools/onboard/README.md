# Onboard.100SaaS (Checklists)

**Tool 15**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/onboard/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs onboard
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/onboard/pocketbase/SCHEMA.md`
- Tool notes: `tools/onboard/pocketbase/README.md`
