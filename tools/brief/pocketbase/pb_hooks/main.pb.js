// Brief.100SaaS (Tool 33) — PocketBase hooks
// Subdomain: brief.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 33: Generate writer_link token and validate template sections

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

function clampText(v, maxLen) {
  const s = String(v || "");
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function normalizeSections(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const s of value.slice(0, 50)) {
    const title = clampText(String(s?.title || "").trim(), 80);
    const type = String(s?.type || "text").trim();
    if (!title) continue;
    out.push({ title, type: type === "input" ? "input" : "text" });
  }
  return out;
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
  return k.handleBillingStatus(c, { toolSlug: "brief" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "brief" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "brief" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "brief" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "brief" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "brief_templates", "briefs"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "brief", toolNumber: 33, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "brief", toolNumber: 33 });
});

// Tool 33: demo seed (owner-only)
routerAdd("POST", "/api/brief/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`brief_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) {
    return c.json(403, { error: "forbidden", message: "rate_limited" });
  }

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const tmplCol = $app.dao().findCollectionByNameOrId("brief_templates");
  const tmpl = new Record(tmplCol);
  tmpl.set("tenant", tenantId);
  tmpl.set("name", "Blog Post");
  tmpl.set("sections", [{ title: "Target Audience", type: "text" }, { title: "Primary Keyword", type: "input" }]);
  $app.dao().saveRecord(tmpl);

  const briefsCol = $app.dao().findCollectionByNameOrId("briefs");
  const brief = new Record(briefsCol);
  brief.set("tenant", tenantId);
  brief.set("title", "How to pick a SaaS niche");
  brief.set("template", tmpl.id);
  brief.set("content_data", { "Target Audience": "Solo founders", "Primary Keyword": "micro saas" });
  brief.set("status", "draft");
  brief.set("writer_link", k.randToken("w"));
  $app.dao().saveRecord(brief);

  return c.json(200, { ok: true, templateId: tmpl.id, briefId: brief.id, writer_link: brief.getString("writer_link") });
});

// Public: get brief by writer token (renders via web app)
routerAdd("GET", "/api/brief/public/brief", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const token = String(c.queryParam("token") || "").trim();
  if (!token) return c.json(400, { error: "bad_request", message: "missing_token" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`brief_public_brief:ip:${ip}:token:${token}`, now, 240, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let brief = null;
  try {
    brief = $app.dao().findFirstRecordByFilter("briefs", "writer_link = {:t}", { t: token });
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }

  let template = null;
  const templateId = String(brief.getString("template") || "").trim();
  if (templateId) {
    try {
      template = $app.dao().findRecordById("brief_templates", templateId);
    } catch (_) {
      template = null;
    }
  }

  return c.json(200, {
    ok: true,
    brief: {
      id: brief.id,
      title: brief.getString("title"),
      status: brief.getString("status"),
      content_data: k.parseJsonValue(brief.get("content_data"), {}),
    },
    template: template
      ? { id: template.id, name: template.getString("name"), sections: k.parseJsonValue(template.get("sections"), []) }
      : null,
  });
});
onRecordBeforeCreateRequest("brief_templates", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeSections(value) {
    if (!Array.isArray(value)) return [];
    const out = [];
    for (const s of value.slice(0, 50)) {
      const title = clampText(String(s?.title || "").trim(), 80);
      const type = String(s?.type || "text").trim();
      if (!title) continue;
      out.push({ title, type: type === "input" ? "input" : "text" });
    }
    return out;
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("name", clampText(e.record.getString("name"), 80));
  e.record.set("sections", normalizeSections(e.record.get("sections")));
});

onRecordBeforeUpdateRequest("brief_templates", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeSections(value) {
    if (!Array.isArray(value)) return [];
    const out = [];
    for (const s of value.slice(0, 50)) {
      const title = clampText(String(s?.title || "").trim(), 80);
      const type = String(s?.type || "text").trim();
      if (!title) continue;
      out.push({ title, type: type === "input" ? "input" : "text" });
    }
    return out;
  }
  e.record.set("name", clampText(e.record.getString("name"), 80));
  e.record.set("sections", normalizeSections(e.record.get("sections")));
});

onRecordBeforeCreateRequest("briefs", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "member");
  const templateId = String(e.record.getString("template") || "").trim();
  if (templateId) {
    const tmpl = $app.dao().findRecordById("brief_templates", templateId);
    if (tenantId && tmpl.getString("tenant") !== tenantId) throw new ForbiddenError("template_wrong_tenant");
  }
  if (!e.record.getString("writer_link")) e.record.set("writer_link", randToken("w"));
  e.record.set("title", clampText(e.record.getString("title"), 140));
  e.record.set("status", clampEnum(e.record.getString("status"), ["draft", "approved"], "draft"));
});

onRecordBeforeUpdateRequest("briefs", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const tenantId = e.record.getString("tenant");
  const templateId = String(e.record.getString("template") || "").trim();
  if (templateId) {
    const tmpl = $app.dao().findRecordById("brief_templates", templateId);
    if (tenantId && tmpl.getString("tenant") !== tenantId) throw new ForbiddenError("template_wrong_tenant");
  }
  e.record.set("title", clampText(e.record.getString("title"), 140));
  e.record.set("status", clampEnum(e.record.getString("status"), ["draft", "approved"], "draft"));
});
