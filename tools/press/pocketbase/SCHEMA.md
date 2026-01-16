# Press.100SaaS (Media Kit) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `kits`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `company_name` (text)
  - `boilerplate` (text)
  - `slug` (text, unique)
  - `brand` (json) — optional (colors, links)
- API Rules:
  - View/List: `""` (public)

### `assets`
- Fields:
  - `kit` (relation → `kits`, required)
  - `file` (file)
  - `type` (select: `logo_dark`, `logo_light`, `photo`, `screenshot`)
  - `label` (text)
- API Rules:
  - View/List: `""` (public)
