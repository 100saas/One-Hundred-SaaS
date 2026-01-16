# Runbook.100SaaS (Interactive Ops)

**Tool 48**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/runbook/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs runbook
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/runbook/pocketbase/SCHEMA.md`
- Tool notes: `tools/runbook/pocketbase/README.md`
