// Update.100SaaS (Tool 26) — PocketBase hooks
// Subdomain: update.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Shared Kernel: self-serve onboarding + billing + Stripe connect
// - Tool 26: Generate share_token for projects and validate update types

const ROLE_ORDER = ["viewer", "member", "admin", "owner"];

function json(c, status, payload) {
  return c.json(status, payload);
}

function badRequest(c, message) {
  return c.json( 400, { error: "bad_request", message });
}

function getEnv(name) {
  const value = $os.getenv(name);
  return value && String(value).trim() ? String(value).trim() : null;
}

function requireRole(user, tenantId, requiredRole) {
  if (!user || !user.id) throw new ForbiddenError("Not authenticated");

  const membership = $app
    .dao()
    .findFirstRecordByFilter("memberships", "user.id = {:uid} && tenant.id = {:tid}", {
      uid: user.id,
      tid: tenantId,
    });

  if (!membership) throw new ForbiddenError("No access to this tenant");

  const role = membership.getString("role");
  if (ROLE_ORDER.indexOf(role) < ROLE_ORDER.indexOf(requiredRole)) {
    throw new ForbiddenError("Insufficient permissions");
  }
  return membership;
}

function randToken(prefix) {
  const raw = $security.randomString(28);
  return `${prefix}_${raw}`;
}

function clampEnum(value, allowed, fallback) {
  const v = String(value || "").trim();
  return allowed.includes(v) ? v : fallback;
}

function clampText(v, maxLen) {
  const s = String(v || "");
  return s.length > maxLen ? s.slice(0, maxLen) : s;
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
  return k.handleBillingStatus(c, { toolSlug: "update" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "update" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "update" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "update" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "update" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "projects", "updates"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "update", toolNumber: 26, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "update", toolNumber: 26 });
});

// Tool 26: demo seed (owner-only)
routerAdd("POST", "/api/update/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`update_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const projectsCol = $app.dao().findCollectionByNameOrId("projects");
  const updatesCol = $app.dao().findCollectionByNameOrId("updates");

  const project = new Record(projectsCol);
  project.set("tenant", tenantId);
  project.set("client_name", "Acme Corp");
  project.set("share_token", k.randToken("proj"));
  $app.dao().saveRecord(project);

  const items = [
    { type: "milestone", title: "Phase 1 Complete", body_html: "<p>We shipped the initial version.</p>" },
    { type: "blocker", title: "Waiting on API keys", body_html: "<p>Need Stripe + domain DNS.</p>" },
  ];
  for (const it of items) {
    const rec = new Record(updatesCol);
    rec.set("project", project.id);
    rec.set("type", it.type);
    rec.set("title", it.title);
    rec.set("body_html", it.body_html);
    rec.set("date", new Date().toISOString());
    $app.dao().saveRecord(rec);
  }

  return c.json(200, { ok: true, projectId: project.id, share_token: project.getString("share_token") });
});

// Public: client feed by share token (no auth)
routerAdd("GET", "/api/update/public/feed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const token = String(c.queryParam("token") || "").trim();
  if (!token) return c.json(400, { error: "bad_request", message: "missing_token" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`update_public_feed:ip:${ip}:token:${token}`, now, 240, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let project = null;
  try {
    project = $app.dao().findFirstRecordByFilter("projects", "share_token = {:t}", { t: token });
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }

  let updates = [];
  try {
    updates = $app.dao().findRecordsByFilter("updates", "project = {:pid}", "-date", 500, 0, { pid: project.id });
  } catch (_) {
    updates = [];
  }

  return c.json(200, {
    ok: true,
    project: { id: project.id, client_name: project.getString("client_name"), share_token: project.getString("share_token") },
    updates: updates.map((u) => ({
      id: u.id,
      title: u.getString("title"),
      type: u.getString("type"),
      date: u.getString("date"),
      body_html: u.getString("body_html"),
    })),
  });
});
onRecordBeforeCreateRequest("projects", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  if (!e.record.getString("share_token")) e.record.set("share_token", randToken("proj"));
  e.record.set("client_name", clampText(e.record.getString("client_name"), 120));
});

onRecordBeforeCreateRequest("updates", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const projectId = e.record.getString("project");
  if (!projectId) throw new BadRequestError("missing_project");
  if (user) {
    const project = $app.dao().findRecordById("projects", projectId);
    const tenantId = project.getString("tenant");
    if (tenantId) requireRole(user, tenantId, "admin");
  }
  e.record.set("type", clampEnum(e.record.getString("type"), ["milestone", "update", "blocker"], "update"));
  e.record.set("title", clampText(e.record.getString("title"), 140));
});

onRecordBeforeUpdateRequest("updates", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("type", clampEnum(e.record.getString("type"), ["milestone", "update", "blocker"], "update"));
  e.record.set("title", clampText(e.record.getString("title"), 140));
  e.record.set("body_html", clampText(e.record.getString("body_html"), 50_000));
});
