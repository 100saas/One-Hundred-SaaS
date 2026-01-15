# Fight.100SaaS (Dispute Manager) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 3.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `disputes`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `stripe_id` (text, unique, required)
  - `reason` (text)
  - `due_date` (date) — Stripe evidence due date
  - `internal_deadline` (date) — `due_date - 24h`
  - `status` (select: `gathering`, `review`, `submitted`)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `evidence_files`
- Fields:
  - `dispute` (relation → `disputes`, required)
  - `file` (file)
  - `category` (select: `logs`, `tos`, `shipping`)
- API Rules:
  - List/View:
    - `dispute.tenant.memberships.user.id ?= @request.auth.id`
