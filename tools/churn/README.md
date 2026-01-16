# Churn.100SaaS (Exit Survey Widget)

**Tool 14**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/churn/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs churn
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/churn/pocketbase/SCHEMA.md`
- Tool notes: `tools/churn/pocketbase/README.md`
