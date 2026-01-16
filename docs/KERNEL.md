# Kernel (shared backend logic)

The kernel is shared backend code that multiple tools reuse to avoid re‑implementing the same auth/billing/invites/webhook plumbing.

Today it ships as a PocketBase JS hooks module:

- Source: `kernel/pocketbase/_shared/pb_hooks/_shared/kernel.js`

## How tools use it

Each tool’s PocketBase hooks (`tools/<slug>/pocketbase/pb_hooks/main.pb.js`) can `require()` the kernel and delegate endpoints to it:

```js
const k = require(__hooks + "/_shared/kernel.js");
return k.handleInviteCreate(c, { toolSlug: "recover" });
```

## Local testing

Use the local runner:

```bash
node scripts/pb/run.mjs recover
```

It assembles a local runtime folder under `.runtime/<toolSlug>/` and copies the kernel into:

- `.runtime/<toolSlug>/pb_hooks/_shared/kernel.js`

So `require(__hooks + "/_shared/kernel.js")` works exactly like production.

## Design rules (to keep the kernel sane)

- **Backwards compatible** by default: tools shouldn’t break when kernel changes.
- **Safe by default**: if an integration key isn’t set, return a non‑fatal `503 <service>_not_configured`.
- **Tool isolation**: any cross‑tool behavior must be explicit and documented.

