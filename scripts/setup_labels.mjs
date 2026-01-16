import fs from 'node:fs/promises'
import path from 'node:path'

const owner = process.env.GH_OWNER || '100saas'
const repo = process.env.GH_REPO || 'One-Hundred-SaaS'
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN

if (!token) {
  console.error('Missing GITHUB_TOKEN (or GH_TOKEN) in environment')
  process.exit(1)
}

const labelsPath = path.join(process.cwd(), 'scripts', 'labels.json')
const labels = JSON.parse(await fs.readFile(labelsPath, 'utf8'))

async function gh(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  return { ok: res.ok, status: res.status, json }
}

async function listExisting() {
  const url = `https://api.github.com/repos/${owner}/${repo}/labels?per_page=100`
  const r = await gh('GET', url)
  if (!r.ok) throw new Error(`list labels failed: ${r.status} ${JSON.stringify(r.json)}`)
  return r.json
}

async function createOrUpdate(label) {
  const createUrl = `https://api.github.com/repos/${owner}/${repo}/labels`
  const r = await gh('POST', createUrl, label)
  if (r.ok) return { action: 'created', name: label.name }
  if (r.status === 422) {
    const updateUrl = `https://api.github.com/repos/${owner}/${repo}/labels/${encodeURIComponent(label.name)}`
    const u = await gh('PATCH', updateUrl, label)
    if (!u.ok) throw new Error(`update failed: ${u.status} ${JSON.stringify(u.json)}`)
    return { action: 'updated', name: label.name }
  }
  throw new Error(`create failed: ${r.status} ${JSON.stringify(r.json)}`)
}

const existing = await listExisting()
const existingNames = new Set(existing.map((l) => l.name))
console.log(`existing labels: ${existingNames.size}`)

for (const l of labels) {
  const r = await createOrUpdate(l)
  console.log(`${r.action}: ${r.name}`)
}

