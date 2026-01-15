// Route.100SaaS (Tool 40) — PocketBase hooks
// Subdomain: route.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 40: POST /api/ingest/:apiKey with idempotent routing + route matching

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

function normalizeApiKey(v) {
  return String(v || "")
    .trim()
    .replace(/[^a-zA-Z0-9_\\-]/g, "")
    .slice(0, 64);
}

function parseConditionValue(raw) {
  const s = String(raw || "").trim();
  const m = s.match(/^(>=|<=|>|<)\\s*(-?\\d+(\\.\\d+)?)$/);
  if (m) {
    const op = m[1] === ">" ? "gt" : m[1] === "<" ? "lt" : m[1] === ">=" ? "gte" : "lte";
    return { op, value: Number(m[2]) };
  }
  if (s.toLowerCase().startsWith("contains:")) return { op: "contains", value: s.slice("contains:".length).trim() };
  return { op: "eq", value: s };
}

function matchesCondition(payloadValue, conditionRaw) {
  const { op, value } = parseConditionValue(conditionRaw);
  if (op === "contains") return String(payloadValue || "").toLowerCase().includes(String(value || "").toLowerCase());
  if (op === "eq") return String(payloadValue ?? "").trim() === String(value ?? "").trim();

  const n = Number(payloadValue);
  if (!Number.isFinite(n) || !Number.isFinite(value)) return false;
  if (op === "gt") return n > value;
  if (op === "gte") return n >= value;
  if (op === "lt") return n < value;
  if (op === "lte") return n <= value;
  return false;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

function computeIdempotencyKey(tenantId, apiKey, payload, headerKey) {
  const hk = String(headerKey || "").trim();
  if (hk) return `${tenantId}:${hk}`.slice(0, 120);
  const pk = String(payload?.id || payload?.event_id || payload?.lead_id || "").trim();
  if (pk) return `${tenantId}:${pk}`.slice(0, 120);
  const base = `${tenantId}:${apiKey}:${stableStringify(payload || {})}`;
  return base.slice(0, 120);
}

function executeDestination(route, payload) {
  const dest = String(route.getString("destination") || "").trim();
  const cfg = route.get("destination_config") || {};
  if (dest === "slack") {
    const url = String(cfg.webhook_url || "").trim();
    if (!url) throw new Error("missing_slack_webhook_url");
    $http.send({ method: "POST", url, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: JSON.stringify(payload) }) });
    return { delivered: "slack" };
  }
  if (dest === "webhook") {
    const url = String(cfg.url || "").trim();
    if (!url) throw new Error("missing_webhook_url");
    $http.send({ method: "POST", url, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    return { delivered: "webhook" };
  }
  if (dest === "email") {
    // MVP: store-only (avoid SMTP deliverability complexity)
    return { delivered: "email_stub" };
  }
  return { delivered: "unknown" };
}

// Shared Kernel: RevenueCat webhook → entitlements sync
routerAdd("POST", "/api/webhooks/revenuecat", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleRevenueCatWebhook(c);
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "routes", "sources", "lead_logs"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "route", toolNumber: 40, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "route", toolNumber: 40 });
});
routerAdd("POST", "/api/ingest/:apiKey", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeApiKey(v) {
    return String(v || "")
      .trim()
      .replace(/[^a-zA-Z0-9_\-]/g, "")
      .slice(0, 64);
  }

  function parseConditionValue(raw) {
    const s = String(raw || "").trim();
    const m = s.match(/^(>=|<=|>|<)\s*(-?\d+(\.\d+)?)$/);
    if (m) {
      const op = m[1] === ">" ? "gt" : m[1] === "<" ? "lt" : m[1] === ">=" ? "gte" : "lte";
      return { op, value: Number(m[2]) };
    }
    if (s.toLowerCase().startsWith("contains:")) return { op: "contains", value: s.slice("contains:".length).trim() };
    return { op: "eq", value: s };
  }

  function matchesCondition(payloadValue, conditionRaw) {
    const { op, value } = parseConditionValue(conditionRaw);
    if (op === "contains") return String(payloadValue || "").toLowerCase().includes(String(value || "").toLowerCase());
    if (op === "eq") return String(payloadValue ?? "").trim() === String(value ?? "").trim();

    const n = Number(payloadValue);
    if (!Number.isFinite(n) || !Number.isFinite(value)) return false;
    if (op === "gt") return n > value;
    if (op === "gte") return n >= value;
    if (op === "lt") return n < value;
    if (op === "lte") return n <= value;
    return false;
  }

  function stableStringify(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }

  function computeIdempotencyKey(tenantId, apiKey, payload, headerKey) {
    const hk = String(headerKey || "").trim();
    if (hk) return `${tenantId}:${hk}`.slice(0, 120);
    const pk = String(payload?.id || payload?.event_id || payload?.lead_id || "").trim();
    if (pk) return `${tenantId}:${pk}`.slice(0, 120);
    const base = `${tenantId}:${apiKey}:${stableStringify(payload || {})}`;
    return base.slice(0, 120);
  }

  function executeDestination(route, payload) {
    const dest = String(route.getString("destination") || "").trim();
    const cfg = route.get("destination_config") || {};
    if (dest === "slack") {
      const url = String(cfg.webhook_url || "").trim();
      if (!url) throw new Error("missing_slack_webhook_url");
      $http.send({
        method: "POST",
        url,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: JSON.stringify(payload) }),
      });
      return { delivered: "slack" };
    }
    if (dest === "webhook") {
      const url = String(cfg.url || "").trim();
      if (!url) throw new Error("missing_webhook_url");
      $http.send({ method: "POST", url, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      return { delivered: "webhook" };
    }
    if (dest === "email") {
      return { delivered: "email_stub" };
    }
    return { delivered: "unknown" };
  }

  const apiKey = normalizeApiKey(c.pathParam("apiKey"));
  if (!apiKey) return c.json(400, { error: "bad_request", message: "missing_api_key" });

  let source;
  try {
    source = $app.dao().findFirstRecordByData("sources", "api_key", apiKey);
  } catch (_) {
    return c.json( 404, { error: "invalid_api_key" });
  }

  const parsed = parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const payload = parsed.value;

  const tenantId = source.getString("tenant");
  const headerKey = c.request().header.get("X-Idempotency-Key") || "";
  const idem = computeIdempotencyKey(tenantId, apiKey, payload, headerKey);

  try {
    const existing = $app.dao().findFirstRecordByData("lead_logs", "idempotency_key", idem);
    return c.json( 200, { status: "deduped", lead_log_id: existing.id });
  } catch (_) {
    // continue
  }

  let matched = null;
  try {
    const routes = $app
      .dao()
      .findRecordsByFilter("routes", "tenant.id = {:tid}", "priority", 200, 0, { tid: tenantId });
    for (const r of routes || []) {
      const field = String(r.getString("condition_field") || "").trim();
      const cond = String(r.getString("condition_value") || "").trim();
      if (!field || !cond) continue;
      if (matchesCondition(payload?.[field], cond)) {
        matched = r;
        break;
      }
    }
  } catch (e) {
    $app.logger().warn("route fetch failed", e);
  }

  const log = new Record($app.dao().findCollectionByNameOrId("lead_logs"));
  log.set("tenant", tenantId);
  log.set("source", source.id);
  log.set("idempotency_key", idem);
  log.set("payload", payload || {});
  if (matched) log.set("matched_route", matched.id);

  try {
    if (!matched) {
      log.set("status", "skipped");
      $app.dao().saveRecord(log);
      return c.json( 200, { status: "no_match", lead_log_id: log.id });
    }

    executeDestination(matched, payload || {});
    log.set("status", "success");
    $app.dao().saveRecord(log);
    return c.json( 200, { status: "routed", lead_log_id: log.id, matched_route: matched.id });
  } catch (e) {
    log.set("status", "failed");
    log.set("error", clampText(e?.message || String(e), 200));
    try {
      $app.dao().saveRecord(log);
    } catch (_) {
      // ignore
    }
    return c.json( 500, { error: "route_failed" });
  }
});

onRecordBeforeCreateRequest("sources", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeApiKey(v) {
    return String(v || "")
      .trim()
      .replace(/[^a-zA-Z0-9_\-]/g, "")
      .slice(0, 64);
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("name", clampText(e.record.getString("name"), 80));
  const apiKey = normalizeApiKey(e.record.getString("api_key")) || $security.randomString(32);
  e.record.set("api_key", apiKey);
});

onRecordBeforeUpdateRequest("sources", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeApiKey(v) {
    return String(v || "")
      .trim()
      .replace(/[^a-zA-Z0-9_\-]/g, "")
      .slice(0, 64);
  }
  e.record.set("name", clampText(e.record.getString("name"), 80));
  e.record.set("api_key", normalizeApiKey(e.record.getString("api_key")));
});

onRecordBeforeCreateRequest("routes", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("priority", e.record.getInt("priority") || 999);
  e.record.set("condition_field", clampText(e.record.getString("condition_field"), 64));
  e.record.set("condition_value", clampText(e.record.getString("condition_value"), 64));
});

onRecordBeforeUpdateRequest("routes", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("priority", e.record.getInt("priority") || 999);
  e.record.set("condition_field", clampText(e.record.getString("condition_field"), 64));
  e.record.set("condition_value", clampText(e.record.getString("condition_value"), 64));
});
