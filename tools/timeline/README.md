# Timeline.100SaaS (Single Customer View)

**Tool 5**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/timeline/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs timeline
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/timeline/pocketbase/SCHEMA.md`
- Tool notes: `tools/timeline/pocketbase/README.md`
