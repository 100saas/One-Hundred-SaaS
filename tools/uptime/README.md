# Uptime.100SaaS (Website Monitor)

**Tool 18**

## What it does

A lightweight website monitor backend:
- define `monitors` (url + interval)
- cron checks each monitor with a `HEAD` request
- records outages in `outage_logs`

This is backend-first. You can manage monitors in PocketBase Admin UI, or build a UI on top of the API.

## Core workflow (MVP)

1) Create a monitor (URL + check interval)
2) Cron runs and updates status/latency
3) When a monitor goes down/up, outage logs are opened/closed

## Data model

See `tools/uptime/pocketbase/SCHEMA.md`:
- `monitors`
- `outage_logs`

## API notes

Key routes:
- `GET /api/tool/health`

The scheduled checker logic lives in `tools/uptime/pocketbase/pb_hooks/main.pb.js` (`cronAdd`).

Full list: `docs/ENDPOINTS.md`.

## What’s in here

- PocketBase backend (hooks + migrations): `tools/uptime/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs uptime
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## Schema + endpoints

- Schema: `tools/uptime/pocketbase/SCHEMA.md`
- Tool notes: `tools/uptime/pocketbase/README.md`
