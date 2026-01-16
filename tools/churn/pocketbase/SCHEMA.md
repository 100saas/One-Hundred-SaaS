# Churn.100SaaS (Exit Surveys) — PocketBase schema

## Shared Kernel collections (mandatory)

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

Embed:
`<script src="https://churn.example.com/widget.js?id=TENANT_ID" defer></script>`
