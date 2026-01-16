// Retainer.100SaaS (Tool 30) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 30: Enforce time_entries.tenant matches agreement.tenant; clamp hours/date fields

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

function clampText(v, maxLen) {
  const s = String(v || "");
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function clampNum(v, min, max, fallback) {
  const n = Number(v);
  if (!isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
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
  return k.handleBillingStatus(c, { toolSlug: "retainer" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "retainer" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "retainer" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "retainer" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "retainer" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "agreements", "time_entries"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "retainer", toolNumber: 30, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "retainer", toolNumber: 30 });
});

// Tool 30: demo seed (owner-only)
routerAdd("POST", "/api/retainer/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`retainer_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) {
    return c.json(403, { error: "forbidden", message: "rate_limited" });
  }

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const agreementsCol = $app.dao().findCollectionByNameOrId("agreements");
  const agreement = new Record(agreementsCol);
  agreement.set("tenant", tenantId);
  agreement.set("client_name", "Northwind Co");
  agreement.set("total_hours", 20);
  agreement.set("hourly_rate", 150);
  // For MVP, date fields are optional.
  $app.dao().saveRecord(agreement);

  const entriesCol = $app.dao().findCollectionByNameOrId("time_entries");
  const e1 = new Record(entriesCol);
  e1.set("tenant", tenantId);
  e1.set("agreement", agreement.id);
  e1.set("description", "Did 2h of Design work");
  e1.set("hours", 2);
  e1.set("date", k.toDateOnlyIso(Date.now()));
  $app.dao().saveRecord(e1);

  const e2 = new Record(entriesCol);
  e2.set("tenant", tenantId);
  e2.set("agreement", agreement.id);
  e2.set("description", "Client call");
  e2.set("hours", 1);
  e2.set("date", k.toDateOnlyIso(Date.now() - 24 * 60 * 60 * 1000));
  $app.dao().saveRecord(e2);

  return c.json(200, { ok: true, agreementId: agreement.id });
});
onRecordBeforeCreateRequest("agreements", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("client_name", clampText(e.record.getString("client_name"), 120));
  e.record.set("total_hours", clampNum(e.record.getFloat("total_hours"), 0, 10_000, 0));
  e.record.set("hourly_rate", clampNum(e.record.getFloat("hourly_rate"), 0, 1_000_000, 0));
});

onRecordBeforeCreateRequest("time_entries", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const agreementId = e.record.getString("agreement");
  if (!agreementId) throw new BadRequestError("missing_agreement");

  const agreement = $app.dao().findRecordById("agreements", agreementId);
  const tenantId = agreement.getString("tenant");
  if (!tenantId) throw new BadRequestError("agreement_missing_tenant");
  if (user) requireRole(user, tenantId, "member");

  e.record.set("tenant", tenantId);
  e.record.set("description", clampText(e.record.getString("description"), 400));
  e.record.set("hours", clampNum(e.record.getFloat("hours"), 0, 24, 0));
});

onRecordBeforeUpdateRequest("time_entries", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const agreementId = e.record.getString("agreement");
  if (agreementId) {
    const agreement = $app.dao().findRecordById("agreements", agreementId);
    const tenantId = agreement.getString("tenant");
    if (tenantId) e.record.set("tenant", tenantId);
  }
  e.record.set("description", clampText(e.record.getString("description"), 400));
  e.record.set("hours", clampNum(e.record.getFloat("hours"), 0, 24, 0));
});
