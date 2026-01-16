// SOP.100SaaS (Tool 23) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Shared Kernel: self-serve onboarding + billing + Stripe connect
// - Tool 23: Step ordering normalization and type validation

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

function clampEnum(value, allowed, fallback) {
  const v = String(value || "").trim();
  return allowed.includes(v) ? v : fallback;
}

function normalizeTags(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, 15)
    .map((x) => x.slice(0, 32));
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
  return k.handleBillingStatus(c, { toolSlug: "sop" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "sop" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "sop" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "sop" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "sop" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "procedures", "procedure_steps"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "sop", toolNumber: 23, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "sop", toolNumber: 23 });
});

// Tool 23: demo seed (owner-only)
routerAdd("POST", "/api/sop/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`sop_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const procCol = $app.dao().findCollectionByNameOrId("procedures");
  const stepCol = $app.dao().findCollectionByNameOrId("procedure_steps");

  const proc = new Record(procCol);
  proc.set("tenant", tenantId);
  proc.set("title", "Weekly Ops Review");
  proc.set("description", "A simple step-by-step SOP to run each week.");
  proc.set("tags", ["ops", "weekly"]);
  $app.dao().saveRecord(proc);

  const steps = [
    { order: 0, type: "info", text: "Open the dashboard and review KPIs." },
    { order: 1, type: "action", text: "Check outstanding support tickets and SLAs." },
    { order: 2, type: "warning", text: "If a KPI drops > 20%, create an incident note immediately." },
  ];
  for (const s of steps) {
    const rec = new Record(stepCol);
    rec.set("procedure", proc.id);
    rec.set("order", s.order);
    rec.set("type", s.type);
    rec.set("text", s.text);
    $app.dao().saveRecord(rec);
  }

  return c.json(200, { ok: true, procedureId: proc.id });
});
onRecordBeforeCreateRequest("procedures", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "member");
  e.record.set("title", String(e.record.getString("title") || "").slice(0, 140));
  e.record.set("description", String(e.record.getString("description") || "").slice(0, 1000));
  e.record.set("tags", normalizeTags(e.record.get("tags")));
});

onRecordBeforeUpdateRequest("procedures", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "member");
  e.record.set("title", String(e.record.getString("title") || "").slice(0, 140));
  e.record.set("description", String(e.record.getString("description") || "").slice(0, 1000));
  e.record.set("tags", normalizeTags(e.record.get("tags")));
});

onRecordBeforeCreateRequest("procedure_steps", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const procedureId = e.record.getString("procedure");
  if (!procedureId) throw new BadRequestError("missing_procedure");
  if (user) {
    const proc = $app.dao().findRecordById("procedures", procedureId);
    const tenantId = proc.getString("tenant");
    if (tenantId) requireRole(user, tenantId, "member");
  }
  e.record.set("type", clampEnum(e.record.getString("type"), ["action", "info", "warning"], "action"));
  const order = e.record.getInt("order");
  e.record.set("order", order < 0 ? 0 : order);
  e.record.set("text", String(e.record.getString("text") || "").slice(0, 2000));
});

onRecordBeforeUpdateRequest("procedure_steps", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const procedureId = e.record.getString("procedure");
  if (user && procedureId) {
    const proc = $app.dao().findRecordById("procedures", procedureId);
    const tenantId = proc.getString("tenant");
    if (tenantId) requireRole(user, tenantId, "member");
  }
  e.record.set("type", clampEnum(e.record.getString("type"), ["action", "info", "warning"], "action"));
  const order = e.record.getInt("order");
  e.record.set("order", order < 0 ? 0 : order);
  e.record.set("text", String(e.record.getString("text") || "").slice(0, 2000));
});
