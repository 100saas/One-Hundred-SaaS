# Onboard.100SaaS (Checklists) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `checklist_templates`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `title` (text)
  - `items` (json) — array of `{id:number,label:string,url?:string}`
- API Rules:
  - View/List: `""` (public for widget)

### `user_progress`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `end_user_id` (text, required)
  - `completed_item_ids` (json)
- API Rules:
  - Public read/write scoped by `end_user_id` (enforce in client + hooks)

## Widget hosting

Widget script:

Embed:
`<script src="https://onboard.example.com/checklist.js?tenant=TENANT_ID&template=TEMPLATE_ID&user=END_USER_ID" defer></script>`
