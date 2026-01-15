# Portal.100SaaS (Client Onboarding) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 22.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `clients`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `company_name` (text)
  - `access_code` (text, unique, required)
- API Rules:
  - Admin list/view:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `portal_items`
- Fields:
  - `client` (relation → `clients`, required)
  - `type` (select: `file`, `link`, `invoice`, `task`)
  - `title` (text)
  - `url_or_file` (file/url)
  - `is_completed` (bool)
- API Rules:
  - Admin list/view:
    - `client.tenant.memberships.user.id ?= @request.auth.id`
  - Client list/view by access_code is typically done by filtering `client.access_code` in the client.

