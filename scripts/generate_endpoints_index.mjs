import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const toolsDir = path.join(root, 'tools')
const outPath = path.join(root, 'docs', 'ENDPOINTS.md')

async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

function escapeMd(s) {
  return String(s || '').replaceAll('|', '\\|')
}

function parseRoutes(source) {
  const routes = []
  // Very simple regex: routerAdd("METHOD", "/path", ...)
  const re = /routerAdd\(\s*["']([A-Z]+)["']\s*,\s*["']([^"']+)["']/g
  for (const m of source.matchAll(re)) {
    routes.push({ method: m[1], path: m[2] })
  }
  // Deduplicate
  const seen = new Set()
  return routes.filter((r) => {
    const k = `${r.method} ${r.path}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

async function listTools() {
  const items = await fs.readdir(toolsDir, { withFileTypes: true })
  return items.filter((d) => d.isDirectory()).map((d) => d.name).sort()
}

async function main() {
  if (!(await exists(toolsDir))) throw new Error(`Missing tools dir: ${toolsDir}`)

  const slugs = await listTools()
  const byTool = []

  for (const slug of slugs) {
    const hooksPath = path.join(toolsDir, slug, 'pocketbase', 'pb_hooks', 'main.pb.js')
    if (!(await exists(hooksPath))) continue
    const src = await fs.readFile(hooksPath, 'utf8')
    const routes = parseRoutes(src)
    byTool.push({ slug, routes })
  }

  const lines = []
  lines.push('# Endpoints index')
  lines.push('')
  lines.push('This file is auto-generated from `tools/*/pocketbase/pb_hooks/main.pb.js`.')
  lines.push('')
  lines.push('Regenerate:')
  lines.push('')
  lines.push('```bash')
  lines.push('node scripts/generate_endpoints_index.mjs')
  lines.push('```')
  lines.push('')

  for (const t of byTool) {
    lines.push(`## ${t.slug}`)
    lines.push('')
    if (!t.routes.length) {
      lines.push('_No `routerAdd()` routes found in this tool hooks file._')
      lines.push('')
      continue
    }
    lines.push('| Method | Path |')
    lines.push('|---|---|')
    for (const r of t.routes.sort((a, b) => (a.method + a.path).localeCompare(b.method + b.path))) {
      lines.push(`| \`${escapeMd(r.method)}\` | \`${escapeMd(r.path)}\` |`)
    }
    lines.push('')
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, lines.join('\n') + '\n', 'utf8')
  console.log(`wrote ${path.relative(root, outPath)}`)
}

main().catch((err) => {
  console.error(err?.stack || String(err))
  process.exit(1)
})

