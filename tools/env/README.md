# Env.100SaaS (Secrets Hygiene)

**Tool 47**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/env/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs env
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/env/pocketbase/SCHEMA.md`
- Tool notes: `tools/env/pocketbase/README.md`
