// Generated scaffold for Vote.100SaaS (Feature Board) (Tool 11)
//
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 11: Vote counter hooks (increment/decrement on votes create/delete)

const ROLE_ORDER = ["viewer", "member", "admin", "owner"];

function json(c, status, payload) {
  return c.json(status, payload);
}

function clampMin0(n) {
  return n < 0 ? 0 : n;
}

function getEnv(name) {
  const value = $os.getenv(name);
  return value && String(value).trim() ? String(value).trim() : null;
}

function requireRole(user, tenantId, requiredRole) {
  if (!user || !user.id) throw new ForbiddenError("Not authenticated");

  const membership = $app
    .dao()
    .findFirstRecordByFilter(
      "memberships",
      "user.id = {:uid} && tenant.id = {:tid}",
      { uid: user.id, tid: tenantId },
    );

  if (!membership) throw new ForbiddenError("No access to this tenant");

  const role = membership.getString("role");
  if (ROLE_ORDER.indexOf(role) < ROLE_ORDER.indexOf(requiredRole)) {
    throw new ForbiddenError("Insufficient permissions");
  }

  return membership;
}

// Shared Kernel: RevenueCat webhook → entitlements sync
routerAdd("POST", "/api/webhooks/revenuecat", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleRevenueCatWebhook(c);
});
// Shared Kernel: self-serve onboarding + billing + Stripe connect
routerAdd("POST", "/api/onboarding/bootstrap", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleOnboardingBootstrap(c);
});
routerAdd("GET", "/api/billing/status", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingStatus(c, { toolSlug: "vote" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "vote" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "vote" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "vote" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "vote" });
});
// Tool entrypoint stub (health)
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "boards", "posts", "votes"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "vote", toolNumber: 11, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "vote", toolNumber: 11 });
});

// Public: toggle vote for a post on a public board (no PocketBase user required).
//
// Body: { postId: string, user_identifier: string }
routerAdd("POST", "/api/vote/public/toggle", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const body = parsed.value || {};
  const postId = String(body.postId || body.post || "").trim();
  const userIdentifier = String(body.user_identifier || body.userIdentifier || "").trim();
  if (!postId) return c.json(400, { error: "bad_request", message: "missing_post" });
  if (!userIdentifier) return c.json(400, { error: "bad_request", message: "missing_user_identifier" });
  if (userIdentifier.length < 8 || userIdentifier.length > 128) return c.json(400, { error: "bad_request", message: "invalid_user_identifier" });
  if (!/^[a-zA-Z0-9:_-]+$/.test(userIdentifier)) return c.json(400, { error: "bad_request", message: "invalid_user_identifier" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`vote_public_toggle:ip:${ip}:post:${postId}`, now, 60, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  const post = $app.dao().findRecordById("posts", postId);
  const boardId = String(post.getString("board") || "").trim();
  if (!boardId) return c.json(400, { error: "bad_request", message: "post_missing_board" });
  const board = $app.dao().findRecordById("boards", boardId);
  if (!board.getBool("is_public")) return c.json(403, { error: "forbidden", message: "board_not_public" });

  let existing = null;
  try {
    existing = $app.dao().findFirstRecordByFilter("votes", "post.id = {:pid} && user_identifier = {:uid}", { pid: postId, uid: userIdentifier });
  } catch (_) {}

  const pcur = post.getInt("vote_count");
  if (existing && existing.id) {
    try {
      $app.dao().deleteRecord(existing);
    } catch (_) {}
    post.set("vote_count", clampMin0(pcur - 1));
    $app.dao().saveRecord(post);
    return c.json(200, { ok: true, voted: false, post_id: postId, vote_count: post.getInt("vote_count") });
  }

  const vcol = $app.dao().findCollectionByNameOrId("votes");
  const v = new Record(vcol);
  v.set("post", postId);
  v.set("user_identifier", userIdentifier);
  $app.dao().saveRecord(v);
  post.set("vote_count", clampMin0(pcur + 1));
  $app.dao().saveRecord(post);
  return c.json(200, { ok: true, voted: true, post_id: postId, vote_count: post.getInt("vote_count") });
});

// Tool 11: demo seed (owner-only)
routerAdd("POST", "/api/vote/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`vote_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  // Create one board if missing.
  let board = null;
  try {
    const list = $app.dao().findRecordsByFilter("boards", "tenant.id = {:tid}", "-created", 1, 0, { tid: tenantId });
    board = list?.[0] || null;
  } catch (_) {}

  if (!board) {
    const bcol = $app.dao().findCollectionByNameOrId("boards");
    board = new Record(bcol);
    board.set("tenant", tenantId);
    board.set("slug", "feature-requests");
    board.set("is_public", true);
    $app.dao().saveRecord(board);
  }

  // Create a few posts.
  const pcol = $app.dao().findCollectionByNameOrId("posts");
  const titles = ["Add CSV export", "Weekly digest email", "Dark mode"];
  for (let i = 0; i < titles.length; i++) {
    const post = new Record(pcol);
    post.set("board", board.id);
    post.set("title", titles[i]);
    post.set("description", "Seeded demo request.");
    post.set("status", "under_review");
    post.set("vote_count", 0);
    try {
      $app.dao().saveRecord(post);
    } catch (_) {}
  }

  return c.json(200, { ok: true, board_id: board.id });
});
function bumpPostVoteCount(postId, delta) {
  const post = $app.dao().findRecordById("posts", postId);
  const current = post.getInt("vote_count");
  post.set("vote_count", clampMin0(current + delta));
  $app.dao().saveRecord(post);
}

onRecordBeforeCreateRequest("posts", (e) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  if (!user) throw new ForbiddenError("not_authenticated");

  const boardId = String(e.record.getString("board") || "").trim();
  if (!boardId) throw new BadRequestError("missing_board");
  const board = $app.dao().findRecordById("boards", boardId);
  const tenantId = String(board.getString("tenant") || "").trim();
  if (!tenantId) throw new BadRequestError("board_missing_tenant");
  k.requireRole(user, tenantId, "member");
});

onRecordBeforeCreateRequest("votes", (e) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  if (!user) throw new ForbiddenError("not_authenticated");

  const postId = String(e.record.getString("post") || "").trim();
  if (!postId) throw new BadRequestError("missing_post");
  const post = $app.dao().findRecordById("posts", postId);
  const board = $app.dao().findRecordById("boards", post.getString("board"));
  const tenantId = String(board.getString("tenant") || "").trim();
  if (!tenantId) throw new BadRequestError("post_missing_tenant");
  k.requireRole(user, tenantId, "member");

  const uid = String(user.id || "").trim();
  if (!uid) throw new ForbiddenError("not_authenticated");
  e.record.set("user_identifier", uid);
});

onRecordAfterCreateRequest("votes", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function clampMin0(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return x < 0 ? 0 : Math.trunc(x);
  }

  function bumpPostVoteCount(postId, delta) {
    const post = $app.dao().findRecordById("posts", postId);
    const current = post.getInt("vote_count");
    post.set("vote_count", clampMin0(current + delta));
    $app.dao().saveRecord(post);
  }
  try {
    const postId = e.record.getString("post");
    if (!postId) return;
    bumpPostVoteCount(postId, 1);
  } catch (err) {
    $app.logger().warn("Vote increment failed", err);
  }
});

onRecordAfterDeleteRequest("votes", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function clampMin0(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return x < 0 ? 0 : Math.trunc(x);
  }

  function bumpPostVoteCount(postId, delta) {
    const post = $app.dao().findRecordById("posts", postId);
    const current = post.getInt("vote_count");
    post.set("vote_count", clampMin0(current + delta));
    $app.dao().saveRecord(post);
  }
  try {
    const postId = e.record.getString("post");
    if (!postId) return;
    bumpPostVoteCount(postId, -1);
  } catch (err) {
    $app.logger().warn("Vote decrement failed", err);
  }
});
