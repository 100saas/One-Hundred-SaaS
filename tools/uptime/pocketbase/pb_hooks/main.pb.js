// Uptime.100SaaS (Tool 18) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 18: cron job to HEAD monitors, update status/latency, maintain outage logs

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

function nowIso() {
  return new Date().toISOString();
}

function parseIsoMs(iso) {
  const t = Date.parse(String(iso || ""));
  return isFinite(t) ? t : null;
}

function shouldCheckMonitor(monitor, nowMs) {
  const intervalSec = monitor.getInt("interval_sec") || 60;
  const lastCheckedIso = monitor.getString("last_checked");
  const lastMs = parseIsoMs(lastCheckedIso);
  if (!lastMs) return true;
  return nowMs - lastMs >= intervalSec * 1000;
}

function findOpenOutage(monitorId) {
  try {
    return $app
      .dao()
      .findFirstRecordByFilter("outage_logs", "monitor.id = {:mid} && ended_at = ''", { mid: monitorId });
  } catch (_) {
    return null;
  }
}

function openOutage(monitorId, startedAtIso) {
  const col = $app.dao().findCollectionByNameOrId("outage_logs");
  const rec = new Record(col);
  rec.set("monitor", monitorId);
  rec.set("started_at", startedAtIso);
  rec.set("ended_at", "");
  rec.set("duration_sec", 0);
  $app.dao().saveRecord(rec);
  return rec;
}

function closeOutage(outage, endedAtIso) {
  const started = parseIsoMs(outage.getString("started_at"));
  const ended = parseIsoMs(endedAtIso);
  const dur = started && ended ? Math.max(0, Math.floor((ended - started) / 1000)) : 0;
  outage.set("ended_at", endedAtIso);
  outage.set("duration_sec", dur);
  $app.dao().saveRecord(outage);
}

function headCheck(url) {
  const start = Date.now();
  const res = $http.send({
    url,
    method: "HEAD",
    timeout: 5,
  });
  const elapsed = Date.now() - start;
  const status = res?.statusCode || 0;
  const ok = status >= 200 && status < 400;
  return { ok, latencyMs: elapsed, statusCode: status };
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
  return k.handleBillingStatus(c, { toolSlug: "uptime" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "uptime" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "uptime" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "uptime" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "uptime" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "monitors", "outage_logs"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "uptime", toolNumber: 18, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "uptime", toolNumber: 18 });
});

// Tool 18: demo seed (owner-only)
routerAdd("POST", "/api/uptime/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`uptime_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  // Create one monitor if missing.
  let monitor = null;
  try {
    const list = $app.dao().findRecordsByFilter("monitors", "tenant.id = {:tid}", "-created", 1, 0, { tid: tenantId });
    monitor = list?.[0] || null;
  } catch (_) {}

  if (!monitor) {
    const col = $app.dao().findCollectionByNameOrId("monitors");
    monitor = new Record(col);
    monitor.set("tenant", tenantId);
    monitor.set("name", "Example");
    monitor.set("url", "https://example.com");
    monitor.set("interval_sec", 60);
    monitor.set("status", "up");
    $app.dao().saveRecord(monitor);
  }

  return c.json(200, { ok: true, monitor_id: monitor.id });
});

// Tool 18: run checks now (owner-only, tenant-scoped)
routerAdd("POST", "/api/uptime/run_once", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const nowMs = Date.now();
  if (!k.allowRequest(`uptime_run_once:user:${user.id}`, nowMs, 30, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  function nowIso() {
    return new Date().toISOString();
  }

  function parseIsoMs(iso) {
    const t = Date.parse(String(iso || ""));
    return isFinite(t) ? t : null;
  }

  function shouldCheckMonitor(monitor, nowMs) {
    const intervalSec = monitor.getInt("interval_sec") || 60;
    const lastCheckedIso = monitor.getString("last_checked");
    const lastMs = parseIsoMs(lastCheckedIso);
    if (!lastMs) return true;
    return nowMs - lastMs >= intervalSec * 1000;
  }

  function headCheck(url) {
    const start = Date.now();
    const res = $http.send({ url, method: "HEAD", timeout: 5 });
    const elapsed = Date.now() - start;
    const status = res?.statusCode || 0;
    const ok = status >= 200 && status < 400;
    return { ok, latencyMs: elapsed, statusCode: status };
  }

  function findOpenOutage(monitorId) {
    try {
      return $app.dao().findFirstRecordByFilter("outage_logs", "monitor.id = {:mid} && ended_at = ''", { mid: monitorId });
    } catch (_) {
      return null;
    }
  }

  function openOutage(monitorId, startedAtIso) {
    const col = $app.dao().findCollectionByNameOrId("outage_logs");
    const rec = new Record(col);
    rec.set("monitor", monitorId);
    rec.set("started_at", startedAtIso);
    rec.set("ended_at", "");
    rec.set("duration_sec", 0);
    $app.dao().saveRecord(rec);
    return rec;
  }

  function closeOutage(outage, endedAtIso) {
    const started = parseIsoMs(outage.getString("started_at"));
    const ended = parseIsoMs(endedAtIso);
    const dur = started && ended ? Math.max(0, Math.floor((ended - started) / 1000)) : 0;
    outage.set("ended_at", endedAtIso);
    outage.set("duration_sec", dur);
    $app.dao().saveRecord(outage);
  }

  const nowIsoStr = nowIso();
  let checked = 0;
  let down = 0;
  try {
    const monitors = $app.dao().findRecordsByFilter("monitors", "tenant.id = {:tid}", "", 2000, 0, { tid: tenantId }) || [];
    for (const m of monitors) {
      if (!shouldCheckMonitor(m, nowMs)) continue;
      const url = m.getString("url");
      if (!url) continue;

      let result;
      try {
        result = headCheck(url);
      } catch (_) {
        result = { ok: false, latencyMs: 0, statusCode: 0 };
      }
      checked += 1;

      const prevStatus = m.getString("status") || "up";
      const nextStatus = result.ok ? "up" : "down";
      if (nextStatus === "down") down += 1;

      m.set("last_checked", nowIsoStr);
      m.set("latency_ms", result.latencyMs);
      m.set("status", nextStatus);
      $app.dao().saveRecord(m);

      const open = findOpenOutage(m.id);
      if (nextStatus === "down" && !open) openOutage(m.id, nowIsoStr);
      if (nextStatus === "up" && open) closeOutage(open, nowIsoStr);
    }
  } catch (e) {
    $app.logger().error("Uptime run_once failed", e);
    return c.json(500, { error: "uptime_run_failed" });
  }

  return c.json(200, { ok: true, checked, down });
});
onRecordBeforeCreateRequest("monitors", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  const interval = e.record.getInt("interval_sec") || 60;
  e.record.set("interval_sec", Math.max(60, interval));
  e.record.set("status", e.record.getString("status") || "up");
});

onRecordBeforeUpdateRequest("monitors", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  const interval = e.record.getInt("interval_sec") || 60;
  e.record.set("interval_sec", Math.max(60, interval));
});

// Runs every minute
cronAdd("uptime_minutely", "* * * * *", function () {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function nowIso() {
    return new Date().toISOString();
  }

  function parseIsoMs(iso) {
    const t = Date.parse(String(iso || ""));
    return isFinite(t) ? t : null;
  }

  function shouldCheckMonitor(monitor, nowMs) {
    const intervalSec = monitor.getInt("interval_sec") || 60;
    const lastCheckedIso = monitor.getString("last_checked");
    const lastMs = parseIsoMs(lastCheckedIso);
    if (!lastMs) return true;
    return nowMs - lastMs >= intervalSec * 1000;
  }

  function findOpenOutage(monitorId) {
    try {
      return $app
        .dao()
        .findFirstRecordByFilter("outage_logs", "monitor.id = {:mid} && ended_at = ''", { mid: monitorId });
    } catch (_) {
      return null;
    }
  }

  function openOutage(monitorId, startedAtIso) {
    const col = $app.dao().findCollectionByNameOrId("outage_logs");
    const rec = new Record(col);
    rec.set("monitor", monitorId);
    rec.set("started_at", startedAtIso);
    rec.set("ended_at", "");
    rec.set("duration_sec", 0);
    $app.dao().saveRecord(rec);
    return rec;
  }

  function closeOutage(outage, endedAtIso) {
    const started = parseIsoMs(outage.getString("started_at"));
    const ended = parseIsoMs(endedAtIso);
    const dur = started && ended ? Math.max(0, Math.floor((ended - started) / 1000)) : 0;
    outage.set("ended_at", endedAtIso);
    outage.set("duration_sec", dur);
    $app.dao().saveRecord(outage);
  }

  function headCheck(url) {
    const start = Date.now();
    const res = $http.send({
      url,
      method: "HEAD",
      timeout: 5,
    });
    const elapsed = Date.now() - start;
    const status = res?.statusCode || 0;
    const ok = status >= 200 && status < 400;
    return { ok, latencyMs: elapsed, statusCode: status };
  }
  const now = nowIso();
  const nowMs = Date.now();

  try {
    const monitors = $app.dao().findRecordsByFilter("monitors", "", "", 2000);
    for (const m of monitors || []) {
      if (!shouldCheckMonitor(m, nowMs)) continue;

      const url = m.getString("url");
      if (!url) continue;

      let result;
      try {
        result = headCheck(url);
      } catch (e) {
        result = { ok: false, latencyMs: 0, statusCode: 0 };
      }

      const prevStatus = m.getString("status") || "up";
      const nextStatus = result.ok ? "up" : "down";

      m.set("last_checked", now);
      m.set("latency_ms", result.latencyMs);
      m.set("status", nextStatus);
      $app.dao().saveRecord(m);

      const open = findOpenOutage(m.id);
      if (nextStatus === "down" && !open) openOutage(m.id, now);
      if (nextStatus === "up" && open) closeOutage(open, now);
    }
  } catch (e) {
    $app.logger().error("Uptime cron failed", e);
  }
});
