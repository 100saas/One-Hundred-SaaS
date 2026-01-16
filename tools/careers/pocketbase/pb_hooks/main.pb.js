// Careers.100SaaS (Tool 44) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 44: site/listing validation + public site endpoint

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

function normalizeHexColor(v) {
  const s = String(v || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  return "#0f172a";
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
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "career_sites", "job_listings"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "careers", toolNumber: 44, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "careers", toolNumber: 44 });
});
routerAdd("GET", "/api/careers/site/:slug", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const slug = normalizeSlug(c.pathParam("slug"));
  if (!slug) return c.json(400, { error: "bad_request", message: "missing_slug" });

  try {
    const site = $app.dao().findFirstRecordByFilter("career_sites", "slug = {:s}", { s: slug });
    const listings = $app
      .dao()
      .findRecordsByFilter("job_listings", "site.id = {:sid} && is_active = true", "-created", 200, 0, { sid: site.id });

    return c.json( 200, {
      site: {
        id: site.id,
        title: site.getString("title"),
        brand_color: site.getString("brand_color"),
        slug: site.getString("slug"),
        custom_css: site.getString("custom_css"),
      },
      listings: (listings || []).map((j) => ({
        id: j.id,
        title: j.getString("title"),
        location: j.getString("location"),
        type: j.getString("type"),
        apply_link: j.getString("apply_link"),
      })),
    });
  } catch (_) {
    return c.json( 404, { error: "not_found" });
  }
});

onRecordBeforeCreateRequest("career_sites", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeHexColor(v) {
    const s = String(v || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
    return "#0f172a";
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("title", clampText(e.record.getString("title"), 120));
  e.record.set("brand_color", normalizeHexColor(e.record.getString("brand_color")));
  e.record.set("custom_css", clampText(e.record.getString("custom_css"), 8000));
  e.record.set("slug", normalizeSlug(e.record.getString("slug") || e.record.getString("title")));
});

onRecordBeforeUpdateRequest("career_sites", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeHexColor(v) {
    const s = String(v || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
    return "#0f172a";
  }
  e.record.set("title", clampText(e.record.getString("title"), 120));
  e.record.set("brand_color", normalizeHexColor(e.record.getString("brand_color")));
  e.record.set("custom_css", clampText(e.record.getString("custom_css"), 8000));
  e.record.set("slug", normalizeSlug(e.record.getString("slug") || e.record.getString("title")));
});

onRecordBeforeCreateRequest("job_listings", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const siteId = e.record.getString("site");
  if (siteId) {
    const site = $app.dao().findRecordById("career_sites", siteId);
    const tenantId = site.getString("tenant");
    if (user && tenantId) requireRole(user, tenantId, "admin");
  }
  e.record.set("title", clampText(e.record.getString("title"), 160));
  e.record.set("location", clampText(e.record.getString("location"), 80));
  e.record.set("type", clampEnum(e.record.getString("type"), ["full_time", "contract"], "full_time"));
  e.record.set("apply_link", clampText(e.record.getString("apply_link"), 500));
});

onRecordBeforeUpdateRequest("job_listings", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("title", clampText(e.record.getString("title"), 160));
  e.record.set("location", clampText(e.record.getString("location"), 80));
  e.record.set("type", clampEnum(e.record.getString("type"), ["full_time", "contract"], "full_time"));
  e.record.set("apply_link", clampText(e.record.getString("apply_link"), 500));
});
