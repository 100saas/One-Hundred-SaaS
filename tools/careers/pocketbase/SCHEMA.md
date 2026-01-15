# Careers.100SaaS (Job Board Builder) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 44.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `career_sites`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `title` (text)
  - `brand_color` (text)
  - `logo` (file)
  - `custom_css` (text)
  - `slug` (text, unique)
- API Rules:
  - View/List: `""` (public)
  - Create/Update:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `job_listings`
- Fields:
  - `site` (relation → `career_sites`, required)
  - `title` (text)
  - `location` (text)
  - `type` (select: `full_time`, `contract`)
  - `apply_link` (url)
  - `is_active` (bool)
- API Rules:
  - View/List: `""` (public)
  - Create/Update:
    - `site.tenant.memberships.user.id ?= @request.auth.id`

## Notes

- Public convenience endpoint: `GET /api/careers/site/:slug` returns site + active listings.
