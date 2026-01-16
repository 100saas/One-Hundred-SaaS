# Postmortem.100SaaS (Incident Retro)

**Tool 49**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/postmortem/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs postmortem
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/postmortem/pocketbase/SCHEMA.md`
- Tool notes: `tools/postmortem/pocketbase/README.md`
