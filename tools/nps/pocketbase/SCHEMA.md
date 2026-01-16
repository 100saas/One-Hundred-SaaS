# NPS.100SaaS (Micro-Surveys) — PocketBase schema

## Shared Kernel collections (mandatory)

## Tool collections

### `surveys`
- Fields:
  - `tenant` (relation → `tenants`, required)
  - `question` (text)
  - `is_active` (bool)
- API Rules:
  - View/List: `""` (public for widget)

### `nps_responses`
- Fields:
  - `survey` (relation → `surveys`, required)
  - `score` (number, required) — 0..10
  - `comment` (text)
  - `user_identifier` (text) — optional fingerprint/email hash
  - `created_at` (date) — optional (PB already tracks created)
- API Rules:
  - Create: `""` (public for widget)
  - View/List: recommended to restrict to tenant admins only (widget should not read responses)

## Notes

- Validation is enforced in hooks: score range + basic payload sanity.
