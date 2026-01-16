# Convert.100SaaS (CTA Widgets) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `widgets`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `type` (select: `popup`, `banner`, `slide_in`)
  - `headline` (text)
  - `cta_text` (text)
  - `cta_link` (url)
  - `trigger_delay` (number)
  - `is_active` (bool)
- API Rules:
  - View/List: `""` (public for widget)
