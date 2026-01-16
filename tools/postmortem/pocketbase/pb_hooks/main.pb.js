// Postmortem.100SaaS (Tool 49) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 49: report endpoint + basic validation and author enforcement

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
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "postmortems", "pm_actions", "pm_timeline"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "postmortem", toolNumber: 49, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "postmortem", toolNumber: 49 });
});
routerAdd("GET", "/api/postmortem/report/:id", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent, getAuthRecord } = require(__hooks + "/_shared/kernel.js");
  const user = getAuthRecord(c);
  const id = String(c.pathParam("id") || "").trim();
  if (!id) return c.json(400, { error: "bad_request", message: "missing_id" });

  let pm;
  try {
    pm = $app.dao().findRecordById("postmortems", id);
  } catch (_) {
    return c.json( 404, { error: "not_found" });
  }

  const tenantId = pm.getString("tenant");
  requireRole(user, tenantId, "member");

  const timeline = $app
    .dao()
    .findRecordsByFilter("pm_timeline", "postmortem.id = {:pid}", "timestamp", 500, 0, { pid: id });
  const actions = $app
    .dao()
    .findRecordsByFilter("pm_actions", "postmortem.id = {:pid}", "-created", 500, 0, { pid: id });

  return c.json( 200, {
    postmortem: {
      id: pm.id,
      title: pm.getString("title"),
      incident_date: pm.getString("incident_date"),
      summary: pm.getString("summary"),
      root_cause: pm.getString("root_cause"),
      status: pm.getString("status"),
      authors: pm.get("authors") || [],
    },
    timeline: (timeline || []).map((t) => ({
      id: t.id,
      timestamp: t.getString("timestamp"),
      type: t.getString("type"),
      description: t.getString("description"),
    })),
    actions: (actions || []).map((a) => ({
      id: a.id,
      task: a.getString("task"),
      owner: a.getString("owner"),
      status: a.getString("status"),
    })),
  });
});

onRecordBeforeCreateRequest("postmortems", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "member");

  e.record.set("title", clampText(e.record.getString("title"), 160));
  e.record.set("summary", clampText(e.record.getString("summary"), 6000));
  e.record.set("root_cause", clampText(e.record.getString("root_cause"), 8000));
  e.record.set("status", clampEnum(e.record.getString("status"), ["draft", "review", "published"], "draft"));

  const authors = e.record.get("authors");
  const next = Array.isArray(authors) ? authors.slice() : [];
  if (user && !next.includes(user.id)) next.push(user.id);
  e.record.set("authors", next);
});

onRecordBeforeUpdateRequest("postmortems", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("title", clampText(e.record.getString("title"), 160));
  e.record.set("summary", clampText(e.record.getString("summary"), 6000));
  e.record.set("root_cause", clampText(e.record.getString("root_cause"), 8000));
  e.record.set("status", clampEnum(e.record.getString("status"), ["draft", "review", "published"], e.record.getString("status")));
});

onRecordBeforeCreateRequest("pm_timeline", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const pmId = e.record.getString("postmortem");
  if (!pmId) throw new BadRequestError("missing_postmortem");
  const pm = $app.dao().findRecordById("postmortems", pmId);
  const tenantId = pm.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "member");

  e.record.set("description", clampText(e.record.getString("description"), 2000));
  e.record.set("type", clampEnum(e.record.getString("type"), ["detection", "diagnosis", "repair", "recovery"], "diagnosis"));
});

onRecordBeforeUpdateRequest("pm_timeline", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("description", clampText(e.record.getString("description"), 2000));
  e.record.set("type", clampEnum(e.record.getString("type"), ["detection", "diagnosis", "repair", "recovery"], e.record.getString("type")));
});

onRecordBeforeCreateRequest("pm_actions", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const pmId = e.record.getString("postmortem");
  if (!pmId) throw new BadRequestError("missing_postmortem");
  const pm = $app.dao().findRecordById("postmortems", pmId);
  const tenantId = pm.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "member");

  e.record.set("task", clampText(e.record.getString("task"), 500));
  e.record.set("owner", clampText(e.record.getString("owner"), 120));
  e.record.set("status", clampEnum(e.record.getString("status"), ["open", "done"], "open"));
});

onRecordBeforeUpdateRequest("pm_actions", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("task", clampText(e.record.getString("task"), 500));
  e.record.set("owner", clampText(e.record.getString("owner"), 120));
  e.record.set("status", clampEnum(e.record.getString("status"), ["open", "done"], e.record.getString("status")));
});
