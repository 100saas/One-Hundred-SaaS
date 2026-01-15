# Offer.100SaaS (Offer Letters) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 45.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `offer_templates`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `name` (text)
  - `content_html` (text/editor)
  - `variables` (json)
- API Rules:
  - List/View/Create/Update:
    - `tenant.memberships.user.id ?= @request.auth.id`

### `sent_offers`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `template` (relation → `offer_templates`)
  - `candidate_email` (email)
  - `variable_values` (json)
  - `status` (select: `draft`, `sent`, `signed`, `voided`)
  - `sign_token` (text, unique)
  - `signed_pdf` (file)
  - `signed_at` (date)
  - `signer_ip` (text)
- API Rules:
  - List/View/Create/Update:
    - `tenant.memberships.user.id ?= @request.auth.id`

## Notes

- Candidate signing endpoint: `POST /api/offer/sign/:token` (public).
