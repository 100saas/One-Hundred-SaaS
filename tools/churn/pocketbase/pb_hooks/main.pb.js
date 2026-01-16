// Churn.100SaaS (Tool 14) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 14: server-side validation for public survey responses

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

function normalizeReasons(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((x) => x.slice(0, 48));
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
  return k.handleBillingStatus(c, { toolSlug: "churn" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "churn" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "churn" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "churn" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "churn" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "survey_configs", "survey_responses"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "churn", toolNumber: 14, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "churn", toolNumber: 14 });
});

// Tool 14: demo seed (owner-only)
routerAdd("POST", "/api/churn/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`churn_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  // Config (upsert first config).
  const cfgCol = $app.dao().findCollectionByNameOrId("survey_configs");
  let cfg = null;
  try {
    cfg = $app.dao().findFirstRecordByFilter("survey_configs", "tenant.id = {:tid}", { tid: tenantId });
  } catch (_) {}
  if (!cfg) cfg = new Record(cfgCol);
  cfg.set("tenant", tenantId);
  cfg.set("trigger_url_contains", "/cancel");
  cfg.set("reasons", ["Price", "Missing feature", "Bugs", "Other"]);
  $app.dao().saveRecord(cfg);

  // A couple responses.
  const rCol = $app.dao().findCollectionByNameOrId("survey_responses");
  const items = [
    { reason: "Price", comment: "Too expensive for my team size", email: "" },
    { reason: "Missing feature", comment: "Need SSO", email: "" },
  ];
  for (const it of items) {
    const rec = new Record(rCol);
    rec.set("tenant", tenantId);
    rec.set("reason", it.reason);
    rec.set("comment", it.comment);
    rec.set("customer_email", it.email);
    try {
      $app.dao().saveRecord(rec);
    } catch (_) {}
  }

  return c.json(200, { ok: true });
});

// Public: fetch config for a tenant id
routerAdd("GET", "/api/churn/public/config", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const tenantId = String(c.queryParam("id") || c.queryParam("tenant") || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`churn_public_config:ip:${ip}:tenant:${tenantId}`, now, 60, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let cfg = null;
  try {
    cfg = $app.dao().findFirstRecordByFilter("survey_configs", "tenant.id = {:tid}", { tid: tenantId });
  } catch (_) {}
  if (!cfg) return c.json(200, { ok: true, config: null });
  return c.json(200, {
    ok: true,
    config: {
      trigger_url_contains: String(cfg.getString("trigger_url_contains") || ""),
      reasons: k.parseJsonValue(cfg.get("reasons")) || [],
    },
  });
});

// Public: submit response (creates record server-side)
routerAdd("POST", "/api/churn/public/submit", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const body = parsed.value || {};

  const tenantId = String(body.tenant || body.id || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`churn_public_submit:ip:${ip}:tenant:${tenantId}`, now, 10, 10 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  const reason = k.clampText(String(body.reason || ""), 96);
  const comment = k.clampText(String(body.comment || ""), 2000);
  const email = k.normalizeEmail(body.customer_email) || "";

  // If config exists, optionally validate reason against allowed set.
  let allowed = null;
  try {
    const cfg = $app.dao().findFirstRecordByFilter("survey_configs", "tenant.id = {:tid}", { tid: tenantId });
    const list = k.parseJsonValue(cfg.get("reasons"));
    if (Array.isArray(list)) allowed = list.map((v) => String(v));
  } catch (_) {}
  if (Array.isArray(allowed) && allowed.length && reason && !allowed.includes(reason)) {
    return c.json(400, { error: "bad_request", message: "invalid_reason" });
  }

  const col = $app.dao().findCollectionByNameOrId("survey_responses");
  const rec = new Record(col);
  rec.set("tenant", tenantId);
  rec.set("reason", reason);
  rec.set("comment", comment);
  rec.set("customer_email", email);
  $app.dao().saveRecord(rec);

  return c.json(200, { ok: true });
});
onRecordBeforeCreateRequest("survey_responses", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const tenantId = e.record.getString("tenant");
  if (!tenantId) throw new BadRequestError("missing_tenant");

  const reason = String(e.record.getString("reason") || "").trim();
  if (reason.length > 96) e.record.set("reason", reason.slice(0, 96));

  const comment = String(e.record.getString("comment") || "");
  if (comment.length > 2000) e.record.set("comment", comment.slice(0, 2000));

  const email = String(e.record.getString("customer_email") || "").trim();
  if (email.length > 254) e.record.set("customer_email", email.slice(0, 254));
});

onRecordBeforeCreateRequest("survey_configs", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeReasons(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .slice(0, 12)
      .map((x) => x.slice(0, 48));
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("reasons", normalizeReasons(e.record.get("reasons")));
});

onRecordBeforeUpdateRequest("survey_configs", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeReasons(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .slice(0, 12)
      .map((x) => x.slice(0, 48));
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("reasons", normalizeReasons(e.record.get("reasons")));
});
