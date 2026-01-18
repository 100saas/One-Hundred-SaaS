# Vote.100SaaS (Feature Board)

**Tool 11**

## What it does

A simple feature board:
- collect feature requests (“posts”)
- let users vote (public vote toggle endpoint)
- track status (`under_review` → `planned` → `in_progress` → `done`)

This is backend-first. You can manage data in the PocketBase Admin UI, or build a small UI on top of the API.

## Core workflow (MVP)

1) Create a `board` (private or public)
2) Create `posts` on that board
3) If the board is public, accept votes via `POST /api/vote/public/toggle`
4) Change post status as you ship

## Data model

See `tools/vote/pocketbase/SCHEMA.md`:
- `boards`
- `posts`
- `votes`

## What’s in here

- PocketBase backend (hooks + migrations): `tools/vote/pocketbase/`
- Shared PocketBase kernel: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## Run locally (quickstart)

```bash
node scripts/pb/run.mjs vote
```

Then open:
- Admin UI: `http://127.0.0.1:8090/_/`
- API base: `http://127.0.0.1:8090/api/`

## API notes

Custom endpoints are implemented in `tools/vote/pocketbase/pb_hooks/main.pb.js`.

Key routes:
- `GET /api/tool/health`
- `POST /api/vote/public/toggle`

Full list: `docs/ENDPOINTS.md`.

## API examples (curl)

**Quick Verification**: New contributors can use these unauthenticated endpoints to verify the tool works locally in under 2 minutes.

**1. List posts** (Unauthenticated)
Read all posts from the `posts` collection. This endpoint is public and does not require authentication.

```bash
curl "http://127.0.0.1:8090/api/collections/posts/records"
```

**2. Toggle vote** (Unauthenticated)
Upvote or downvote a post. This endpoint is public (unauthenticated). Requires a `postId` (from the list above) and a unique `user_identifier` (e.g. a fingerprint or UUID).

```bash
curl -X POST "http://127.0.0.1:8090/api/vote/public/toggle" \
  -H "Content-Type: application/json" \
  -d '{"postId": "RECORD_ID_HERE", "user_identifier": "user_123"}'
```


## Tool 11 Schema & Endpoints

- Schema: `tools/vote/pocketbase/SCHEMA.md`
- Tool notes: `tools/vote/pocketbase/README.md`