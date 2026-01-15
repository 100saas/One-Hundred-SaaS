# Convert.100SaaS (CTA Widgets) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 37.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

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

