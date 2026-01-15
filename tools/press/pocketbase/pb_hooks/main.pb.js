// Press.100SaaS (Tool 39) — PocketBase hooks
// Subdomain: press.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 39: kit/asset validation + convenience public JSON endpoints

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

function clampText(v, maxLen) {
  const s = String(v || "");
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function normalizeSlug(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function clampEnum(v, allowed, fallback) {
  const s = String(v || "").trim();
  return allowed.includes(s) ? s : fallback;
}

// Shared Kernel: RevenueCat webhook → entitlements sync
routerAdd("POST", "/api/webhooks/revenuecat", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleRevenueCatWebhook(c);
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "kits", "assets"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "press", toolNumber: 39, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "press", toolNumber: 39 });
});
routerAdd("GET", "/api/press/kits/:slug", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const slug = normalizeSlug(c.pathParam("slug"));
  if (!slug) return c.json(400, { error: "bad_request", message: "missing_slug" });
  try {
    const kit = $app.dao().findFirstRecordByFilter("kits", "slug = {:s}", { s: slug });
    const assets = $app
      .dao()
      .findRecordsByFilter("assets", "kit.id = {:kid}", "-created", 200, 0, { kid: kit.id });
    return c.json( 200, {
      kit: {
        id: kit.id,
        company_name: kit.getString("company_name"),
        boilerplate: kit.getString("boilerplate"),
        slug: kit.getString("slug"),
        brand: kit.get("brand") || {},
      },
      assets: (assets || []).map((a) => ({
        id: a.id,
        type: a.getString("type"),
        label: a.getString("label"),
        file: a.get("file"),
        url: "",
      })),
    });
  } catch (e) {
    return c.json( 404, { error: "not_found" });
  }
});

onRecordBeforeCreateRequest("kits", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "member");
  e.record.set("company_name", clampText(e.record.getString("company_name"), 100));
  e.record.set("boilerplate", clampText(e.record.getString("boilerplate"), 4000));
  e.record.set("slug", normalizeSlug(e.record.getString("slug")));
});

onRecordBeforeUpdateRequest("kits", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("company_name", clampText(e.record.getString("company_name"), 100));
  e.record.set("boilerplate", clampText(e.record.getString("boilerplate"), 4000));
  e.record.set("slug", normalizeSlug(e.record.getString("slug")));
});

onRecordBeforeCreateRequest("assets", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const allowed = ["logo_dark", "logo_light", "photo", "screenshot"];
  e.record.set("type", clampEnum(e.record.getString("type"), allowed, "screenshot"));
  e.record.set("label", clampText(e.record.getString("label"), 80));
});

onRecordBeforeUpdateRequest("assets", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const allowed = ["logo_dark", "logo_light", "photo", "screenshot"];
  e.record.set("type", clampEnum(e.record.getString("type"), allowed, "screenshot"));
  e.record.set("label", clampText(e.record.getString("label"), 80));
});
