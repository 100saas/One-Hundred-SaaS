// Timeline.100SaaS (Tool 5) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 5: customer_notes validation + Stripe proxy endpoints (to avoid exposing Stripe keys)

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

function stripeHeadersForTenant(tenantId) {
  let token = getEnv("STRIPE_SECRET_KEY");
  let accountId = null;
  try {
    const conn = $app
      .dao()
      .findFirstRecordByFilter("stripe_connections", "tenant.id = {:tid}", { tid: tenantId });
    const t = String(conn.getString("access_token") || "").trim();
    if (t) token = t;
    const a = String(conn.getString("stripe_account_id") || "").trim();
    if (a) accountId = a;
  } catch (_) {
    // optional
  }

  if (!token) throw new BadRequestError("stripe_not_configured");
  const headers = { Authorization: `Bearer ${token}` };
  if (accountId) headers["Stripe-Account"] = accountId;
  return headers;
}

function stripeGet(tenantId, path, params) {
  const url = new URL(`https://api.stripe.com${path}`);
  for (const [k, v] of Object.entries(params || {})) {
    if (v == null) continue;
    url.searchParams.set(k, String(v));
  }
  const res = $http.send({ method: "GET", url: url.toString(), headers: stripeHeadersForTenant(tenantId) });
  return res?.json?.() || {};
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
  return k.handleBillingStatus(c, { toolSlug: "timeline" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "timeline" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "timeline" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "timeline" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "timeline" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "customer_notes"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "timeline", toolNumber: 5, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "timeline", toolNumber: 5 });
});
routerAdd("GET", "/api/timeline/stripe/customers/search", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent, getAuthRecord } = require(__hooks + "/_shared/kernel.js");
  function stripeHeadersForTenant(tenantId) {
    let token = getEnv("STRIPE_SECRET_KEY");
    let accountId = null;
    try {
      const conn = $app.dao().findFirstRecordByFilter("stripe_connections", "tenant.id = {:tid}", { tid: tenantId });
      const t = String(conn.getString("access_token") || "").trim();
      if (t) token = t;
      const a = String(conn.getString("stripe_account_id") || "").trim();
      if (a) accountId = a;
    } catch (_) {
      // optional
    }

    if (!token) return null;
    const headers = { Authorization: `Bearer ${token}` };
    if (accountId) headers["Stripe-Account"] = accountId;
    return headers;
  }

  function stripeGet(headers, path, params) {
    const entries = [];
    for (const [k, v] of Object.entries(params || {})) {
      if (v == null) continue;
      entries.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    const qs = entries.length ? `?${entries.join("&")}` : "";
    const res = $http.send({
      method: "GET",
      url: `https://api.stripe.com${path}${qs}`,
      headers,
    });
    return res?.json?.() || {};
  }
  const user = getAuthRecord(c);
  const tenantId = String(c.queryParam("tenant") || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  requireRole(user, tenantId, "member");

  const q = String(c.queryParam("q") || "").trim();
  if (!q) return c.json(400, { error: "bad_request", message: "missing_query" });

  const stripeHeaders = stripeHeadersForTenant(tenantId);
  if (!stripeHeaders) return c.json( 503, { error: "stripe_not_configured" });

  const query = `email:'${q.replaceAll("'", "\\'")}' OR name~'${q.replaceAll("'", "\\'")}'`;
  try {
    const data = stripeGet(stripeHeaders, "/v1/customers/search", { query, limit: 10 });
    return c.json( 200, { data: data?.data || [] });
  } catch (e) {
    $app.logger().warn("stripe customer search failed", e);
    return c.json( 502, { error: "stripe_error" });
  }
});

routerAdd("GET", "/api/timeline/stripe/customer/:id/summary", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent, getAuthRecord } = require(__hooks + "/_shared/kernel.js");
  function stripeHeadersForTenant(tenantId) {
    let token = getEnv("STRIPE_SECRET_KEY");
    let accountId = null;
    try {
      const conn = $app.dao().findFirstRecordByFilter("stripe_connections", "tenant.id = {:tid}", { tid: tenantId });
      const t = String(conn.getString("access_token") || "").trim();
      if (t) token = t;
      const a = String(conn.getString("stripe_account_id") || "").trim();
      if (a) accountId = a;
    } catch (_) {
      // optional
    }

    if (!token) return null;
    const headers = { Authorization: `Bearer ${token}` };
    if (accountId) headers["Stripe-Account"] = accountId;
    return headers;
  }

  function stripeGet(headers, path, params) {
    const entries = [];
    for (const [k, v] of Object.entries(params || {})) {
      if (v == null) continue;
      entries.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    const qs = entries.length ? `?${entries.join("&")}` : "";
    const res = $http.send({
      method: "GET",
      url: `https://api.stripe.com${path}${qs}`,
      headers,
    });
    return res?.json?.() || {};
  }
  const user = getAuthRecord(c);
  const tenantId = String(c.queryParam("tenant") || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  requireRole(user, tenantId, "member");

  const customerId = String(c.pathParam("id") || "").trim();
  if (!customerId) return c.json(400, { error: "bad_request", message: "missing_customer_id" });

  const stripeHeaders = stripeHeadersForTenant(tenantId);
  if (!stripeHeaders) return c.json( 503, { error: "stripe_not_configured" });

  try {
    const invoices = stripeGet(stripeHeaders, "/v1/invoices", { customer: customerId, limit: 10 });
    const charges = stripeGet(stripeHeaders, "/v1/charges", { customer: customerId, limit: 10 });
    return c.json( 200, { invoices: invoices?.data || [], charges: charges?.data || [] });
  } catch (e) {
    $app.logger().warn("stripe timeline fetch failed", e);
    return c.json( 502, { error: "stripe_error" });
  }
});

// Tool 5: Demo seed (keyless UX)
routerAdd("POST", "/api/timeline/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`timeline_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const customerIds = ["cus_demo_alice", "cus_demo_bob", "cus_demo_charlie"];
  const col = $app.dao().findCollectionByNameOrId("customer_notes");
  for (let i = 0; i < 6; i++) {
    const rec = new Record(col);
    rec.set("tenant", tenantId);
    rec.set("stripe_customer_id", customerIds[i % customerIds.length]);
    rec.set("author", user.id);
    rec.set("content", `Demo note ${i + 1}: follow up with customer about refund/upgrade.`);
    rec.set("is_pinned", i === 0);
    try {
      $app.dao().saveRecord(rec);
    } catch (_) {}
  }

  return c.json(200, { ok: true, customer_ids: customerIds });
});

onRecordBeforeCreateRequest("customer_notes", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "member");

  e.record.set("stripe_customer_id", clampText(e.record.getString("stripe_customer_id"), 64));
  e.record.set("content", clampText(e.record.getString("content"), 2000));
  if (user) e.record.set("author", user.id);
});

onRecordBeforeUpdateRequest("customer_notes", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("content", clampText(e.record.getString("content"), 2000));
});
