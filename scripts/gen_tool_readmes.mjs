import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const toolsDir = path.join(root, 'tools')

function escapeMd(s) {
  return String(s || '').replaceAll('\r\n', '\n').trim()
}

async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

function parseTitle(readmeText, fallbackSlug) {
  const firstLine = (readmeText || '').split('\n').find((l) => l.trim().startsWith('# ')) || ''
  const title = firstLine.replace(/^#\s+/, '').trim()
  return title || fallbackSlug
}

function parseSummary(readmeText) {
  const lines = (readmeText || '').split('\n').map((l) => l.trim())
  // Find the first non-empty line after the header.
  const idx = lines.findIndex((l) => l.startsWith('# '))
  for (let i = idx + 1; i < lines.length; i++) {
    const l = lines[i]
    if (!l) continue
    if (l.startsWith('## ')) break
    if (l.startsWith('- ')) continue
    return l
  }
  return ''
}

function toolReadme({ slug, title, summary }) {
  const safeSummary =
    summary ||
    'A small, practical tool in the 100saas suite. This folder contains the default PocketBase implementation.'
  return `# ${escapeMd(title)}

${escapeMd(safeSummary)}

## What’s in here

- PocketBase backend (hooks + migrations): \`tools/${slug}/pocketbase/\`
- Shared PocketBase kernel: \`kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js\`

## Run locally (quickstart)

\`\`\`bash
node scripts/pb/run.mjs ${slug}
\`\`\`

Then open:
- Admin UI: \`http://127.0.0.1:8090/_/\`
- API base: \`http://127.0.0.1:8090/api/\`

## Schema + endpoints

- Schema: \`tools/${slug}/pocketbase/SCHEMA.md\`
- Tool notes: \`tools/${slug}/pocketbase/README.md\`
`
}

async function main() {
  const items = await fs.readdir(toolsDir, { withFileTypes: true })
  const slugs = items.filter((d) => d.isDirectory()).map((d) => d.name).sort()

  let wrote = 0
  for (const slug of slugs) {
    const pbReadmePath = path.join(toolsDir, slug, 'pocketbase', 'README.md')
    if (!(await exists(pbReadmePath))) continue
    const pbReadme = await fs.readFile(pbReadmePath, 'utf8')
    const title = parseTitle(pbReadme, slug)
    const summary = parseSummary(pbReadme)

    const outPath = path.join(toolsDir, slug, 'README.md')
    await fs.writeFile(outPath, toolReadme({ slug, title, summary }), 'utf8')
    wrote += 1
  }

  console.log(`generated tool READMEs: ${wrote}`)
}

main().catch((err) => {
  console.error(err?.stack || String(err))
  process.exit(1)
})

