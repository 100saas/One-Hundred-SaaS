# Audit.100SaaS (Link Broken Checker)

**Tool 34**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/audit-links/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs audit-links
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/audit-links/pocketbase/SCHEMA.md`
- Tool notes: `tools/audit-links/pocketbase/README.md`
