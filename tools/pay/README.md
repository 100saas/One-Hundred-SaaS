# Pay.100SaaS (Contractor Portal)

**Tool 10**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/pay/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs pay
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/pay/pocketbase/SCHEMA.md`
- Tool notes: `tools/pay/pocketbase/README.md`
