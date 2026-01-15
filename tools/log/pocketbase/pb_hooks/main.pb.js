// Log.100SaaS (Tool 46) — PocketBase hooks
// Subdomain: log.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 46: ingestion endpoint with API keys + basic rate limiting

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
  const s = String(v || "").trim().toLowerCase();
  return allowed.includes(s) ? s : fallback;
}

function getClientIp(req) {
  const h = (name) => String(req?.header?.get?.(name) || "").trim();
  return h("CF-Connecting-IP") || h("X-Forwarded-For").split(",")[0].trim() || "";
}

// Fixed-window rate limiter (per tenant) — best-effort for MVP.
const RATE = new Map();
function allowRequest(key, nowMs) {
  const windowMs = 60_000;
  const limit = 100;
  const now = Number(nowMs);
  const id = String(key || "");
  if (!id) return false;
  const win = Math.floor(now / windowMs);
  const prev = RATE.get(id);
  if (!prev || prev.win !== win) {
    RATE.set(id, { win, count: 1 });
    return true;
  }
  if (prev.count >= limit) return false;
  prev.count += 1;
  return true;
}

// Shared Kernel: RevenueCat webhook → entitlements sync
routerAdd("POST", "/api/webhooks/revenuecat", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleRevenueCatWebhook(c);
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "api_keys", "external_logs"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "log", toolNumber: 46, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "log", toolNumber: 46 });
});
routerAdd("POST", "/api/ingest", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const apiKey = String(c.request().header.get("X-API-Key") || "").trim();
  if (!apiKey) return c.json( 401, { error: "missing_api_key" });

  let keyRec;
  try {
    keyRec = $app.dao().findFirstRecordByData("api_keys", "key", apiKey);
  } catch (_) {
    return c.json( 401, { error: "invalid_api_key" });
  }

  const tenantId = keyRec.getString("tenant");
  if (!allowRequest(tenantId, Date.now())) return c.json( 429, { error: "rate_limited" });

  const parsed = parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const payload = parsed.value;

  const service = clampText(payload?.service, 64);
  const action = clampText(payload?.action, 128);
  if (!service || !action) return c.json(400, { error: "bad_request", message: "missing_fields" });

  const rec = new Record($app.dao().findCollectionByNameOrId("external_logs"));
  rec.set("tenant", tenantId);
  rec.set("service", service);
  rec.set("action", action);
  rec.set("actor", clampText(payload?.actor, 128));
  rec.set("metadata", payload?.metadata && typeof payload.metadata === "object" ? payload.metadata : {});
  rec.set("ip", getClientIp(c.request()));
  rec.set("severity", clampEnum(payload?.severity, ["info", "warn", "error", "critical"], "info"));

  try {
    $app.dao().saveRecord(rec);
    return c.json( 200, { status: "ingested", id: rec.id });
  } catch (e) {
    $app.logger().error("log ingest failed", e);
    return c.json( 500, { error: "ingest_failed" });
  }
});

onRecordBeforeCreateRequest("api_keys", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("name", clampText(e.record.getString("name"), 80));
  const cur = String(e.record.getString("key") || "").trim();
  const next = cur && cur.length >= 16 ? cur : $security.randomString(32).replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
  e.record.set("key", next);
});
