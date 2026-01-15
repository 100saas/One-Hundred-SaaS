// Status.100SaaS (Tool 17) — PocketBase hooks
// Subdomain: status.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 17: denormalize tenant_slug on public records; validate status values

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

function setTenantSlug(e) {
  const tenantId = e.record.getString("tenant");
  if (!tenantId) return;
  try {
    const tenant = $app.dao().findRecordById("tenants", tenantId);
    e.record.set("tenant_slug", tenant.getString("slug") || "");
  } catch (_) {}
}

function clampEnum(value, allowed, fallback) {
  const v = String(value || "").trim();
  return allowed.includes(v) ? v : fallback;
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
  return k.handleBillingStatus(c, { toolSlug: "status" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "status" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "status" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "status" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "status" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "components", "incidents"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "status", toolNumber: 17, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "status", toolNumber: 17 });
});

// Tool 17: demo seed (owner-only)
routerAdd("POST", "/api/status/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`status_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const compCol = $app.dao().findCollectionByNameOrId("components");
  const names = ["API", "Website", "Dashboard"];
  for (const n of names) {
    const rec = new Record(compCol);
    rec.set("tenant", tenantId);
    rec.set("name", n);
    rec.set("status", "operational");
    try {
      $app.dao().saveRecord(rec);
    } catch (_) {}
  }

  const incCol = $app.dao().findCollectionByNameOrId("incidents");
  const inc = new Record(incCol);
  inc.set("tenant", tenantId);
  inc.set("title", "Investigating elevated errors");
  inc.set("message", "We are investigating elevated 500s for some requests.");
  inc.set("state", "investigating");
  try {
    $app.dao().saveRecord(inc);
  } catch (_) {}

  return c.json(200, { ok: true });
});

// Public: fetch status page by tenant slug
routerAdd("GET", "/api/status/public/page", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const slug = String(c.queryParam("slug") || "").trim();
  if (!slug) return c.json(400, { error: "bad_request", message: "missing_slug" });
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) return c.json(400, { error: "bad_request", message: "invalid_slug" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`status_public_page:ip:${ip}:slug:${slug}`, now, 120, 10 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let components = [];
  let incidents = [];
  try {
    components = $app.dao().findRecordsByFilter("components", "tenant_slug = {:slug}", "name", 50, 0, { slug }) || [];
  } catch (_) {}
  try {
    incidents = $app.dao().findRecordsByFilter("incidents", "tenant_slug = {:slug}", "-created", 50, 0, { slug }) || [];
  } catch (_) {}

  const compOut = components.map((r) => ({ id: r.id, name: r.getString("name"), status: r.getString("status") }));
  const incOut = incidents.map((r) => ({ id: r.id, title: r.getString("title"), message: r.getString("message"), state: r.getString("state"), created: r.getString("created") }));
  const overall = (() => {
    const statuses = compOut.map((x) => String(x.status || ""));
    if (statuses.includes("outage")) return "outage";
    if (statuses.includes("degraded")) return "degraded";
    return "operational";
  })();

  return c.json(200, { ok: true, tenant_slug: slug, overall_status: overall, components: compOut, incidents: incOut });
});
onRecordBeforeCreateRequest("components", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  setTenantSlug(e);
  e.record.set("status", clampEnum(e.record.getString("status"), ["operational", "degraded", "outage"], "operational"));
});

onRecordBeforeUpdateRequest("components", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  setTenantSlug(e);
  e.record.set("status", clampEnum(e.record.getString("status"), ["operational", "degraded", "outage"], "operational"));
});

onRecordBeforeCreateRequest("incidents", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  setTenantSlug(e);
  e.record.set(
    "state",
    clampEnum(e.record.getString("state"), ["investigating", "identified", "resolved"], "investigating"),
  );
});

onRecordBeforeUpdateRequest("incidents", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  setTenantSlug(e);
  e.record.set(
    "state",
    clampEnum(e.record.getString("state"), ["investigating", "identified", "resolved"], "investigating"),
  );
});
