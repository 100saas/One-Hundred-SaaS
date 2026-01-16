# Recover (Tool 1) — PocketBase instance

This folder contains the **Recover.100SaaS** backend logic for a single PocketBase instance:

## What’s in here

- PocketBase backend (hooks + migrations): `tools/recover/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs recover
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/recover/pocketbase/SCHEMA.md`
- Tool notes: `tools/recover/pocketbase/README.md`
