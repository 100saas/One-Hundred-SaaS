# Status.100SaaS (Status Pages) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 17.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `components`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `tenant_slug` (text) — denormalized for public filtering
  - `name` (text)
  - `status` (select: `operational`, `degraded`, `outage`)
- API Rules:
  - View/List: `""` (public)

### `incidents`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `tenant_slug` (text) — denormalized for public filtering
  - `title` (text)
  - `message` (text)
  - `state` (select: `investigating`, `identified`, `resolved`)
- API Rules:
  - View/List: `""` (public)

## Notes

- `tenant_slug` is added to support public pages without making `tenants` public.

