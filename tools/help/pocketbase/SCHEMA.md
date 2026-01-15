# Help.100SaaS (Knowledge Base) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 20.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `collections` (categories)
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `tenant_slug` (text) — denormalized for public filtering
  - `name` (text)
  - `slug` (text)
  - `icon` (text)
- API Rules:
  - View/List: `""` (public)

### `articles`
- Fields:
  - `collection` (relation → `collections`, required)
  - `title` (text)
  - `slug` (text)
  - `body_markdown` (text)
  - `is_published` (bool)
  - `view_count` (number)
- API Rules:
  - View/List: `is_published = true`

## Notes

- Like Tool 17, `tenant_slug` is denormalized to avoid making `tenants` public.

