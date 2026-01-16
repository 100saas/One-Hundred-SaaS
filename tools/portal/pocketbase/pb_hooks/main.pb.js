// Portal.100SaaS (Tool 22) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Shared Kernel: self-serve onboarding + billing + Stripe connect
// - Tool 22: Generate access_code and basic item validation

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

function randCode() {
  return $security.randomString(10).toLowerCase();
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
  return k.handleBillingStatus(c, { toolSlug: "portal" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "portal" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "portal" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "portal" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "portal" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "clients", "portal_items"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "portal", toolNumber: 22, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "portal", toolNumber: 22 });
});

// Tool 22: demo seed (owner-only)
routerAdd("POST", "/api/portal/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`portal_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const clientCol = $app.dao().findCollectionByNameOrId("clients");
  const itemsCol = $app.dao().findCollectionByNameOrId("portal_items");

  const client = new Record(clientCol);
  client.set("tenant", tenantId);
  client.set("company_name", "Acme Corp");
  client.set("access_code", k.randCode());
  $app.dao().saveRecord(client);

  const task = new Record(itemsCol);
  task.set("client", client.id);
  task.set("type", "task");
  task.set("title", "Upload your logo");
  task.set("is_completed", false);
  task.set("url_or_file", { kind: "note", text: "Reply to this task with a link." });
  $app.dao().saveRecord(task);

  const link = new Record(itemsCol);
  link.set("client", client.id);
  link.set("type", "link");
  link.set("title", "Project brief");
  link.set("url_or_file", { kind: "url", url: "https://example.com/brief" });
  link.set("is_completed", true);
  $app.dao().saveRecord(link);

  return c.json(200, { ok: true, access_code: client.getString("access_code"), clientId: client.id });
});

// Public: fetch client + portal items by access code
routerAdd("GET", "/api/portal/public/client", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const code = String(c.queryParam("code") || "").trim();
  if (!code) return c.json(400, { error: "bad_request", message: "missing_code" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`portal_public_client:ip:${ip}:code:${code}`, now, 240, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let client = null;
  try {
    client = $app.dao().findFirstRecordByFilter("clients", "access_code = {:c}", { c: code });
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }

  let items = [];
  try {
    items = $app.dao().findRecordsByFilter("portal_items", "client = {:id}", "-created", 500, 0, { id: client.id });
  } catch (_) {
    items = [];
  }

  return c.json(200, {
    ok: true,
    client: { id: client.id, company_name: client.getString("company_name"), access_code: client.getString("access_code") },
    items: items.map((it) => ({
      id: it.id,
      type: it.getString("type"),
      title: it.getString("title"),
      is_completed: !!it.getBool("is_completed"),
      url_or_file: it.get("url_or_file") || null,
    })),
  });
});

// Public: toggle a task completion (validates access_code against item->client)
routerAdd("POST", "/api/portal/public/item/toggle", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const body = parsed.value || {};

  const code = String(body.code || "").trim();
  const itemId = String(body.item || "").trim();
  if (!code) return c.json(400, { error: "bad_request", message: "missing_code" });
  if (!itemId) return c.json(400, { error: "bad_request", message: "missing_item" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`portal_public_toggle:ip:${ip}:item:${itemId}`, now, 60, 10 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let item = null;
  try {
    item = $app.dao().findRecordById("portal_items", itemId);
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }

  let client = null;
  try {
    client = $app.dao().findRecordById("clients", item.getString("client"));
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }

  if (client.getString("access_code") !== code) return c.json(403, { error: "forbidden", message: "invalid_code" });
  if (item.getString("type") !== "task") return c.json(400, { error: "bad_request", message: "not_a_task" });

  item.set("is_completed", !item.getBool("is_completed"));
  $app.dao().saveRecord(item);

  return c.json(200, { ok: true, is_completed: !!item.getBool("is_completed") });
});
onRecordBeforeCreateRequest("clients", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  if (!e.record.getString("access_code")) e.record.set("access_code", randCode());
  const name = String(e.record.getString("company_name") || "");
  if (name.length > 120) e.record.set("company_name", name.slice(0, 120));
});

onRecordBeforeCreateRequest("portal_items", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const clientId = e.record.getString("client");
  if (!clientId) throw new BadRequestError("missing_client");
  // If internal user exists, enforce membership through client tenant.
  const user = e.httpContext?.auth?.record || null;
  if (user) {
    const client = $app.dao().findRecordById("clients", clientId);
    const tenantId = client.getString("tenant");
    if (tenantId) requireRole(user, tenantId, "admin");
  }

  e.record.set("type", clampEnum(e.record.getString("type"), ["file", "link", "invoice", "task"], "task"));
  const title = String(e.record.getString("title") || "").trim();
  e.record.set("title", title.slice(0, 140));
  e.record.set("is_completed", !!e.record.getBool("is_completed"));
});

onRecordBeforeUpdateRequest("portal_items", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const clientId = e.record.getString("client");
  const user = e.httpContext?.auth?.record || null;
  if (user && clientId) {
    const client = $app.dao().findRecordById("clients", clientId);
    const tenantId = client.getString("tenant");
    if (tenantId) requireRole(user, tenantId, "admin");
  }

  e.record.set("type", clampEnum(e.record.getString("type"), ["file", "link", "invoice", "task"], "task"));
  const title = String(e.record.getString("title") || "").trim();
  e.record.set("title", title.slice(0, 140));
});
