# Reviews.100SaaS (Review Funnel) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `campaigns`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `name` (text)
  - `google_maps_link` (url)
  - `logo` (file)
  - `min_stars` (number) — default 4
  - `slug` (text, unique)
- API Rules:
  - View/List: `""` (public)

### `feedback_entries`
- Fields:
  - `campaign` (relation → `campaigns`, required)
  - `rating` (number)
  - `message` (text)
  - `contact_email` (text)
- API Rules:
  - Create: `""` (public)
