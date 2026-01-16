// Signoff.100SaaS (Tool 24) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Shared Kernel: self-serve onboarding + billing + Stripe connect
// - Tool 24: When deliverable status moves to approved, set approved_at and best-effort IP capture

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

function randToken(prefix) {
  const raw = $security.randomString(32);
  return `${prefix}_${raw}`;
}

function clampEnum(value, allowed, fallback) {
  const v = String(value || "").trim();
  return allowed.includes(v) ? v : fallback;
}

function bestEffortClientIp(httpContext) {
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
  return k.handleBillingStatus(c, { toolSlug: "signoff" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "signoff" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "signoff" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "signoff" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "signoff" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "deliverables"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "signoff", toolNumber: 24, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "signoff", toolNumber: 24 });
});

// Tool 24: demo seed (owner-only)
routerAdd("POST", "/api/signoff/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`signoff_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const col = $app.dao().findCollectionByNameOrId("deliverables");
  const rec = new Record(col);
  rec.set("tenant", tenantId);
  rec.set("title", "Homepage Design v3");
  rec.set("description", "Please review and approve, or request changes.");
  rec.set("status", "pending");
  rec.set("access_token", k.randToken("dlv"));
  $app.dao().saveRecord(rec);

  return c.json(200, { ok: true, deliverableId: rec.id, access_token: rec.getString("access_token") });
});

// Public: get deliverable by access token
routerAdd("GET", "/api/signoff/public/deliverable", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  function fileUrl(collection, recordId, filename) {
    return `/api/files/${encodeURIComponent(collection)}/${encodeURIComponent(recordId)}/${encodeURIComponent(filename)}`;
  }
  const token = String(c.queryParam("token") || "").trim();
  if (!token) return c.json(400, { error: "bad_request", message: "missing_token" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`signoff_public_deliverable:ip:${ip}:token:${token}`, now, 240, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let rec = null;
  try {
    rec = $app.dao().findFirstRecordByFilter("deliverables", "access_token = {:t}", { t: token });
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }

  const files = rec.get("files");
  const list = Array.isArray(files) ? files.map((f) => String(f || "")).filter(Boolean) : [];
  return c.json(200, {
    ok: true,
    deliverable: {
      id: rec.id,
      title: rec.getString("title"),
      description: rec.getString("description"),
      status: rec.getString("status"),
      approved_at: rec.getString("approved_at"),
      approved_by_ip: rec.getString("approved_by_ip"),
      files: list.map((name) => ({ name, url: fileUrl("deliverables", rec.id, name) })),
    },
  });
});

// Public: approve deliverable by token
routerAdd("POST", "/api/signoff/public/approve", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const body = parsed.value || {};
  const token = String(body.token || "").trim();
  if (!token) return c.json(400, { error: "bad_request", message: "missing_token" });

  const ip = k.bestEffortClientIp(c?.request?.()) || "";
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`signoff_public_approve:ip:${ip}:token:${token}`, now, 30, 10 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let rec = null;
  try {
    rec = $app.dao().findFirstRecordByFilter("deliverables", "access_token = {:t}", { t: token });
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }

  if (rec.getString("status") !== "approved") {
    rec.set("status", "approved");
    if (!rec.getString("approved_at")) rec.set("approved_at", new Date().toISOString());
    if (ip && !rec.getString("approved_by_ip")) rec.set("approved_by_ip", ip);
    $app.dao().saveRecord(rec);
    k.auditLog(rec.getString("tenant"), "", "signoff_approved", { deliverableId: rec.id, ip });
  }

  return c.json(200, { ok: true, status: rec.getString("status"), approved_at: rec.getString("approved_at") });
});

// Public: request changes by token (feedback stored in audit_logs)
routerAdd("POST", "/api/signoff/public/request_changes", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const body = parsed.value || {};
  const token = String(body.token || "").trim();
  const feedback = k.clampText(String(body.feedback || "").trim(), 4000);
  if (!token) return c.json(400, { error: "bad_request", message: "missing_token" });
  if (!feedback) return c.json(400, { error: "bad_request", message: "missing_feedback" });

  const ip = k.bestEffortClientIp(c?.request?.()) || "";
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`signoff_public_changes:ip:${ip}:token:${token}`, now, 30, 10 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let rec = null;
  try {
    rec = $app.dao().findFirstRecordByFilter("deliverables", "access_token = {:t}", { t: token });
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }

  rec.set("status", "changes_requested");
  $app.dao().saveRecord(rec);
  k.auditLog(rec.getString("tenant"), "", "signoff_changes_requested", { deliverableId: rec.id, ip, feedback });

  return c.json(200, { ok: true, status: rec.getString("status") });
});
onRecordBeforeCreateRequest("deliverables", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  if (!e.record.getString("access_token")) e.record.set("access_token", randToken("dlv"));
  e.record.set(
    "status",
    clampEnum(e.record.getString("status"), ["pending", "changes_requested", "approved"], "pending"),
  );
  e.record.set("title", String(e.record.getString("title") || "").slice(0, 140));
  e.record.set("description", String(e.record.getString("description") || "").slice(0, 2000));
});

onRecordBeforeUpdateRequest("deliverables", (e) => {
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
  const status = clampEnum(e.record.getString("status"), ["pending", "changes_requested", "approved"], "pending");
  e.record.set("status", status);

  if (status === "approved" && !e.record.getString("approved_at")) {
    e.record.set("approved_at", new Date().toISOString());
    const ip = bestEffortClientIpFromContext(e.httpContext);
    if (ip) e.record.set("approved_by_ip", ip);
  }
});
