# Changes.100SaaS (Changelog) — PocketBase schema

Source of truth: `NEW_PRD/01_50_BATCH.md` for Tool 12.

## Shared Kernel collections (mandatory)

See: `NEW_PRD/00_SHARED_KERNEL.md`

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
- `NEW_PRD/tools/changes-widget/public/widget.js`

The widget fetches entries from PocketBase using:
`/api/collections/entries/records?filter=tenant='TENANT_ID'`

