# Signoff.100SaaS (Approvals)

**Tool 24**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/signoff/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs signoff
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/signoff/pocketbase/SCHEMA.md`
- Tool notes: `tools/signoff/pocketbase/README.md`
