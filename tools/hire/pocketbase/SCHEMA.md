# Hire.100SaaS (Mini-ATS) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 42.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `jobs`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `title` (text)
  - `description_html` (text/editor)
  - `status` (select: `draft`, `published`, `closed`)
  - `slug` (text, unique)
- API Rules:
  - View/List: `status = 'published'` (public)
  - Create/Update:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `applicants`
- Fields:
  - `job` (relation → `jobs`, required)
  - `name` (text)
  - `email` (text)
  - `resume` (file)
  - `stage` (select: `applied`, `screening`, `interview`, `offer`, `rejected`)
- API Rules:
  - Create: `""` (public)
  - List/View/Update:
    - `job.tenant.memberships.user.id ?= @request.auth.id`
