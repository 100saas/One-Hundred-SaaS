# Pay.100SaaS (Contractor Portal) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `contractors`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `name` (text)
  - `email` (email)
  - `upload_token` (text, unique, required)
- API Rules:
  - List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`
  - Create/Update/Delete:
    - recommended: `tenant.memberships.user.id ?= @request.auth.id && (tenant.memberships.role = 'admin' || tenant.memberships.role = 'owner')`

### `invoices`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `contractor` (relation → `contractors`, required)
  - `amount` (number)
  - `currency` (text)
  - `file` (file)
  - `upload_token` (text, hidden) — transient input; hook clears it before save
  - `status` (select: `pending`, `approved`, `paid`)
- API Rules:
  - Admin List/View:
    - `tenant.memberships.user.id ?= @request.auth.id`
  - Public Create:
    - keep restrictive; recommended: disable direct create, and rely on hook validation described below

## Required wiring notes

- Public uploads: the hook validates a `token` payload field matches the contractor’s `upload_token` before allowing invoice creation.
