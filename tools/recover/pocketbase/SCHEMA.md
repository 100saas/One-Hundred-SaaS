# Recover (Tool 1) — PocketBase schema

This describes the **PocketBase collections + API rules** required for the Recover instance.

## Shared Kernel collections (mandatory)

### `tenants`
- Fields:
  - `name` (text, required)
  - `slug` (text, unique)
  - `rc_customer_id` (text)
  - `entitlements` (json)
  - `stripe_customer_id` (text)
  - `settings` (json)
- API Rules:
  - View:
    - `@collection.memberships.tenant.id ?= id && @collection.memberships.user.id ?= @request.auth.id`
  - Update:
    - `@collection.memberships.tenant.id ?= id && @collection.memberships.user.id ?= @request.auth.id && @collection.memberships.role = 'owner'`

### `memberships`
- Fields:
  - `user` (relation → `users`, cascade delete)
  - `tenant` (relation → `tenants`, cascade delete)
  - `role` (select: `owner`, `admin`, `member`, `viewer`)
  - `status` (select: `active`, `invited`)
- API Rules:
  - List:
    - `user = @request.auth.id` OR `tenant.memberships.user.id ?= @request.auth.id`
  - Create:
    - `@request.auth.id != ""`
  - Delete:
    - `tenant.memberships.user.id ?= @request.auth.id && tenant.memberships.role = 'owner'`

### `stripe_connections`
- Fields:
  - `tenant` (relation → `tenants`, unique)
  - `stripe_account_id` (text)
  - `access_token` (text, hidden)
  - `refresh_token` (text, hidden)
- API Rules:
  - View:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `audit_logs`
- Fields:
  - `tenant` (relation → `tenants`)
  - `actor` (relation → `users`)
  - `action` (text)
  - `details` (json)
- API Rules:
  - Create: (system only; no public create rule)
  - View:
    - `tenant.memberships.user.id ?= @request.auth.id && (tenant.memberships.role = 'admin' || tenant.memberships.role = 'owner')`

## Recover collections

### `incidents`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `stripe_event_id` (text, unique, required)
  - `amount_cents` (number)
  - `customer_email` (email)
  - `status` (select: `open`, `assigned`, `resolved`, `snoozed`)
  - `assigned_to` (relation → `users`)
- API Rules:
  - List:
    - `tenant.memberships.user.id ?= @request.auth.id`
  - View:
    - `tenant.memberships.user.id ?= @request.auth.id`
  - Create/Update/Delete:
    - recommended: `tenant.memberships.user.id ?= @request.auth.id && (tenant.memberships.role = 'admin' || tenant.memberships.role = 'owner')`

### `rules`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `min_amount` (number)
  - `slack_webhook_url` (text, hidden)
- API Rules:
  - View:
    - `tenant.memberships.user.id ?= @request.auth.id`
  - Update:
    - `tenant.memberships.user.id ?= @request.auth.id && tenant.memberships.role = 'owner'`

## Required wiring notes

- **Recover tenant resolution:** the Stripe webhook resolves the tenant by matching `invoice.customer` to `tenants.stripe_customer_id`. Ensure this is set for each tenant you expect to receive Stripe events for.
