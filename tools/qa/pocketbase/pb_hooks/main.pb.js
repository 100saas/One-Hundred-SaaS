// QA.100SaaS (Tool 32) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 32: Clamp template items and validate run results map

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

function normalizeItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => clampText(String(x || "").trim(), 120))
    .filter(Boolean)
    .slice(0, 200);
}

function normalizeResults(value, itemCount) {
  const out = {};
  if (!value || typeof value !== "object") return out;
  for (const [k, v] of Object.entries(value)) {
    const idx = Number(k);
    if (!Number.isFinite(idx)) continue;
    if (idx < 0 || idx >= itemCount) continue;
    out[String(Math.trunc(idx))] = !!v;
  }
  return out;
}

function computeStatus(results, itemCount) {
  if (!itemCount) return "in_progress";
  const vals = Object.values(results || {});
  if (vals.length < itemCount) return "in_progress";
  return vals.every(Boolean) ? "passed" : "failed";
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
  return k.handleBillingStatus(c, { toolSlug: "qa" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "qa" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "qa" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "qa" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "qa" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "qa_templates", "qa_runs"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "qa", toolNumber: 32, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "qa", toolNumber: 32 });
});

// Tool 32: demo seed (owner-only)
routerAdd("POST", "/api/qa/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`qa_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) {
    return c.json(403, { error: "forbidden", message: "rate_limited" });
  }

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const tmplCol = $app.dao().findCollectionByNameOrId("qa_templates");
  const tmpl = new Record(tmplCol);
  tmpl.set("tenant", tenantId);
  tmpl.set("name", "Launch QA Checklist");
  tmpl.set("items", ["H1 tag exists", "Meta Description set", "Favicon loads"]);
  $app.dao().saveRecord(tmpl);

  const runCol = $app.dao().findCollectionByNameOrId("qa_runs");
  const run = new Record(runCol);
  run.set("tenant", tenantId);
  run.set("template", tmpl.id);
  run.set("target_url", "https://example.com");
  run.set("status", "in_progress");
  run.set("results", {});
  $app.dao().saveRecord(run);

  return c.json(200, { ok: true, templateId: tmpl.id, runId: run.id });
});
onRecordBeforeCreateRequest("qa_templates", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeItems(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((x) => clampText(String(x || "").trim(), 120))
      .filter(Boolean)
      .slice(0, 200);
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("name", clampText(e.record.getString("name"), 80));
  e.record.set("items", normalizeItems(e.record.get("items")));
});

onRecordBeforeUpdateRequest("qa_templates", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeItems(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((x) => clampText(String(x || "").trim(), 120))
      .filter(Boolean)
      .slice(0, 200);
  }
  e.record.set("name", clampText(e.record.getString("name"), 80));
  e.record.set("items", normalizeItems(e.record.get("items")));
});

onRecordBeforeCreateRequest("qa_runs", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeResults(value, itemCount) {
    const out = {};
    if (!value || typeof value !== "object") return out;
    for (const [k, v] of Object.entries(value)) {
      const idx = Number(k);
      if (!Number.isFinite(idx)) continue;
      if (idx < 0 || idx >= itemCount) continue;
      out[String(Math.trunc(idx))] = !!v;
    }
    return out;
  }

  function computeStatus(results, itemCount) {
    if (!itemCount) return "in_progress";
    const vals = Object.values(results || {});
    if (vals.length < itemCount) return "in_progress";
    return vals.every(Boolean) ? "passed" : "failed";
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "member");

  const tplId = e.record.getString("template");
  if (!tplId) throw new BadRequestError("missing_template");
  const tpl = $app.dao().findRecordById("qa_templates", tplId);
  const items = tpl.get("items") || [];
  const itemCount = Array.isArray(items) ? items.length : 0;
  const results = normalizeResults(e.record.get("results"), itemCount);
  e.record.set("results", results);
  e.record.set("status", computeStatus(results, itemCount));
});

onRecordBeforeUpdateRequest("qa_runs", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeResults(value, itemCount) {
    const out = {};
    if (!value || typeof value !== "object") return out;
    for (const [k, v] of Object.entries(value)) {
      const idx = Number(k);
      if (!Number.isFinite(idx)) continue;
      if (idx < 0 || idx >= itemCount) continue;
      out[String(Math.trunc(idx))] = !!v;
    }
    return out;
  }

  function computeStatus(results, itemCount) {
    if (!itemCount) return "in_progress";
    const vals = Object.values(results || {});
    if (vals.length < itemCount) return "in_progress";
    return vals.every(Boolean) ? "passed" : "failed";
  }
  const tplId = e.record.getString("template");
  const tpl = tplId ? $app.dao().findRecordById("qa_templates", tplId) : null;
  const items = tpl ? tpl.get("items") : [];
  const itemCount = Array.isArray(items) ? items.length : 0;
  const results = normalizeResults(e.record.get("results"), itemCount);
  e.record.set("results", results);
  e.record.set("status", computeStatus(results, itemCount));
});
