// Proposal.100SaaS (Tool 27) — PocketBase hooks
// Subdomain: proposal.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Shared Kernel: self-serve onboarding + billing + Stripe connect
// - Tool 27: Token generation + public view/accept endpoints (with rate limits)

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
  const raw = $security.randomString(28);
  return `${prefix}_${raw}`;
}

function clampEnum(value, allowed, fallback) {
  const v = String(value || "").trim();
  return allowed.includes(v) ? v : fallback;
}

function normalizeVars(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, 40)
    .map((x) => x.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32))
    .filter(Boolean);
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
  return k.handleBillingStatus(c, { toolSlug: "proposal" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "proposal" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "proposal" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "proposal" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "proposal" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "proposals", "templates"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "proposal", toolNumber: 27, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "proposal", toolNumber: 27 });
});

// Tool 27: demo seed (owner-only)
routerAdd("POST", "/api/proposal/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`proposal_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const templatesCol = $app.dao().findCollectionByNameOrId("templates");
  const proposalsCol = $app.dao().findCollectionByNameOrId("proposals");

  const tpl = new Record(templatesCol);
  tpl.set("tenant", tenantId);
  tpl.set("name", "Simple Proposal");
  tpl.set("variables", ["client_name", "price", "date"]);
  tpl.set("content_html", "<h1>Proposal for {{client_name}}</h1><p>Price: {{price}}</p><p>Date: {{date}}</p>");
  $app.dao().saveRecord(tpl);

  const prop = new Record(proposalsCol);
  prop.set("tenant", tenantId);
  prop.set("client_name", "Acme Corp");
  prop.set("variable_values", { client_name: "Acme Corp", price: "$2,500", date: new Date().toISOString().slice(0, 10) });
  prop.set("template", tpl.id);
  prop.set("content_html", tpl.getString("content_html"));
  prop.set("status", "sent");
  prop.set("view_count", 0);
  prop.set("public_token", k.randToken("prop"));
  $app.dao().saveRecord(prop);

  return c.json(200, { ok: true, templateId: tpl.id, proposalId: prop.id, public_token: prop.getString("public_token") });
});

// Public: view proposal by token + increment view_count (rate limited)
routerAdd("GET", "/api/proposal/public/view", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  function renderTemplate(html, values) {
    const raw = String(html || "");
    const vars = values && typeof values === "object" ? values : {};
    return raw.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
      const v = vars[key];
      return v === null || v === undefined ? "" : String(v);
    });
  }
  const token = String(c.queryParam("token") || "").trim();
  if (!token) return c.json(400, { error: "bad_request", message: "missing_token" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`proposal_public_view:ip:${ip}:token:${token}`, now, 240, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let rec = null;
  try {
    rec = $app.dao().findFirstRecordByFilter("proposals", "public_token = {:t}", { t: token });
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }

  // Don’t expose draft proposals publicly.
  if (rec.getString("status") === "draft") return c.json(404, { error: "not_found" });

  // Increment view count (best-effort; tolerate races).
  try {
    rec.set("view_count", rec.getInt("view_count") + 1);
    $app.dao().saveRecord(rec);
  } catch (_) {}

  let html = rec.getString("content_html") || "";
  const values = rec.get("variable_values");
  if (html) html = renderTemplate(html, values);

  return c.json(200, {
    ok: true,
    proposal: {
      id: rec.id,
      client_name: rec.getString("client_name"),
      status: rec.getString("status"),
      view_count: rec.getInt("view_count") || 0,
      public_token: rec.getString("public_token"),
      content_html: html,
      accepted_at: rec.getString("accepted_at"),
      signature_name: rec.getString("signature_name"),
    },
  });
});

// Public: accept proposal by token (typed signature name)
routerAdd("POST", "/api/proposal/public/accept", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const body = parsed.value || {};
  const token = String(body.token || "").trim();
  const name = k.clampText(String(body.name || "").trim(), 120);
  if (!token) return c.json(400, { error: "bad_request", message: "missing_token" });
  if (!name) return c.json(400, { error: "bad_request", message: "missing_name" });

  const ip = k.bestEffortClientIp(c?.request?.()) || "";
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`proposal_public_accept:ip:${ip}:token:${token}`, now, 30, 10 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let rec = null;
  try {
    rec = $app.dao().findFirstRecordByFilter("proposals", "public_token = {:t}", { t: token });
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }
  if (rec.getString("status") === "draft") return c.json(404, { error: "not_found" });

  if (rec.getString("status") !== "accepted") {
    rec.set("status", "accepted");
    rec.set("signature_name", name);
    rec.set("accepted_at", new Date().toISOString());
    $app.dao().saveRecord(rec);
    k.auditLog(rec.getString("tenant"), "", "proposal_accepted", { proposalId: rec.id, ip, name });
  }

  return c.json(200, { ok: true, status: rec.getString("status"), accepted_at: rec.getString("accepted_at") });
});

// Internal: bump view count for a proposal id (auth required)
routerAdd("POST", "/api/proposal/:id/view", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });
  const id = c.pathParam("id");
  if (!id) return c.json(400, { error: "bad_request", message: "missing_id" });
  try {
    const rec = $app.dao().findRecordById("proposals", id);
    k.requireRole(user, rec.getString("tenant"), "member");
    rec.set("view_count", rec.getInt("view_count") + 1);
    $app.dao().saveRecord(rec);
    return c.json(200, { ok: true, view_count: rec.getInt("view_count") });
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }
});

onRecordBeforeCreateRequest("templates", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeVars(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .slice(0, 40)
      .map((x) => x.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32))
      .filter(Boolean);
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("name", String(e.record.getString("name") || "").slice(0, 80));
  e.record.set("content_html", clampText(e.record.getString("content_html"), 200_000));
  e.record.set("variables", normalizeVars(e.record.get("variables")));
});

onRecordBeforeUpdateRequest("templates", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeVars(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .slice(0, 40)
      .map((x) => x.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32))
      .filter(Boolean);
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("name", String(e.record.getString("name") || "").slice(0, 80));
  e.record.set("content_html", clampText(e.record.getString("content_html"), 200_000));
  e.record.set("variables", normalizeVars(e.record.get("variables")));
});

onRecordBeforeCreateRequest("proposals", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  if (!e.record.getString("public_token")) e.record.set("public_token", randToken("prop"));
  e.record.set("status", clampEnum(e.record.getString("status"), ["draft", "sent", "accepted"], "draft"));
  e.record.set("view_count", e.record.getInt("view_count") || 0);
  e.record.set("client_name", String(e.record.getString("client_name") || "").slice(0, 120));
  e.record.set("content_html", clampText(e.record.getString("content_html"), 200_000));
  e.record.set("signature_name", clampText(e.record.getString("signature_name"), 120));
});

onRecordBeforeUpdateRequest("proposals", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("status", clampEnum(e.record.getString("status"), ["draft", "sent", "accepted"], "draft"));
  e.record.set("client_name", String(e.record.getString("client_name") || "").slice(0, 120));
  e.record.set("content_html", clampText(e.record.getString("content_html"), 200_000));
  e.record.set("signature_name", clampText(e.record.getString("signature_name"), 120));
});
