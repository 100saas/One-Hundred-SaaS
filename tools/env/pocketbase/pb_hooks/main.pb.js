// Env.100SaaS (Tool 47) — PocketBase hooks
// Subdomain: env.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 47: validate rotation metadata + overdue alert cron (email stub)

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

function normalizeKeyName(v) {
  return String(v || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

function clampIntervalDays(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 90;
  if (n > 3650) return 3650;
  return Math.round(n);
}

function isOverdue(lastRotatedIso, intervalDays, nowMs) {
  const lastMs = Date.parse(String(lastRotatedIso || ""));
  if (!Number.isFinite(lastMs)) return true;
  const dueMs = lastMs + clampIntervalDays(intervalDays) * 24 * 60 * 60 * 1000;
  return nowMs > dueMs;
}

// Shared Kernel: RevenueCat webhook → entitlements sync
routerAdd("POST", "/api/webhooks/revenuecat", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleRevenueCatWebhook(c);
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "environments", "secret_specs"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "env", toolNumber: 47, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "env", toolNumber: 47 });
});
routerAdd("POST", "/api/env/mark-rotated/:specId", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent, getAuthRecord } = require(__hooks + "/_shared/kernel.js");
  const user = getAuthRecord(c);
  const specId = String(c.pathParam("specId") || "").trim();
  if (!specId) return c.json(400, { error: "bad_request", message: "missing_spec_id" });
  let spec;
  try {
    spec = $app.dao().findRecordById("secret_specs", specId);
  } catch (_) {
    return c.json( 404, { error: "not_found" });
  }

  const envId = spec.getString("environment");
  const envRec = $app.dao().findRecordById("environments", envId);
  const tenantId = envRec.getString("tenant");
  requireRole(user, tenantId, "member");

  spec.set("last_rotated", new Date().toISOString());
  $app.dao().saveRecord(spec);
  return c.json( 200, { status: "rotated", id: spec.id });
});

cronAdd("env_rotation_daily", "0 9 * * *", function () {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const now = Date.now();
  try {
    const specs = $app.dao().findRecordsByFilter("secret_specs", "id != ''", "-created", 2000, 0, {});
    for (const spec of specs || []) {
      const envId = spec.getString("environment");
      let envRec;
      try {
        envRec = $app.dao().findRecordById("environments", envId);
      } catch (_) {
        continue;
      }
      const tenantId = envRec.getString("tenant");
      const ownerId = spec.getString("owner");
      const overdue = isOverdue(spec.getString("last_rotated"), spec.getInt("rotation_interval_days"), now);
      if (!overdue) continue;

      // MVP: log-only (email integration intentionally out-of-scope to avoid deliverability)
      $app.logger().warn("secret rotation overdue", {
        tenant: tenantId,
        environment: envRec.getString("name"),
        key: spec.getString("key_name"),
        owner: ownerId,
      });
    }
  } catch (e) {
    $app.logger().error("env alert cron failed", e);
  }
});

onRecordBeforeCreateRequest("environments", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("name", clampText(e.record.getString("name"), 80));
});

onRecordBeforeUpdateRequest("environments", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("name", clampText(e.record.getString("name"), 80));
});

onRecordBeforeCreateRequest("secret_specs", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const envId = e.record.getString("environment");
  if (!envId) throw new BadRequestError("missing_environment");
  const envRec = $app.dao().findRecordById("environments", envId);
  const tenantId = envRec.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");

  e.record.set("key_name", normalizeKeyName(e.record.getString("key_name")));
  e.record.set("location", clampText(e.record.getString("location"), 200));
  e.record.set("rotation_interval_days", clampIntervalDays(e.record.getInt("rotation_interval_days")));
});

onRecordBeforeUpdateRequest("secret_specs", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("key_name", normalizeKeyName(e.record.getString("key_name")));
  e.record.set("location", clampText(e.record.getString("location"), 200));
  e.record.set("rotation_interval_days", clampIntervalDays(e.record.getInt("rotation_interval_days")));
});
