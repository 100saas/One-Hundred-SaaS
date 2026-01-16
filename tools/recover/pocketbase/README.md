# Recover (Tool 1) — PocketBase instance

This folder contains the **Recover.100SaaS** backend logic for a single PocketBase instance:
- Hooks: `pb_hooks/main.pb.js`
- Schema guidance: `SCHEMA.md`

## Setup (manual, PocketBase Admin UI)

1) Create the collections in `SCHEMA.md`.
2) Configure env vars for the PocketBase process:
   - `RC_WEBHOOK_SECRET`
   - `RC_API_KEY`
   - (optional) `STRIPE_WEBHOOK_SECRET`
3) Place `pb_hooks/main.pb.js` into your PocketBase instance’s `pb_hooks/`.

## Endpoints

- `POST /api/webhooks/revenuecat` (Shared Kernel)
- `POST /api/webhooks/stripe` (Recover)
