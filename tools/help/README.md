# Help.100SaaS (Knowledge Base)

**Tool 20**

## What it does

A simple public knowledge base backend:
- categories (`collections`)
- articles (`articles`) with markdown body
- public listing uses `tenant_slug` without making the `tenants` collection public

This is backend-first. You can manage content in PocketBase Admin UI, or build a public KB UI on top of the API.

## Core workflow (MVP)

1) Create a category (`collections`)
2) Create articles, mark `is_published=true`
3) Optionally run demo seed to populate starter content

## Data model

See `tools/help/pocketbase/SCHEMA.md`:
- `collections`
- `articles`

## API notes

Key routes:
- `GET /api/tool/health`
- `POST /api/help/demo/seed` (owner-only)

Full list: `docs/ENDPOINTS.md`.

## What’s in here

- PocketBase backend (hooks + migrations): `tools/help/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs help
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/help/pocketbase/SCHEMA.md`
- Tool notes: `tools/help/pocketbase/README.md`
