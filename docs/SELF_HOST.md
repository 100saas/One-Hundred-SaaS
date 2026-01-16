# Self-host (PocketBase-first)

This repo is optimized for **building**. Self-hosting is the fastest way to test your changes.

## What is PocketBase?

PocketBase is a small backend (single binary) that gives you auth + database + API in one place. Learn more at `https://pocketbase.io`.

## Quickstart (local)

Prereqs:
- macOS/Linux (Windows should work via WSL)
- Node.js 20+
- `curl` + `unzip` (used to fetch PocketBase)

Run a tool backend locally:

```bash
node scripts/pb/run.mjs recover
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

The first time, create an admin user in the Admin UI.

## What the script does

- Downloads a PocketBase binary (cached under `.cache/`).
- Creates a local runtime folder under `.runtime/<toolSlug>/` containing:
  - `pb_hooks/` (tool hooks)
  - `pb_migrations/` (tool schema migrations)
  - `pb_hooks/_shared/kernel.js` (shared kernel)
- Starts PocketBase on port `8090` by default.

## Windows (recommended: WSL2)

Windows should work best through **WSL2**:
- Install Node 20+ inside your WSL distro.
- Make sure `curl` and `unzip` are installed inside WSL (not just on Windows).

## Env vars

Most integrations are optional. If a key is missing, endpoints return a safe `503 <service>_not_configured`.

Common (optional):
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RC_API_KEY`
- `RC_WEBHOOK_SECRET`

## Running multiple tools

Use different ports:

```bash
node scripts/pb/run.mjs recover --port 8090
node scripts/pb/run.mjs refunds --port 8091
```

## Troubleshooting

### “Port already in use”

Run on another port:

```bash
node scripts/pb/run.mjs recover --port 8091
```

### “Missing dependency: curl/unzip”

Install dependencies and retry.

- macOS (Homebrew): `brew install curl unzip`
- Debian/Ubuntu/WSL: `sudo apt-get update && sudo apt-get install -y curl unzip`

### “I don’t see any data / where is it stored?”

The runtime data is created under:
- `.runtime/<toolSlug>/`

### “I can’t log in”

On first run, you must create an admin user in the Admin UI:
- `http://127.0.0.1:8090/_/`
