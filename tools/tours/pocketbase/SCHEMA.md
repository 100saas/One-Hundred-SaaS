# Tours.100SaaS (Product Walkthroughs) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 16.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

## Tool collections

### `tours`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `name` (text)
  - `url_match` (text) — glob-like match (supports `*`)
  - `steps` (json) — array of `{selector,content,placement}`
- API Rules:
  - View/List: `""` (public for widget)

## Widget hosting

Widget script:
- `NEW_PRD/tools/tours-widget/public/tour.js`

Embed:
`<script src="https://tours.example.com/tour.js?tenant=TENANT_ID&tour=TOUR_ID" defer></script>`

