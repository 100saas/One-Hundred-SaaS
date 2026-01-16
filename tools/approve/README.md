# Approve.100SaaS (Design Feedback)

**Tool 21**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/approve/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs approve
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/approve/pocketbase/SCHEMA.md`
- Tool notes: `tools/approve/pocketbase/README.md`
