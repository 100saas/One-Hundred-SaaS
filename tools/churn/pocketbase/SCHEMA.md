# Churn.100SaaS (Exit Surveys) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 14.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `survey_configs`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `trigger_url_contains` (text) — e.g. `/cancel`
  - `reasons` (json) — list of strings
- API Rules:
  - View/List: `""` (public for widget)

### `survey_responses`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `reason` (text)
  - `comment` (text)
  - `customer_email` (text)
- API Rules:
  - Create: `""` (public)
  - View/List: recommended restricted (admin-only)

## Widget hosting

Widget script:
- `NEW_PRD/tools/churn-widget/public/widget.js`

Embed:
`<script src="https://churn.example.com/widget.js?id=TENANT_ID" defer></script>`

