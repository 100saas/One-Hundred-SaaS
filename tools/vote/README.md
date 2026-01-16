# Vote.100SaaS (Feature Board)

**Tool 11**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/vote/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs vote
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/vote/pocketbase/SCHEMA.md`
- Tool notes: `tools/vote/pocketbase/README.md`
