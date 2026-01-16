// Collect.100SaaS (Tool 25) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Shared Kernel: self-serve onboarding + billing + Stripe connect
// - Tool 25: Basic validation for public uploads and request editing

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

function normalizeSlug(v) {
  return clampText(String(v || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""), 64);
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
  return k.handleBillingStatus(c, { toolSlug: "collect" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "collect" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "collect" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "collect" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "collect" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "requests", "uploads"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "collect", toolNumber: 25, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "collect", toolNumber: 25 });
});

// Tool 25: demo seed (owner-only)
routerAdd("POST", "/api/collect/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  function normalizeSlugLocal(v) {
    return k.normalizeSlug(String(v || ""));
  }
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`collect_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const col = $app.dao().findCollectionByNameOrId("requests");
  const rec = new Record(col);
  rec.set("tenant", tenantId);
  rec.set("title", "Please upload your logos");
  rec.set("instructions", "Upload SVG/PNG files. You can add your email if you want a copy of the receipt.");
  rec.set("slug", normalizeSlugLocal(`acme-logos-${k.randCode()}`));
  rec.set("is_active", true);
  $app.dao().saveRecord(rec);

  return c.json(200, { ok: true, requestId: rec.id, slug: rec.getString("slug") });
});

// Public: fetch request by slug (returns request id for upload create)
routerAdd("GET", "/api/collect/public/request", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const slug = k.normalizeSlug(String(c.queryParam("slug") || "").trim());
  if (!slug) return c.json(400, { error: "bad_request", message: "missing_slug" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`collect_public_request:ip:${ip}:slug:${slug}`, now, 240, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let rec = null;
  try {
    rec = $app.dao().findFirstRecordByFilter("requests", "slug = {:s}", { s: slug });
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }
  if (!rec.getBool("is_active")) return c.json(404, { error: "not_found" });
  return c.json(200, { ok: true, request: { id: rec.id, title: rec.getString("title"), instructions: rec.getString("instructions"), slug: rec.getString("slug") } });
});
onRecordBeforeCreateRequest("requests", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("title", clampText(e.record.getString("title"), 140));
  e.record.set("instructions", clampText(e.record.getString("instructions"), 4000));
  e.record.set("slug", normalizeSlug(e.record.getString("slug")));
});

onRecordBeforeUpdateRequest("requests", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("title", clampText(e.record.getString("title"), 140));
  e.record.set("instructions", clampText(e.record.getString("instructions"), 4000));
  e.record.set("slug", normalizeSlug(e.record.getString("slug")));
});

onRecordBeforeCreateRequest("uploads", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function bestEffortClientIpFromContext(httpContext) {
    try {
      const hdr = httpContext?.request?.header;
      if (!hdr) return "";
      const xff = hdr.get("X-Forwarded-For");
      if (xff) return String(xff).split(",")[0].trim().slice(0, 64);
      const realIp = hdr.get("CF-Connecting-IP") || hdr.get("X-Real-IP");
      if (realIp) return String(realIp).trim().slice(0, 64);
    } catch (_) {}
    return "";
  }
  const requestId = e.record.getString("request");
  if (!requestId) throw new BadRequestError("missing_request");
  const email = normalizeEmail(e.record.getString("uploader_email")) || "";
  e.record.set("uploader_email", email);

  // Ensure request is active (best-effort).
  try {
    const req = $app.dao().findRecordById("requests", requestId);
    if (!req.getBool("is_active")) throw new ForbiddenError("request_inactive");
  } catch (err) {
    throw err;
  }

  const ip = bestEffortClientIpFromContext(e.httpContext);
  if (ip) {
    const now = Date.now();
    if (!allowRequest(`collect_upload:ip:${ip}:request:${requestId}`, now, 50, 60 * 60 * 1000)) {
      throw new ForbiddenError("rate_limited");
    }
  }
});
