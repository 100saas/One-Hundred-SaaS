# Proposal.100SaaS (Proposal Generator)

**Tool 27**

## What’s in here

- PocketBase backend (hooks + migrations): `tools/proposal/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs proposal
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/proposal/pocketbase/SCHEMA.md`
- Tool notes: `tools/proposal/pocketbase/README.md`
