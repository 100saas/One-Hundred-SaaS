// UTM.100SaaS (Tool 31) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 31: Enforce preset uniqueness and ensure generated links only use preset values

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

function normalizePresetValue(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 64);
}

function buildUrl(targetUrl, params) {
  const u = new URL(String(targetUrl));
  if (params.source) u.searchParams.set("utm_source", params.source);
  if (params.medium) u.searchParams.set("utm_medium", params.medium);
  if (params.campaign) u.searchParams.set("utm_campaign", params.campaign);
  return u.toString();
}

function ensurePresetExists(tenantId, category, value) {
  try {
    $app
      .dao()
      .findFirstRecordByFilter("presets", "tenant.id = {:tid} && category = {:c} && value = {:v}", {
        tid: tenantId,
        c: category,
        v: value,
      });
    return true;
  } catch (_) {
    return false;
  }
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
  return k.handleBillingStatus(c, { toolSlug: "utm" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "utm" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "utm" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "utm" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "utm" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "generated_links", "presets"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "utm", toolNumber: 31, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "utm", toolNumber: 31 });
});

// Tool 31: demo seed (owner-only)
routerAdd("POST", "/api/utm/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`utm_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) {
    return c.json(403, { error: "forbidden", message: "rate_limited" });
  }

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const presetsCol = $app.dao().findCollectionByNameOrId("presets");
  const seedPreset = (category, value) => {
    const p = new Record(presetsCol);
    p.set("tenant", tenantId);
    p.set("category", category);
    p.set("value", value);
    try {
      $app.dao().saveRecord(p);
      return p.id;
    } catch (_) {
      return "";
    }
  };

  seedPreset("source", "linkedin");
  seedPreset("source", "google");
  seedPreset("medium", "cpc");
  seedPreset("medium", "newsletter");
  seedPreset("campaign", "winter_sale");

  return c.json(200, { ok: true });
});
onRecordBeforeCreateRequest("presets", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizePresetValue(v) {
    return String(v || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_\-]+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 64);
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  const category = String(e.record.getString("category") || "");
  if (!["source", "medium", "campaign"].includes(category)) throw new BadRequestError("invalid_category");
  e.record.set("value", normalizePresetValue(e.record.getString("value")));
});

onRecordBeforeUpdateRequest("presets", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizePresetValue(v) {
    return String(v || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_\-]+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 64);
  }
  const category = String(e.record.getString("category") || "");
  if (!["source", "medium", "campaign"].includes(category)) throw new BadRequestError("invalid_category");
  e.record.set("value", normalizePresetValue(e.record.getString("value")));
});

onRecordBeforeCreateRequest("generated_links", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizePresetValue(v) {
    return String(v || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_\-]+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 64);
  }

  function ensurePresetExists(tenantId, category, value) {
    try {
      $app.dao().findFirstRecordByFilter("presets", "tenant.id = {:tid} && category = {:c} && value = {:v}", {
        tid: tenantId,
        c: category,
        v: value,
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  function buildUrl(targetUrl, params) {
    const base = String(targetUrl || "").trim();
    if (!base) throw new Error("missing_target_url");
    const fragSplit = base.split("#");
    const beforeFrag = fragSplit[0];
    const frag = fragSplit.length > 1 ? fragSplit.slice(1).join("#") : "";

    const parts = beforeFrag.split("?");
    const path = parts[0];
    const existingQs = parts.length > 1 ? parts.slice(1).join("?") : "";

    const qp = [];
    if (existingQs) qp.push(existingQs);
    if (params.source) qp.push(`utm_source=${encodeURIComponent(params.source)}`);
    if (params.medium) qp.push(`utm_medium=${encodeURIComponent(params.medium)}`);
    if (params.campaign) qp.push(`utm_campaign=${encodeURIComponent(params.campaign)}`);

    const qs = qp.filter(Boolean).join("&");
    const rebuilt = qs ? `${path}?${qs}` : path;
    return frag ? `${rebuilt}#${frag}` : rebuilt;
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "member");

  const params = e.record.get("parameters") || {};
  const source = normalizePresetValue(params?.source);
  const medium = normalizePresetValue(params?.medium);
  const campaign = normalizePresetValue(params?.campaign);

  if (!source || !medium || !campaign) throw new BadRequestError("missing_parameters");
  if (!ensurePresetExists(tenantId, "source", source)) throw new ForbiddenError("invalid_source");
  if (!ensurePresetExists(tenantId, "medium", medium)) throw new ForbiddenError("invalid_medium");
  if (!ensurePresetExists(tenantId, "campaign", campaign)) throw new ForbiddenError("invalid_campaign");

  const targetUrl = String(e.record.getString("target_url") || "");
  let full;
  try {
    full = buildUrl(targetUrl, { source, medium, campaign });
  } catch (_) {
    throw new BadRequestError("invalid_target_url");
  }

  e.record.set("parameters", { source, medium, campaign });
  e.record.set("full_url", full);
  if (user) e.record.set("created_by", user.id);
});
