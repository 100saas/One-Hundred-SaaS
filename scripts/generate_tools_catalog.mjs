#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const toolsDir = path.join(root, "tools");
const outPath = path.join(root, "docs", "TOOLS.md");

function escapePipe(s) {
  return String(s).replaceAll("|", "\\|");
}

async function readFirstLine(p) {
  const text = await fs.readFile(p, "utf8");
  return (text.split("\n")[0] || "").trim();
}

function parseToolReadmeTitle(line, slug) {
  // Example: "# Recover (Tool 1) — PocketBase instance"
  // Example: "# Action.100SaaS (Meeting Tasks)"
  const m = line.match(/^#\s+(.+?)\s+\(Tool\s+(\d+)\)/i);
  if (m) return { name: m[1].trim(), number: Number(m[2]) };
  const m2 = line.match(/^#\s+(.+?)\s*$/);
  return { name: (m2?.[1] || slug).trim(), number: null };
}

function parseToolNumberFromBody(text) {
  // Example: "**Tool 28**"
  const m = text.match(/\*\*\s*Tool\s+(\d+)\s*\*\*/i);
  if (m) return Number(m[1]);
  // Example: "Tool 28" (fallback)
  const m2 = text.match(/^\s*Tool\s+(\d+)\s*$/im);
  if (m2) return Number(m2[1]);
  return null;
}

async function main() {
  const entries = (await fs.readdir(toolsDir, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const tools = [];
  for (const slug of entries) {
    const readmePath = path.join(toolsDir, slug, "README.md");
    try {
      const full = await fs.readFile(readmePath, "utf8");
      const first = (full.split("\n")[0] || "").trim();
      const { name } = parseToolReadmeTitle(first, slug);
      const number = parseToolNumberFromBody(full);
      tools.push({ slug, name, number });
    } catch {
      tools.push({ slug, name: slug, number: null });
    }
  }

  tools.sort((a, b) => (a.number ?? 9999) - (b.number ?? 9999) || a.slug.localeCompare(b.slug));

  const lines = [];
  lines.push("# Tools");
  lines.push("");
  lines.push(
    "This is the index of tools in this monorepo. Each tool is a PocketBase-first backend (schema + hooks) that you can run locally and self-host."
  );
  lines.push("");
  lines.push("Quickstart:");
  lines.push("");
  lines.push("```bash");
  lines.push("node scripts/pb/run.mjs <toolSlug>");
  lines.push("```");
  lines.push("");
  lines.push("See: `docs/SELF_HOST.md`.");
  lines.push("");
  lines.push("| # | Tool | Slug | Folder | Run |");
  lines.push("|---:|---|---|---|---|");

  for (const t of tools) {
    const n = t.number ?? "";
    const toolCell = escapePipe(t.name);
    const slugCell = "`" + escapePipe(t.slug) + "`";
    const folder = `[\`tools/${t.slug}\`](../tools/${t.slug})`;
    const run = `\`node scripts/pb/run.mjs ${t.slug}\``;
    lines.push(`| ${n} | ${toolCell} | ${slugCell} | ${folder} | ${run} |`);
  }

  lines.push("");
  lines.push("Related:");
  lines.push("");
  lines.push("- Endpoints index: `docs/ENDPOINTS.md`");
  lines.push("- How to contribute: `docs/GETTING_STARTED.md`");
  lines.push("- How we decide what ships: `docs/GOVERNANCE.md`");
  lines.push("");

  await fs.writeFile(outPath, lines.join("\n"), "utf8");
  console.log(`wrote ${path.relative(root, outPath)}`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
