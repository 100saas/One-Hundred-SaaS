# Ref.100SaaS (Reference Checks) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `ref_requests`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `candidate_name` (text)
  - `ref_email` (text)
  - `token` (text, unique)
  - `status` (select: `sent`, `completed`)
  - `creator_ip` (text) — used for suspicious detection
- API Rules:
  - List/View/Create/Update:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `ref_responses`
- Fields:
  - `request` (relation → `ref_requests`, required)
  - `relationship` (text)
  - `strengths` (text)
  - `weaknesses` (text)
  - `would_hire_again` (bool)
  - `ip_address` (text)
  - `is_suspicious` (bool)
- API Rules:
  - Create: `""` (public via custom endpoint)
  - List/View:
    - `request.tenant.memberships.user.id ?= @request.auth.id`

## Notes

- Public submission endpoint: `POST /api/ref/respond/:token`.
