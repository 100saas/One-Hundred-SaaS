# Score.100SaaS (Interview Rubrics) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `roles`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `title` (text)
  - `rubric` (json)
- API Rules:
  - List/View/Create/Update:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `candidates`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `name` (text)
  - `role` (relation → `roles`)
- API Rules:
  - List/View/Create/Update:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `scorecards`
- Fields:
  - `candidate` (relation → `candidates`, required)
  - `interviewer` (relation → `users`)
  - `scores` (json)
  - `notes` (text)
  - `decision` (select: `strong_hire`, `hire`, `no_hire`)
- API Rules:
  - List/View/Create/Update:
    - `candidate.tenant.memberships.user.id ?= @request.auth.id`
