# Refunds.100SaaS (Anomaly Detection)

**Tool 4**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/refunds/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs refunds
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/refunds/pocketbase/SCHEMA.md`
- Tool notes: `tools/refunds/pocketbase/README.md`
