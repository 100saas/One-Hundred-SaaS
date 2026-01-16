# Changes.100SaaS (Changelog) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `entries`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `title` (text)
  - `content_html` (editor/text)
  - `tags` (json)
  - `published_at` (date)
- API Rules:
  - View: `""` (public for widget)
  - List: `""` (public for widget)

## Widget hosting

The PRD specifies a vanilla JS widget hosted on Cloudflare Pages:

The widget fetches entries from PocketBase using:
`/api/collections/entries/records?filter=tenant='TENANT_ID'`
