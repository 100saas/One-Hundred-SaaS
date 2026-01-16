import fs from 'node:fs/promises'
import path from 'node:path'

function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--title') args.title = String(argv[++i] || '')
    else if (a === '--summary') args.summary = String(argv[++i] || '')
    else if (a === '--help' || a === '-h') args.help = true
    else args._.push(a)
  }
  return args
}

function usage() {
  return `Usage:
  node scripts/new_tool.mjs <toolSlug> --title "Tool Name" --summary "1 sentence"

Example:
  node scripts/new_tool.mjs keyword-tracker --title "Keyword Tracker" --summary "Track rankings over time."
`
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function normalizeSlug(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replaceAll('_', '-')
    .replaceAll(' ', '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function mkdirp(p) {
  await fs.mkdir(p, { recursive: true })
}

async function writeFileIfMissing(p, contents) {
  if (await exists(p)) return false
  await fs.writeFile(p, contents, 'utf8')
  return true
}

function toolReadme({ slug, title, summary }) {
  return `# ${title}

${summary}

## What’s in here

- PocketBase backend: \`tools/${slug}/pocketbase/\`
- Shared kernel (PocketBase): \`kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js\`

## Run locally

\`\`\`bash
node scripts/pb/run.mjs ${slug}
\`\`\`
`
}

function pbReadme({ title }) {
  return `# ${title} — PocketBase instance

This folder contains the PocketBase backend for this tool:

- Hooks: \`pb_hooks/main.pb.js\`
- Schema + rules notes: \`SCHEMA.md\`

Integrations should be optional: if a key is missing, return \`503 <service>_not_configured\` instead of crashing.
`
}

function schemaMd({ title }) {
  return `# ${title} — PocketBase schema

Define:
- Collections
- Fields
- API Rules (tenant isolation, roles, public endpoints if any)

Start small and iterate.
`
}

function hooksStub({ slug }) {
  return `// ${slug} hooks (PocketBase JS runtime)
//
// This is a stub. Add tool-specific routes, and reuse the shared kernel when possible.

routerAdd("GET", "/api/health", (c) => {
  return c.json(200, { ok: true, tool: "${slug}" });
});

// Example: use the shared kernel (copied into pb_hooks/_shared/kernel.js by scripts/pb/run.mjs)
// const k = require(__hooks + "/_shared/kernel.js");
// routerAdd("POST", "/api/invites/create", (c) => k.handleInviteCreate(c, { toolSlug: "${slug}" }));
`
}

function migrationStub() {
  return `/// <reference path="../pb_migrations/types.d.ts" />

migrate((db) => {
  // TODO: define collections for this tool.
  // This is intentionally empty so you can start with SCHEMA.md and iterate.
}, (db) => {
  // TODO: rollback
})
`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(usage())
    process.exit(0)
  }

  const slug = normalizeSlug(args._[0])
  const title = String(args.title || '').trim()
  const summary = String(args.summary || '').trim()

  assert(slug, `Missing toolSlug\n\n${usage()}`)
  assert(title, `Missing --title\n\n${usage()}`)
  assert(summary, `Missing --summary\n\n${usage()}`)

  const repoRoot = process.cwd()
  const toolsDir = path.join(repoRoot, 'tools')
  const toolDir = path.join(toolsDir, slug)

  assert(await exists(toolsDir), `Missing tools directory: ${toolsDir}`)
  if (await exists(toolDir)) throw new Error(`Tool already exists: tools/${slug}`)

  const pbDir = path.join(toolDir, 'pocketbase')
  const pbHooksDir = path.join(pbDir, 'pb_hooks')
  const pbMigrationsDir = path.join(pbDir, 'pb_migrations')

  await mkdirp(pbHooksDir)
  await mkdirp(pbMigrationsDir)

  await writeFileIfMissing(path.join(toolDir, 'README.md'), toolReadme({ slug, title, summary }))
  await writeFileIfMissing(path.join(pbDir, 'README.md'), pbReadme({ title }))
  await writeFileIfMissing(path.join(pbDir, 'SCHEMA.md'), schemaMd({ title }))
  await writeFileIfMissing(path.join(pbHooksDir, 'main.pb.js'), hooksStub({ slug }))
  await writeFileIfMissing(path.join(pbMigrationsDir, '0001_init_schema.js'), migrationStub())

  console.log(`created tools/${slug}`)
}

main().catch((err) => {
  console.error(err?.stack || String(err))
  process.exit(1)
})

