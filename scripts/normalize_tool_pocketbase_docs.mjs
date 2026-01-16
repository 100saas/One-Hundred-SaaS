#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const toolsDir = path.join(repoRoot, "tools");

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function normalizeReadme(contents) {
  const lines = contents.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Drop any "Subdomain:" line (we don't promise hosting here).
    if (/^\s*Subdomain:\s*`?.+`?\s*$/.test(line)) continue;

    // Drop internal repo references.
    if (line.includes("NEW_PRD/01_50_BATCH.md")) continue;

    // Replace "generated scaffolding" phrasing with neutral wording.
    if (line.toLowerCase().includes("generated scaffolding")) {
      out.push(
        "This folder contains the PocketBase backend bits (schema + hooks) for this tool."
      );
      continue;
    }

    out.push(line);
  }

  // Remove double-blank lines introduced by deletions.
  const compact = [];
  for (const line of out) {
    const prev = compact[compact.length - 1] ?? "";
    if (line.trim() === "" && prev.trim() === "") continue;
    compact.push(line);
  }

  return compact.join("\n").replace(/\s+$/g, "").trimEnd() + "\n";
}

function normalizeHook(contents) {
  const lines = contents.split("\n");
  const out = [];
  for (const line of lines) {
    if (/^\s*\/\/\s*Subdomain:\s*/.test(line)) continue;
    if (line.includes("NEW_PRD/")) continue;
    out.push(line);
  }
  return out.join("\n").replace(/\s+$/g, "").trimEnd() + "\n";
}

function normalizeSchema(contents) {
  const lines = contents.split("\n");
  const out = [];
  for (const line of lines) {
    if (line.includes("NEW_PRD/")) continue;
    out.push(line);
  }

  const compact = [];
  for (const line of out) {
    const prev = compact[compact.length - 1] ?? "";
    if (line.trim() === "" && prev.trim() === "") continue;
    compact.push(line);
  }

  return compact.join("\n").replace(/\s+$/g, "").trimEnd() + "\n";
}

function normalizeMigration(contents) {
  const lines = contents.split("\n");
  const out = [];
  for (const line of lines) {
    if (line.includes("NEW_PRD/")) {
      if (line.trim().startsWith("//") && line.toLowerCase().includes("auto-generated")) {
        out.push("// Auto-generated. Do not edit by hand.");
      }
      continue;
    }
    out.push(line);
  }
  return out.join("\n").replace(/\s+$/g, "").trimEnd() + "\n";
}

async function main() {
  const toolSlugs = (await fs.readdir(toolsDir, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  let touched = 0;

  for (const slug of toolSlugs) {
    const pbDir = path.join(toolsDir, slug, "pocketbase");
    if (!(await fileExists(pbDir))) continue;

    const pbReadme = path.join(pbDir, "README.md");
    if (await fileExists(pbReadme)) {
      const before = await fs.readFile(pbReadme, "utf8");
      const after = normalizeReadme(before);
      if (after !== before) {
        await fs.writeFile(pbReadme, after, "utf8");
        touched++;
      }
    }

    const pbHook = path.join(pbDir, "pb_hooks", "main.pb.js");
    if (await fileExists(pbHook)) {
      const before = await fs.readFile(pbHook, "utf8");
      const after = normalizeHook(before);
      if (after !== before) {
        await fs.writeFile(pbHook, after, "utf8");
        touched++;
      }
    }

    const pbSchema = path.join(pbDir, "SCHEMA.md");
    if (await fileExists(pbSchema)) {
      const before = await fs.readFile(pbSchema, "utf8");
      const after = normalizeSchema(before);
      if (after !== before) {
        await fs.writeFile(pbSchema, after, "utf8");
        touched++;
      }
    }

    const pbMigrationsDir = path.join(pbDir, "pb_migrations");
    if (await fileExists(pbMigrationsDir)) {
      const entries = await fs.readdir(pbMigrationsDir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isFile() || !e.name.endsWith(".js")) continue;
        const migPath = path.join(pbMigrationsDir, e.name);
        const before = await fs.readFile(migPath, "utf8");
        const after = normalizeMigration(before);
        if (after !== before) {
          await fs.writeFile(migPath, after, "utf8");
          touched++;
        }
      }
    }
  }

  console.log(`Normalized ${touched} file(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
