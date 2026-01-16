# Archive.100SaaS (Compliance) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `jobs`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `provider` (select: `s3`, `gdrive`)
  - `bucket` (text)
  - `path_template` (text) — e.g. `/{year}/{customer}/{id}.pdf`
  - `credentials` (json)
  - `is_active` (bool, default true)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`
  - Create/Update/Delete:
    - recommended: `tenant.memberships.user.id ?= @request.auth.id && (tenant.memberships.role = 'admin' || tenant.memberships.role = 'owner')`

### `logs`
- Fields:
  - `job` (relation → `jobs`, required)
  - `invoice_id` (text)
  - `status` (select: `success`, `error`)
  - `message` (text)
  - `meta` (json)
- API Rules:
  - List/View:
    - `job.tenant.memberships.user.id ?= @request.auth.id`

## Required wiring notes

- The Archive hooks expect `STRIPE_SECRET_KEY` to be configured to fetch invoices from Stripe.
