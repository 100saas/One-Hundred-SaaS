# Changes.100SaaS (Changelog)

**Tool 12**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/changes/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs changes
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/changes/pocketbase/SCHEMA.md`
- Tool notes: `tools/changes/pocketbase/README.md`
