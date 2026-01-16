#!/usr/bin/env node
/**
 * Merge the top-voted PR (by GitHub 👍 reactions) on a schedule.
 *
 * Safety defaults:
 * - Only considers PRs with the label in MERGE_VOTE_LABEL (default: vote-merge)
 * - Refuses PRs that touch sensitive paths unless explicitly allowed
 * - Requires PR to be mergeable and in a clean state
 *
 * Required env:
 * - GITHUB_TOKEN (provided automatically by GitHub Actions)
 */

const owner = process.env.GH_OWNER || "100saas";
const repo = process.env.GH_REPO || "One-Hundred-SaaS";
const token = process.env.GITHUB_TOKEN;
const label = process.env.MERGE_VOTE_LABEL || "vote-merge";
const mergeMethod = process.env.MERGE_METHOD || "squash";
const dryRun = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");

const forbiddenPathPrefixes = [
  ".github/", // protect CI/workflows from vote-merge changes
  "scripts/verify_repo.mjs", // protect secret scanning logic
  "scripts/merge_by_vote.mjs", // protect this merger
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function gh(method, url, body) {
  assert(token, "Missing GITHUB_TOKEN");
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "100saas-merge-by-vote",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

async function listCandidatePRs() {
  // Search issues supports PRs and includes reaction counts.
  const q = encodeURIComponent(`repo:${owner}/${repo} is:pr is:open label:${label}`);
  const url = `https://api.github.com/search/issues?q=${q}&per_page=50`;
  const r = await gh("GET", url);
  if (!r.ok) throw new Error(`search failed: ${r.status} ${JSON.stringify(r.json)}`);
  const items = (r.json?.items || []).filter((it) => it?.pull_request?.url);
  return items.map((it) => ({
    number: it.number,
    title: it.title,
    url: it.html_url,
    updatedAt: it.updated_at,
    reactions: it.reactions || {},
  }));
}

function score(reactions) {
  // Simple: thumbs up minus thumbs down. (Others ignored.)
  const up = Number(reactions["+1"] || 0);
  const down = Number(reactions["-1"] || 0);
  return { up, down, score: up - down };
}

async function getPR(number) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`;
  const r = await gh("GET", url);
  if (!r.ok) throw new Error(`get PR failed: ${r.status} ${JSON.stringify(r.json)}`);
  return r.json;
}

async function listPRFiles(number) {
  const files = [];
  let page = 1;
  while (true) {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files?per_page=100&page=${page}`;
    const r = await gh("GET", url);
    if (!r.ok) throw new Error(`list files failed: ${r.status} ${JSON.stringify(r.json)}`);
    const batch = Array.isArray(r.json) ? r.json : [];
    files.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return files;
}

function touchesForbidden(files) {
  const touched = files.map((f) => String(f.filename || ""));
  const hits = [];
  for (const p of touched) {
    for (const prefix of forbiddenPathPrefixes) {
      if (prefix.endsWith("/") ? p.startsWith(prefix) : p === prefix || p.startsWith(prefix)) {
        hits.push(p);
        break;
      }
    }
  }
  return hits;
}

async function mergePR(number) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/merge`;
  const r = await gh("PUT", url, { merge_method: mergeMethod });
  return r;
}

async function comment(number, body) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${number}/comments`;
  const r = await gh("POST", url, { body });
  return r;
}

async function main() {
  const candidates = await listCandidatePRs();
  if (!candidates.length) {
    console.log(`No PRs with label "${label}"`);
    return;
  }

  const ranked = candidates
    .map((c) => ({ ...c, ...score(c.reactions) }))
    .sort((a, b) => (b.score - a.score) || (b.up - a.up) || String(b.updatedAt).localeCompare(String(a.updatedAt)));

  const top = ranked[0];
  console.log(`Top: #${top.number} score=${top.score} (+${top.up}/-${top.down}) ${top.url}`);
  if (top.up < 1 || top.score < 1) {
    console.log("No eligible PR has enough votes yet (need at least 1 👍 and positive score).");
    return;
  }

  const pr = await getPR(top.number);
  if (pr.draft) {
    console.log("Top PR is draft; skipping.");
    return;
  }

  // Ensure GitHub computed mergeability
  if (pr.mergeable === null) {
    // give GitHub a moment to compute
    await new Promise((r) => setTimeout(r, 2000));
  }

  const pr2 = await getPR(top.number);
  const mergeable = pr2.mergeable === true;
  const state = String(pr2.mergeable_state || "");
  if (!mergeable || state !== "clean") {
    console.log(`Not mergeable: mergeable=${pr2.mergeable} state=${state}`);
    return;
  }

  const files = await listPRFiles(top.number);
  const forbidden = touchesForbidden(files);
  if (forbidden.length) {
    const msg = [
      `Vote-merge blocked: PR touches protected paths.`,
      ``,
      `Blocked files:`,
      ...forbidden.map((f) => `- \`${f}\``),
      ``,
      `If a maintainer wants to allow this, remove/adjust the protection in \`scripts/merge_by_vote.mjs\` and merge manually.`,
    ].join("\n");
    console.log(msg);
    await comment(top.number, msg);
    return;
  }

  if (dryRun) {
    console.log("DRY_RUN=1 set; would merge this PR, but not performing merge.");
    await comment(
      top.number,
      `Merge-by-vote dry run ✅\n\n- Would merge on schedule\n- Score: ${top.score} (👍 ${top.up} / 👎 ${top.down})\n- Method: ${mergeMethod}\n`,
    );
    return;
  }

  const r = await mergePR(top.number);
  if (!r.ok) {
    const msg = `Vote-merge failed for #${top.number}: ${r.status} ${JSON.stringify(r.json)}`;
    console.log(msg);
    await comment(top.number, msg);
    return;
  }

  await comment(
    top.number,
    `Merged by vote ✅\n\n- Score: ${top.score} (👍 ${top.up} / 👎 ${top.down})\n- Method: ${mergeMethod}\n`,
  );
  console.log(`Merged: #${top.number}`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
