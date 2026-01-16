# Tours.100SaaS (Product Walkthroughs) — PocketBase schema

## Shared Kernel collections (mandatory)

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

Embed:
`<script src="https://tours.example.com/tour.js?tenant=TENANT_ID&tour=TOUR_ID" defer></script>`
