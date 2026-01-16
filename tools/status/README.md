# Status.100SaaS (Status Page)

**Tool 17**

## What it does

A simple status page backend:
- define `components` (API, website, etc.)
- publish `incidents` with short updates
- expose public listing via `tenant_slug` without making the `tenants` collection public

This is backend-first. You can manage everything in the PocketBase Admin UI, or build a UI on top of the public collections.

## Core workflow (MVP)

1) Create components (API/Website/etc)
2) Create incidents as you investigate and resolve
3) Optionally run demo seed to populate example data

## Data model

See `tools/status/pocketbase/SCHEMA.md`:
- `components`
- `incidents`

## API notes

Key routes:
- `GET /api/tool/health`
- `POST /api/status/demo/seed` (owner-only)

Full list: `docs/ENDPOINTS.md`.

## What’s in here

- PocketBase backend (hooks + migrations): `tools/status/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs status
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/status/pocketbase/SCHEMA.md`
- Tool notes: `tools/status/pocketbase/README.md`
