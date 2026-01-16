import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'

function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--port') args.port = Number(argv[++i] || 0)
    else if (a === '--host') args.host = String(argv[++i] || '')
    else if (a === '--pb-version') args.pbVersion = String(argv[++i] || '')
    else if (a === '--help' || a === '-h') args.help = true
    else args._.push(a)
  }
  return args
}

function usage() {
  return `Usage:
  node scripts/pb/run.mjs <toolSlug> [--port 8090] [--host 127.0.0.1] [--pb-version <version>]

Example:
  node scripts/pb/run.mjs recover --port 8090
`
}

async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const e of entries) {
    const s = path.join(src, e.name)
    const d = path.join(dst, e.name)
    if (e.isDirectory()) await copyDir(s, d)
    else await fs.copyFile(s, d)
  }
}

function platformInfo() {
  const p = os.platform()
  const a = os.arch()
  if (p === 'darwin' && a === 'arm64') return { platform: 'darwin', arch: 'arm64' }
  if (p === 'darwin' && a === 'x64') return { platform: 'darwin', arch: 'amd64' }
  if (p === 'linux' && a === 'arm64') return { platform: 'linux', arch: 'arm64' }
  if (p === 'linux' && a === 'x64') return { platform: 'linux', arch: 'amd64' }
  throw new Error(`Unsupported platform/arch: ${p}/${a}`)
}

function pocketbaseDownloadUrl(version) {
  const { platform, arch } = platformInfo()
  // PocketBase release asset naming convention.
  // Example: pocketbase_0.22.23_darwin_arm64.zip
  return `https://github.com/pocketbase/pocketbase/releases/download/v${version}/pocketbase_${version}_${platform}_${arch}.zip`
}

async function downloadPocketBase(version, binDir) {
  const url = pocketbaseDownloadUrl(version)
  const zipPath = path.join(binDir, `pocketbase_${version}.zip`)
  const pbPath = path.join(binDir, os.platform() === 'win32' ? 'pocketbase.exe' : 'pocketbase')

  if (await exists(pbPath)) return pbPath

  await fs.mkdir(binDir, { recursive: true })

  const isMac = os.platform() === 'darwin'
  const isLinux = os.platform() === 'linux'
  function installHint(cmd) {
    if (cmd !== 'curl' && cmd !== 'unzip') return ''
    if (isMac) return 'Try: brew install curl unzip'
    if (isLinux) return 'Try: sudo apt-get update && sudo apt-get install -y curl unzip'
    return 'Install it and retry.'
  }

  // Use system curl + unzip to avoid extra deps.
  // Fail early with a helpful message if they aren't available.
  for (const cmd of ['curl', 'unzip']) {
    await new Promise((resolve, reject) => {
      const p = spawn(cmd, ['--version'], { stdio: 'ignore' })
      p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Missing dependency: ${cmd}. ${installHint(cmd)}`))))
    }).catch((e) => {
      throw new Error(String(e.message || e))
    })
  }

  await new Promise((resolve, reject) => {
    const p = spawn('curl', ['-fsSL', url, '-o', zipPath], { stdio: 'inherit' })
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`curl failed (${code})`))))
  })

  await new Promise((resolve, reject) => {
    const p = spawn('unzip', ['-o', zipPath, '-d', binDir], { stdio: 'inherit' })
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`unzip failed (${code})`))))
  })

  await fs.chmod(pbPath, 0o755).catch(() => {})
  return pbPath
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(usage())
    process.exit(0)
  }

  const toolSlug = String(args._[0] || '').trim()
  if (!toolSlug) throw new Error(`Missing toolSlug\n\n${usage()}`)

  const port = Number(args.port || 8090)
  const host = String(args.host || '127.0.0.1')
  const pbVersion = String(args.pbVersion || '0.22.23')

  const repoRoot = process.cwd()
  const toolRoot = path.join(repoRoot, 'tools', toolSlug, 'pocketbase')
  const kernelSrc = path.join(repoRoot, 'kernel', 'pocketbase', '_shared', 'pb_hooks', '_shared', 'kernel.js')

  if (!(await exists(toolRoot))) throw new Error(`Unknown tool: ${toolSlug} (missing ${toolRoot})`)

  const runtimeRoot = path.join(repoRoot, '.runtime', toolSlug)
  const hooksDst = path.join(runtimeRoot, 'pb_hooks')
  const migrationsDst = path.join(runtimeRoot, 'pb_migrations')

  await fs.mkdir(runtimeRoot, { recursive: true })
  await fs.rm?.(hooksDst, { recursive: true, force: true }).catch(() => {}) // best-effort; may be unavailable on older nodes
  await fs.rm?.(migrationsDst, { recursive: true, force: true }).catch(() => {})

  await copyDir(path.join(toolRoot, 'pb_hooks'), hooksDst)
  await copyDir(path.join(toolRoot, 'pb_migrations'), migrationsDst)

  const sharedDstDir = path.join(hooksDst, '_shared')
  await fs.mkdir(sharedDstDir, { recursive: true })
  await fs.copyFile(kernelSrc, path.join(sharedDstDir, 'kernel.js'))

  const cacheDir = path.join(repoRoot, '.cache', 'pocketbase', pbVersion)
  const pbPath = await downloadPocketBase(pbVersion, cacheDir)

  console.log(`\nStarting PocketBase for ${toolSlug}`)
  console.log(`- runtime: ${runtimeRoot}`)
  console.log(`- admin:   http://${host}:${port}/_/`)
  console.log(`- api:     http://${host}:${port}/api/\n`)

  const child = spawn(pbPath, ['serve', '--http', `${host}:${port}`], {
    cwd: runtimeRoot,
    stdio: 'inherit',
    env: process.env,
  })
  child.on('exit', (code) => process.exit(code ?? 0))
}

main().catch((err) => {
  console.error(err?.stack || String(err))
  process.exit(1)
})
