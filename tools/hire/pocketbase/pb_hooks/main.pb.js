// Hire.100SaaS (Tool 42) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 42: job slug normalization + applicant validation + stage enforcement

const ROLE_ORDER = ["viewer", "member", "admin", "owner"];

function json(c, status, payload) {
  return c.json(status, payload);
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

function badRequest(c, message) {
  return c.json( 400, { error: "bad_request", message });
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
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "jobs", "applicants"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "hire", toolNumber: 42, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "hire", toolNumber: 42 });
});
routerAdd("GET", "/api/hire/jobs/:tenantSlug", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const tenantSlug = String(c.pathParam("tenantSlug") || "").trim();
  if (!tenantSlug) return c.json(400, { error: "bad_request", message: "missing_tenant_slug" });

  try {
    const tenant = $app.dao().findFirstRecordByData("tenants", "slug", tenantSlug);
    const jobs = $app
      .dao()
      .findRecordsByFilter("jobs", "tenant.id = {:tid} && status = 'published'", "-created", 100, 0, { tid: tenant.id });
    return c.json( 200, {
      tenant: { id: tenant.id, slug: tenant.getString("slug"), name: tenant.getString("name") },
      jobs: (jobs || []).map((j) => ({ id: j.id, title: j.getString("title"), slug: j.getString("slug") })),
    });
  } catch (_) {
    return c.json( 404, { error: "not_found" });
  }
});

onRecordBeforeCreateRequest("jobs", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");

  e.record.set("title", clampText(e.record.getString("title"), 160));
  e.record.set("description_html", clampText(e.record.getString("description_html"), 60000));
  e.record.set("status", clampEnum(e.record.getString("status"), ["draft", "published", "closed"], "draft"));
  e.record.set("slug", normalizeSlug(e.record.getString("slug") || e.record.getString("title")));
});

onRecordBeforeUpdateRequest("jobs", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("title", clampText(e.record.getString("title"), 160));
  e.record.set("description_html", clampText(e.record.getString("description_html"), 60000));
  e.record.set("status", clampEnum(e.record.getString("status"), ["draft", "published", "closed"], "draft"));
  e.record.set("slug", normalizeSlug(e.record.getString("slug") || e.record.getString("title")));
});

onRecordBeforeCreateRequest("applicants", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const jobId = e.record.getString("job");
  if (!jobId) throw new BadRequestError("missing_job");
  const job = $app.dao().findRecordById("jobs", jobId);
  const tenantId = job.getString("tenant");
  // Public create is allowed by schema, but we still validate payload strictly.
  e.record.set("name", clampText(e.record.getString("name"), 120));
  e.record.set("email", clampText(e.record.getString("email"), 200));
  e.record.set("stage", clampEnum(e.record.getString("stage"), ["applied", "screening", "interview", "offer", "rejected"], "applied"));
  // Prevent applying to closed jobs.
  const status = String(job.getString("status") || "").trim();
  if (status !== "published") throw new ForbiddenError("job_not_open");

  // Optional integration hook target: when stage becomes interview, another tool can create scorecards.
});

onRecordBeforeUpdateRequest("applicants", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("name", clampText(e.record.getString("name"), 120));
  e.record.set("email", clampText(e.record.getString("email"), 200));
  e.record.set("stage", clampEnum(e.record.getString("stage"), ["applied", "screening", "interview", "offer", "rejected"], e.record.getString("stage")));
});
