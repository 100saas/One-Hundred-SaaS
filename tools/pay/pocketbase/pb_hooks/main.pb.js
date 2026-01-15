// Generated scaffold for Pay.100SaaS (Contractor Portal) (Tool 10)
// Subdomain: pay.100saas.com
//
// Source of truth: NEW_PRD/00_SHARED_KERNEL.md + NEW_PRD/01_50_BATCH.md
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 10: Magic link token validation for public invoice uploads

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

function safeString(v) {
  return v === null || v === undefined ? "" : String(v);
}

function validateUploadToken({ providedToken, expectedToken }) {
  const provided = safeString(providedToken).trim();
  const expected = safeString(expectedToken).trim();
  if (!provided || !expected) return false;
  if (provided.length < 12 || expected.length < 12) return false;
  return provided === expected;
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
  return k.handleBillingStatus(c, { toolSlug: "pay" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "pay" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "pay" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "pay" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "pay" });
});
// Tool entrypoint stub (health)
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "contractors", "invoices"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "pay", toolNumber: 10, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "pay", toolNumber: 10 });
});

// Tool 10: create contractor + upload link (owner-only)
routerAdd("POST", "/api/pay/contractors/create", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`pay_contractors_create:user:${user.id}`, now, 100, 60 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const body = parsed.value || {};

  const tenantId = String(body.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const name = k.clampText(String(body.name || ""), 140);
  const email = k.normalizeEmail(body.email) || "";
  const token = k.randToken("up");
  if (!token || token.length < 12) return c.json(500, { error: "token_generate_failed" });

  const col = $app.dao().findCollectionByNameOrId("contractors");
  const rec = new Record(col);
  rec.set("tenant", tenantId);
  rec.set("name", name);
  rec.set("email", email);
  rec.set("upload_token", token);
  $app.dao().saveRecord(rec);

  const publicAppUrl = k.getEnv("PUBLIC_APP_URL");
  const uploadUrl = publicAppUrl
    ? `${publicAppUrl.replace(/\/+$/, "")}/upload?contractor=${encodeURIComponent(rec.id)}&token=${encodeURIComponent(token)}`
    : null;

  return c.json(200, { ok: true, contractor: { id: rec.id, name, email }, upload_url: uploadUrl, token });
});

// Tool 10: demo seed (owner-only)
routerAdd("POST", "/api/pay/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`pay_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  // Create one contractor (if none exist).
  let contractor = null;
  try {
    const list = $app.dao().findRecordsByFilter("contractors", "tenant.id = {:tid}", "-created", 1, 0, { tid: tenantId });
    contractor = list?.[0] || null;
  } catch (_) {}

  if (!contractor) {
    const col = $app.dao().findCollectionByNameOrId("contractors");
    contractor = new Record(col);
    contractor.set("tenant", tenantId);
    contractor.set("name", "Demo Contractor");
    contractor.set("email", "demo.contractor@example.com");
    contractor.set("upload_token", k.randToken("up"));
    $app.dao().saveRecord(contractor);
  }

  return c.json(200, { ok: true, contractor_id: contractor.id });
});

// Tool 10: public invoice history for a contractor (magic link).
// Query: ?contractor=ID&token=UPLOAD_TOKEN
routerAdd("GET", "/api/pay/contractor/invoices", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const contractorId = String(c.queryParam("contractor") || "").trim();
  const token = String(c.queryParam("token") || "").trim();
  if (!contractorId) return c.json(400, { error: "bad_request", message: "missing_contractor" });
  if (!token) return c.json(400, { error: "bad_request", message: "missing_token" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`pay_contractor_invoices:ip:${ip}:contractor:${contractorId}`, now, 120, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  const contractor = $app.dao().findRecordById("contractors", contractorId);
  const expected = contractor.getString("upload_token");
  if (!k.validateUploadToken({ providedToken: token, expectedToken: expected })) {
    return c.json(403, { error: "forbidden", message: "invalid_token" });
  }

  const rows = $app
    .dao()
    .findRecordsByFilter("invoices", "contractor.id = {:cid}", "-created", 50, 0, { cid: contractorId })
    .map((r) => ({
      id: r.id,
      created: r.getString("created"),
      amount: r.getFloat("amount"),
      currency: r.getString("currency"),
      status: r.getString("status"),
    }));

  return c.json(200, { ok: true, invoices: rows });
});
// Tool 10: magic link invoice upload validation
//
// Expected public create payload includes:
// - contractor: contractor record id
// - token: upload token (string)
//
// The contractor does NOT need a PB user account.
onRecordBeforeCreateRequest("invoices", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  try {
    const contractorId = safeString(e.record.getString("contractor")).trim();
    const token = safeString(e.record.getString("upload_token")).trim();

    if (!contractorId) throw new BadRequestError("missing_contractor");
    if (!token) throw new BadRequestError("missing_token");

    const contractor = $app.dao().findRecordById("contractors", contractorId);
    const expected = contractor.getString("upload_token");
    if (!validateUploadToken({ providedToken: token, expectedToken: expected })) {
      throw new ForbiddenError("invalid_token");
    }

    // Enforce tenant match derived from contractor.
    const tenantId = contractor.getString("tenant");
    if (!tenantId) throw new BadRequestError("contractor_missing_tenant");
    e.record.set("tenant", tenantId);
    e.record.set("status", "pending");
    e.record.set("upload_token", "");
  } catch (err) {
    throw err;
  }
});
