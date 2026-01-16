# Adding a tool

This repo is a monorepo. Each tool lives in its own folder under `tools/<toolSlug>/`.

## Before you code

1) Propose the tool in Discussions:
   - `https://github.com/100saas/One-Hundred-SaaS/discussions/1`
2) Include:
   - What problem it solves
   - Who it’s for
   - The workflow (3–7 steps)
   - Any existing SaaS you’re replacing

When it’s clear + scoped, open an Issue.

## Create the folder

Use the scaffolder:

```bash
node scripts/new_tool.mjs my-tool-slug --title "My Tool" --summary "1 sentence"
```

This creates:
- `tools/<slug>/README.md` (high-level tool readme)
- `tools/<slug>/pocketbase/SCHEMA.md` (schema + API rules notes)
- `tools/<slug>/pocketbase/pb_hooks/main.pb.js` (hooks entrypoint)
- `tools/<slug>/pocketbase/pb_migrations/0001_init_schema.js` (starter migration)

## Tool README convention (for the tool catalog)

`docs/TOOLS.md` is generated from `tools/<slug>/README.md`. To keep the catalog sortable:
- include `**Tool N**` somewhere near the top of the tool README
- keep the first line as an H1 (`# ...`)

After adding a tool, update the catalog:

```bash
node scripts/generate_tools_catalog.mjs
```

## Test locally

```bash
node scripts/pb/run.mjs my-tool-slug --port 8090
```

Create an admin user, then verify:
- hooks load without errors
- migrations apply (via admin UI or CLI)
- endpoints return `4xx/503` instead of `500` on invalid input

## Submit a PR

- Keep it small (one tool, or one kernel change).
- Link the Issue/Discussion.
- Do not commit secrets.
