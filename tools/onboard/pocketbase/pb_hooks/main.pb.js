// Onboard.100SaaS (Tool 15) — PocketBase hooks
// Subdomain: onboard.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 15: Validation for checklist templates and user progress writes

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

function normalizeTemplateItems(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value.slice(0, 50)) {
    const id = typeof item?.id === "number" ? item.id : null;
    const label = String(item?.label || "").trim().slice(0, 80);
    const url = String(item?.url || "").trim().slice(0, 200);
    if (!id || !label) continue;
    out.push({ id, label, url });
  }
  return out;
}

function normalizeCompletedIds(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const v of value.slice(0, 200)) {
    const n = Number(v);
    if (Number.isFinite(n)) out.push(Math.trunc(n));
  }
  return Array.from(new Set(out));
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
  return k.handleBillingStatus(c, { toolSlug: "onboard" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "onboard" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "onboard" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "onboard" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "onboard" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "checklist_templates", "user_progress"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "onboard", toolNumber: 15, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "onboard", toolNumber: 15 });
});

// Tool 15: demo seed (owner-only)
routerAdd("POST", "/api/onboard/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`onboard_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const col = $app.dao().findCollectionByNameOrId("checklist_templates");
  const rec = new Record(col);
  rec.set("tenant", tenantId);
  rec.set("title", "Getting started");
  rec.set("items", [
    { id: 1, label: "Connect Stripe", url: "/settings" },
    { id: 2, label: "Invite a teammate", url: "/app/home" },
    { id: 3, label: "Create your first project", url: "/dashboard" },
  ]);
  $app.dao().saveRecord(rec);
  return c.json(200, { ok: true, template_id: rec.id });
});

// Public: fetch template (scoped to tenant)
routerAdd("GET", "/api/onboard/public/template", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const tenantId = String(c.queryParam("tenant") || "").trim();
  const templateId = String(c.queryParam("template") || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  if (!templateId) return c.json(400, { error: "bad_request", message: "missing_template" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`onboard_public_template:ip:${ip}:template:${templateId}`, now, 120, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  const tpl = $app.dao().findRecordById("checklist_templates", templateId);
  if (String(tpl.getString("tenant") || "").trim() !== tenantId) return c.json(404, { error: "not_found" });

  return c.json(200, {
    ok: true,
    template: {
      id: tpl.id,
      title: String(tpl.getString("title") || ""),
      items: k.parseJsonValue(tpl.get("items")) || [],
    },
  });
});

// Public: get progress for a (tenant, user)
routerAdd("GET", "/api/onboard/public/progress", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const tenantId = String(c.queryParam("tenant") || "").trim();
  const userId = String(c.queryParam("user") || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  if (!userId) return c.json(400, { error: "bad_request", message: "missing_user" });
  if (userId.length < 8 || userId.length > 128) return c.json(400, { error: "bad_request", message: "invalid_user" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`onboard_public_progress:ip:${ip}:tenant:${tenantId}`, now, 120, 10 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let prog = null;
  try {
    prog = $app
      .dao()
      .findFirstRecordByFilter("user_progress", "tenant.id = {:tid} && end_user_id = {:uid}", { tid: tenantId, uid: userId });
  } catch (_) {}

  return c.json(200, {
    ok: true,
    progress: prog
      ? { id: prog.id, completed_item_ids: k.parseJsonValue(prog.get("completed_item_ids")) || [] }
      : { id: null, completed_item_ids: [] },
  });
});

// Public: upsert progress for a (tenant, user)
routerAdd("POST", "/api/onboard/public/progress", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const body = parsed.value || {};
  const tenantId = String(body.tenant || "").trim();
  const userId = String(body.user || "").trim();
  const completed = body.completed_item_ids;
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  if (!userId) return c.json(400, { error: "bad_request", message: "missing_user" });
  if (userId.length < 8 || userId.length > 128) return c.json(400, { error: "bad_request", message: "invalid_user" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`onboard_public_progress_write:ip:${ip}:tenant:${tenantId}`, now, 60, 10 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  const normalizeCompletedIds = (value) => {
    if (!Array.isArray(value)) return [];
    const out = [];
    for (const v of value.slice(0, 200)) {
      const n = Number(v);
      if (Number.isFinite(n)) out.push(Math.trunc(n));
    }
    return Array.from(new Set(out));
  };

  let prog = null;
  try {
    prog = $app
      .dao()
      .findFirstRecordByFilter("user_progress", "tenant.id = {:tid} && end_user_id = {:uid}", { tid: tenantId, uid: userId });
  } catch (_) {}

  const col = $app.dao().findCollectionByNameOrId("user_progress");
  const rec = prog || new Record(col);
  rec.set("tenant", tenantId);
  rec.set("end_user_id", userId);
  rec.set("completed_item_ids", normalizeCompletedIds(completed));
  $app.dao().saveRecord(rec);

  return c.json(200, { ok: true, progress: { id: rec.id, completed_item_ids: k.parseJsonValue(rec.get("completed_item_ids")) || [] } });
});
onRecordBeforeCreateRequest("checklist_templates", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeTemplateItems(value) {
    if (!Array.isArray(value)) return [];
    const out = [];
    for (const item of value.slice(0, 50)) {
      const id = typeof item?.id === "number" ? item.id : null;
      const label = String(item?.label || "").trim().slice(0, 80);
      const url = String(item?.url || "").trim().slice(0, 200);
      if (!id || !label) continue;
      out.push({ id, label, url });
    }
    return out;
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("items", normalizeTemplateItems(e.record.get("items")));
});

onRecordBeforeUpdateRequest("checklist_templates", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeTemplateItems(value) {
    if (!Array.isArray(value)) return [];
    const out = [];
    for (const item of value.slice(0, 50)) {
      const id = typeof item?.id === "number" ? item.id : null;
      const label = String(item?.label || "").trim().slice(0, 80);
      const url = String(item?.url || "").trim().slice(0, 200);
      if (!id || !label) continue;
      out.push({ id, label, url });
    }
    return out;
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("items", normalizeTemplateItems(e.record.get("items")));
});

onRecordBeforeCreateRequest("user_progress", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeCompletedIds(value) {
    if (!Array.isArray(value)) return [];
    const out = [];
    for (const v of value.slice(0, 200)) {
      const n = Number(v);
      if (Number.isFinite(n)) out.push(Math.trunc(n));
    }
    return Array.from(new Set(out));
  }
  const endUserId = String(e.record.getString("end_user_id") || "").trim();
  if (!endUserId) throw new BadRequestError("missing_end_user_id");
  if (endUserId.length > 128) e.record.set("end_user_id", endUserId.slice(0, 128));
  e.record.set("completed_item_ids", normalizeCompletedIds(e.record.get("completed_item_ids")));
});

onRecordBeforeUpdateRequest("user_progress", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeCompletedIds(value) {
    if (!Array.isArray(value)) return [];
    const out = [];
    for (const v of value.slice(0, 200)) {
      const n = Number(v);
      if (Number.isFinite(n)) out.push(Math.trunc(n));
    }
    return Array.from(new Set(out));
  }
  const endUserId = String(e.record.getString("end_user_id") || "").trim();
  if (!endUserId) throw new BadRequestError("missing_end_user_id");
  if (endUserId.length > 128) e.record.set("end_user_id", endUserId.slice(0, 128));
  e.record.set("completed_item_ids", normalizeCompletedIds(e.record.get("completed_item_ids")));
});
