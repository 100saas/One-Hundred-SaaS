// Tours.100SaaS (Tool 16) — PocketBase hooks
// Subdomain: tours.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 16: Basic validation for tour steps JSON

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

function normalizeSteps(value) {
  if (!Array.isArray(value)) return [];
  const placements = new Set(["top", "bottom", "left", "right"]);
  const out = [];
  for (const step of value.slice(0, 25)) {
    const selector = String(step?.selector || "").trim().slice(0, 200);
    const content = String(step?.content || "").trim().slice(0, 500);
    const placement = String(step?.placement || "bottom").trim().toLowerCase();
    if (!selector || !content) continue;
    out.push({ selector, content, placement: placements.has(placement) ? placement : "bottom" });
  }
  return out;
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
  return k.handleBillingStatus(c, { toolSlug: "tours" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "tours" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "tours" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "tours" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "tours" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "tours"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "tours", toolNumber: 16, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "tours", toolNumber: 16 });
});

// Tool 16: demo seed (owner-only)
routerAdd("POST", "/api/tours/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`tours_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const col = $app.dao().findCollectionByNameOrId("tours");
  const rec = new Record(col);
  rec.set("tenant", tenantId);
  rec.set("name", "Demo tour");
  rec.set("url_match", "*");
  rec.set("steps", [
    { selector: "body", content: "Welcome! This is a demo tour step.", placement: "bottom" },
  ]);
  $app.dao().saveRecord(rec);

  return c.json(200, { ok: true, tour_id: rec.id });
});

// Public: fetch tour by id (scoped to tenant)
routerAdd("GET", "/api/tours/public/tour", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const tenantId = String(c.queryParam("tenant") || "").trim();
  const tourId = String(c.queryParam("tour") || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  if (!tourId) return c.json(400, { error: "bad_request", message: "missing_tour" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`tours_public_tour:ip:${ip}:tour:${tourId}`, now, 120, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  const tour = $app.dao().findRecordById("tours", tourId);
  if (String(tour.getString("tenant") || "").trim() !== tenantId) return c.json(404, { error: "not_found" });

  return c.json(200, {
    ok: true,
    tour: {
      id: tour.id,
      name: String(tour.getString("name") || ""),
      url_match: String(tour.getString("url_match") || ""),
      steps: k.parseJsonValue(tour.get("steps")) || [],
    },
  });
});
onRecordBeforeCreateRequest("tours", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeSteps(value) {
    if (!Array.isArray(value)) return [];
    const placements = new Set(["top", "bottom", "left", "right"]);
    const out = [];
    for (const step of value.slice(0, 25)) {
      const selector = String(step?.selector || "").trim().slice(0, 200);
      const content = String(step?.content || "").trim().slice(0, 500);
      const placement = String(step?.placement || "bottom").trim().toLowerCase();
      if (!selector || !content) continue;
      out.push({ selector, content, placement: placements.has(placement) ? placement : "bottom" });
    }
    return out;
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("steps", normalizeSteps(e.record.get("steps")));
});

onRecordBeforeUpdateRequest("tours", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeSteps(value) {
    if (!Array.isArray(value)) return [];
    const placements = new Set(["top", "bottom", "left", "right"]);
    const out = [];
    for (const step of value.slice(0, 25)) {
      const selector = String(step?.selector || "").trim().slice(0, 200);
      const content = String(step?.content || "").trim().slice(0, 500);
      const placement = String(step?.placement || "bottom").trim().toLowerCase();
      if (!selector || !content) continue;
      out.push({ selector, content, placement: placements.has(placement) ? placement : "bottom" });
    }
    return out;
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("steps", normalizeSteps(e.record.get("steps")));
});
