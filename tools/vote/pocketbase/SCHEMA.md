# Vote.100SaaS (Feature Board) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 11.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `boards`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `slug` (text, unique, required)
  - `is_public` (bool)
- API Rules:
  - View: `""` (public if `is_public=true` enforced in UI; PB rules can’t easily do conditional public here)

### `posts`
- Fields:
  - `board` (relation → `boards`, required)
  - `title` (text)
  - `description` (text)
  - `status` (select: `under_review`, `planned`, `in_progress`, `done`)
  - `vote_count` (number, default 0)
- API Rules:
  - View: `""` (public)

### `votes`
- Fields:
  - `post` (relation → `posts`, required)
  - `user_identifier` (text, required)
- Indexing recommendation:
  - Unique composite (`post`, `user_identifier`) to prevent duplicates
- API Rules:
  - Create: `""` (public)
  - Delete: `""` (public) (optional; for toggling)
