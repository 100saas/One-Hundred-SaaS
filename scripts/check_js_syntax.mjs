#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();

async function listFiles(dir) {
  const out = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (const it of items) {
    if (it.name === ".git") continue;
    if (it.name === "node_modules") continue;
    if (it.name === "pb_data") continue;
    if (it.name === ".runtime") continue;
    if (it.name === ".cache") continue;
    const full = path.join(dir, it.name);
    if (it.isDirectory()) out.push(...(await listFiles(full)));
    else out.push(full);
  }
  return out;
}

function isTargetFile(p) {
  const rel = path.relative(root, p).replaceAll("\\", "/");
  if (!rel.startsWith("tools/")) return false;
  if (!rel.endsWith(".js")) return false;
  if (rel.includes("/pb_hooks/") && rel.endsWith("/main.pb.js")) return true;
  if (rel.includes("/pb_migrations/")) return true;
  return false;
}

async function main() {
  const files = (await listFiles(root)).filter(isTargetFile).sort();
  if (files.length === 0) {
    console.log("no files to check");
    return;
  }

  const failures = [];
  for (const file of files) {
    const rel = path.relative(root, file).replaceAll("\\", "/");
    const code = await fs.readFile(file, "utf8");
    try {
      new vm.Script(code, { filename: rel });
    } catch (err) {
      failures.push({ file: rel, error: String(err?.message || err) });
    }
  }

  if (failures.length) {
    console.error("syntax check failed:");
    for (const f of failures.slice(0, 20)) {
      console.error(`- ${f.file}: ${f.error}`);
    }
    if (failures.length > 20) console.error(`(+${failures.length - 20} more)`);
    process.exit(1);
  }

  console.log(`syntax ok (${files.length} files)`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

