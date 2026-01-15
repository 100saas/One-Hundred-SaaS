# Audit.100SaaS (Link Broken Checker) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 34.

Subdomain: `scan.100saas.com` (avoids conflict with Tool 7).

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `audits`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `domain` (url, required)
  - `status` (select: `queued`, `crawling`, `completed`, `failed`)
  - `pages_scanned` (number)
  - `broken_links_count` (number)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `audit_issues`
- Fields:
  - `audit` (relation → `audits`, required)
  - `source_url` (url)
  - `target_url` (url)
  - `status_code` (number)
  - `anchor_text` (text)
- API Rules:
  - List/View:
    - `audit.tenant.memberships.user.id ?= @request.auth.id`

## Worker

Crawler worker script:
- `NEW_PRD/workers/audit/worker.js`
