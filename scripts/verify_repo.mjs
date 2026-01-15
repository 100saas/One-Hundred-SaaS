import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()

const forbiddenPatterns = [
  /sk_(live|test)_[0-9a-zA-Z]{10,}/,
  /pk_(live|test)_[0-9a-zA-Z]{10,}/,
  /ghp_[0-9A-Za-z]{20,}/,
  /gho_[0-9A-Za-z]{20,}/,
  /CLOUDFLARE_API_TOKEN\s*=/,
  /CF_API_TOKEN\s*=/,
  /GITHUB_PAT\s*=/,
]

async function listFiles(dir) {
  const out = []
  const items = await fs.readdir(dir, { withFileTypes: true })
  for (const it of items) {
    if (it.name === '.git') continue
    if (it.name === 'node_modules') continue
    if (it.name === 'pb_data') continue
    const full = path.join(dir, it.name)
    if (it.isDirectory()) out.push(...(await listFiles(full)))
    else out.push(full)
  }
  return out
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  // Basic structure
  const toolsDir = path.join(root, 'tools')
  const kernelFile = path.join(root, 'kernel', 'pocketbase', '_shared', 'pb_hooks', '_shared', 'kernel.js')
  await fs.access(toolsDir)
  await fs.access(kernelFile)

  const toolSlugs = (await fs.readdir(toolsDir, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((s) => s !== 'README.md')

  assert(toolSlugs.length >= 50, `expected >= 50 tools, got ${toolSlugs.length}`)

  // Each tool should have pocketbase hooks + migrations
  for (const slug of toolSlugs) {
    const base = path.join(toolsDir, slug, 'pocketbase')
    await fs.access(path.join(base, 'pb_hooks'))
    await fs.access(path.join(base, 'pb_migrations'))
  }

  // Shallow secret scan
  const files = await listFiles(root)
  for (const file of files) {
    // Skip very large binaries if any (shouldn't exist, but be safe)
    const stat = await fs.stat(file)
    if (stat.size > 2_000_000) continue
    const buf = await fs.readFile(file)
    const text = buf.toString('utf8')
    for (const pat of forbiddenPatterns) {
      if (pat.test(text)) {
        throw new Error(`possible secret/personal token pattern found in ${path.relative(root, file)}: ${pat}`)
      }
    }
  }

  console.log('verify ok')
}

main().catch((err) => {
  console.error(err?.stack || String(err))
  process.exit(1)
})

