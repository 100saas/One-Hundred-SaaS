// Ref.100SaaS (Tool 43) — PocketBase hooks
// Subdomain: ref.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 43: token generation + IP capture + suspicious detection + public response endpoint

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

function getClientIp(req) {
  const h = (name) => String(req?.header?.get?.(name) || "").trim();
  return h("CF-Connecting-IP") || h("X-Forwarded-For").split(",")[0].trim() || "";
}

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase().slice(0, 200);
}

function ensureToken(e) {
  const cur = String(e.record.getString("token") || "").trim();
  if (cur && cur.length >= 16) return cur;
  const raw = $security.randomString(32);
  const t = raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32).toLowerCase();
  e.record.set("token", t);
  return t;
}

// Shared Kernel: RevenueCat webhook → entitlements sync
routerAdd("POST", "/api/webhooks/revenuecat", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleRevenueCatWebhook(c);
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "ref_requests", "ref_responses"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "ref", toolNumber: 43, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "ref", toolNumber: 43 });
});
routerAdd("POST", "/api/ref/request", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent, getAuthRecord } = require(__hooks + "/_shared/kernel.js");
  const user = getAuthRecord(c);
  const tenantId = String(c.queryParam("tenant") || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  requireRole(user, tenantId, "member");

  const parsed = parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const body = parsed.value;

  const candidateName = clampText(body?.candidate_name, 120);
  const refEmail = normalizeEmail(body?.ref_email);
  if (!candidateName || !refEmail) return c.json(400, { error: "bad_request", message: "missing_fields" });

  const req = new Record($app.dao().findCollectionByNameOrId("ref_requests"));
  req.set("tenant", tenantId);
  req.set("candidate_name", candidateName);
  req.set("ref_email", refEmail);
  req.set("status", "sent");
  req.set("creator_ip", getClientIp(c.request()));
  req.set("token", $security.randomString(32).replace(/[^a-zA-Z0-9]/g, "").slice(0, 32).toLowerCase());
  $app.dao().saveRecord(req);

  return c.json( 200, { status: "created", request_id: req.id, token: req.getString("token") });
});

routerAdd("POST", "/api/ref/respond/:token", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const token = String(c.pathParam("token") || "").trim().toLowerCase();
  if (!token || token.length < 16) return c.json(400, { error: "bad_request", message: "invalid_token" });

  let req;
  try {
    req = $app.dao().findFirstRecordByData("ref_requests", "token", token);
  } catch (_) {
    return c.json( 404, { error: "not_found" });
  }

  const parsed = parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const body = parsed.value;

  const response = new Record($app.dao().findCollectionByNameOrId("ref_responses"));
  response.set("request", req.id);
  response.set("relationship", clampText(body?.relationship, 200));
  response.set("strengths", clampText(body?.strengths, 3000));
  response.set("weaknesses", clampText(body?.weaknesses, 3000));
  response.set("would_hire_again", Boolean(body?.would_hire_again));

  const ip = getClientIp(c.request());
  response.set("ip_address", ip);
  const creatorIp = String(req.getString("creator_ip") || "").trim();
  response.set("is_suspicious", Boolean(ip && creatorIp && ip === creatorIp));
  $app.dao().saveRecord(response);

  req.set("status", "completed");
  $app.dao().saveRecord(req);

  return c.json( 200, { status: "submitted", response_id: response.id, suspicious: response.getBool("is_suspicious") });
});

onRecordBeforeCreateRequest("ref_requests", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function ensureToken(e2) {
    const cur = String(e2.record.getString("token") || "").trim();
    if (cur && cur.length >= 16) return cur;
    const raw = $security.randomString(32);
    const t = raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32).toLowerCase();
    e2.record.set("token", t);
    return t;
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "member");
  e.record.set("candidate_name", clampText(e.record.getString("candidate_name"), 120));
  e.record.set("ref_email", normalizeEmail(e.record.getString("ref_email")));
  e.record.set("status", String(e.record.getString("status") || "sent"));
  ensureToken(e);
});

onRecordBeforeCreateRequest("ref_responses", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  // Prefer using /api/ref/respond/:token; keep record creation hardened anyway.
  e.record.set("relationship", clampText(e.record.getString("relationship"), 200));
  e.record.set("strengths", clampText(e.record.getString("strengths"), 3000));
  e.record.set("weaknesses", clampText(e.record.getString("weaknesses"), 3000));
});
