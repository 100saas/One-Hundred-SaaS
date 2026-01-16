# Retainer.100SaaS (Time Tracking)

**Tool 30**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/retainer/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs retainer
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/retainer/pocketbase/SCHEMA.md`
- Tool notes: `tools/retainer/pocketbase/README.md`
