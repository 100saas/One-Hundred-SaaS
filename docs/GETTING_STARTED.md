# Getting started (first contribution)

This repo is optimized for building. The fastest path is:

1) Pick a tool you care about
2) Run it locally (PocketBase)
3) Make a small improvement
4) Open a PR

Tool index:
- `docs/TOOLS.md`

## 10‑minute “hello world” PR

1) Pick any tool, e.g. `recover`
2) Run it:

```bash
node scripts/pb/run.mjs recover
```

3) Open the Admin UI: `http://127.0.0.1:8090/_/`
4) Create an admin user
5) Make a tiny doc fix in `tools/recover/README.md`
6) Run the syntax check (quick failure if any hooks/migrations are broken):

```bash
node scripts/check_js_syntax.mjs
```

7) Run the repo verifier:

```bash
node scripts/verify_repo.mjs
```

8) Open a PR

## What to work on

- “Good first issues” (small scoped fixes)
- Tool README improvements (clear problem/solution + schema notes)
- Endpoint hardening (return 4xx/503, avoid 500s)
- Better local-run workflow (scripts/docs)

## Stack standard (important)

When adding UI, use the repo’s default stack:
- `docs/STACK.md`

## Where to ask questions

- Discussions: `https://github.com/100saas/One-Hundred-SaaS/discussions`
