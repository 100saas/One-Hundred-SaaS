# Audit.100SaaS (Link Broken Checker) — PocketBase schema

## Shared Kernel collections (mandatory)

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
