// Help.100SaaS (Tool 20) — PocketBase hooks
// Subdomain: help.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Shared Kernel: self-serve onboarding + billing + Stripe connect
// - Tool 20: Denormalize tenant_slug and clamp markdown lengths; view_count increment endpoint

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

function setTenantSlugFromTenantId(record, tenantId) {
  if (!tenantId) return;
  try {
    const tenant = $app.dao().findRecordById("tenants", tenantId);
    record.set("tenant_slug", tenant.getString("slug") || "");
  } catch (_) {}
}

function clampText(s, maxLen) {
  const v = String(s || "");
  return v.length > maxLen ? v.slice(0, maxLen) : v;
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
  return k.handleBillingStatus(c, { toolSlug: "help" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "help" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "help" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "help" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "help" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "collections", "articles"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "help", toolNumber: 20, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "help", toolNumber: 20 });
});

// Tool 20: demo seed (owner-only)
routerAdd("POST", "/api/help/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`help_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const catCol = $app.dao().findCollectionByNameOrId("collections");
  const artCol = $app.dao().findCollectionByNameOrId("articles");

  const cat = new Record(catCol);
  cat.set("tenant", tenantId);
  cat.set("name", "Getting Started");
  cat.set("slug", "getting-started");
  cat.set("icon", "book");
  setTenantSlugFromTenantId(cat, tenantId);
  $app.dao().saveRecord(cat);

  const art = new Record(artCol);
  art.set("collection", cat.id);
  art.set("title", "Welcome");
  art.set("slug", "welcome");
  art.set("body_markdown", "# Welcome\n\nThis is your new knowledge base.\n");
  art.set("is_published", true);
  art.set("view_count", 0);
  $app.dao().saveRecord(art);

  return c.json(200, { ok: true, tenantSlug: cat.getString("tenant_slug") || "", articleSlug: art.getString("slug") || "" });
});

// Public: fetch KB content by tenant_slug (and optional search query)
routerAdd("GET", "/api/help/public/kb", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const tenantSlug = String(c.queryParam("slug") || c.queryParam("tenant_slug") || "").trim();
  if (!tenantSlug) return c.json(400, { error: "bad_request", message: "missing_tenant_slug" });

  const q = k.clampText(String(c.queryParam("q") || "").trim(), 200);

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`help_public_kb:ip:${ip}:slug:${tenantSlug}`, now, 240, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let cats = [];
  try {
    cats = $app.dao().findRecordsByFilter("collections", "tenant_slug = {:s}", "-created", 100, 0, { s: tenantSlug });
  } catch (_) {
    cats = [];
  }

  let arts = [];
  try {
    if (q) {
      arts = $app.dao().findRecordsByFilter(
        "articles",
        "is_published = true && (collection.tenant_slug = {:s}) && (title ~ {:q} || body_markdown ~ {:q})",
        "-created",
        200,
        0,
        { s: tenantSlug, q },
      );
    } else {
      arts = $app.dao().findRecordsByFilter(
        "articles",
        "is_published = true && (collection.tenant_slug = {:s})",
        "-created",
        200,
        0,
        { s: tenantSlug },
      );
    }
  } catch (_) {
    arts = [];
  }

  return c.json(200, {
    ok: true,
    tenant_slug: tenantSlug,
    collections: cats.map((r) => ({ id: r.id, name: r.getString("name"), slug: r.getString("slug"), icon: r.getString("icon") })),
    articles: arts.map((r) => ({
      id: r.id,
      collection: r.getString("collection"),
      title: r.getString("title"),
      slug: r.getString("slug"),
      view_count: r.getInt("view_count") || 0,
    })),
  });
});

// Public: fetch a single published article by tenant_slug + article slug
routerAdd("GET", "/api/help/public/article", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const tenantSlug = String(c.queryParam("slug") || c.queryParam("tenant_slug") || "").trim();
  const articleSlug = String(c.queryParam("article") || c.queryParam("article_slug") || "").trim();
  if (!tenantSlug) return c.json(400, { error: "bad_request", message: "missing_tenant_slug" });
  if (!articleSlug) return c.json(400, { error: "bad_request", message: "missing_article_slug" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`help_public_article:ip:${ip}:slug:${tenantSlug}:a:${articleSlug}`, now, 240, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  try {
    const art = $app.dao().findFirstRecordByFilter(
      "articles",
      "is_published = true && (collection.tenant_slug = {:s}) && slug = {:a}",
      { s: tenantSlug, a: articleSlug },
    );
    return c.json(200, {
      ok: true,
      article: {
        id: art.id,
        title: art.getString("title"),
        slug: art.getString("slug"),
        body_markdown: art.getString("body_markdown"),
        view_count: art.getInt("view_count") || 0,
        collection: art.getString("collection"),
      },
    });
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }
});

// Public: increment view count
routerAdd("POST", "/api/kb/article/:id/view", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const id = c.pathParam("id");
  if (!id) return c.json(400, { error: "bad_request", message: "missing_id" });
  const ip = bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!allowRequest(`help_article_view:ip:${ip}:id:${id}`, now, 30, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }
  try {
    const art = $app.dao().findRecordById("articles", id);
    if (!art.getBool("is_published")) return c.json(404, { error: "not_found" });
    art.set("view_count", art.getInt("view_count") + 1);
    $app.dao().saveRecord(art);
    return c.json( 200, { ok: true, view_count: art.getInt("view_count") });
  } catch (_) {
    return c.json( 404, { error: "not_found" });
  }
});

onRecordBeforeCreateRequest("collections", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  setTenantSlugFromTenantId(e.record, tenantId);
  e.record.set("name", clampText(e.record.getString("name"), 80));
  e.record.set("slug", clampText(e.record.getString("slug"), 80));
  e.record.set("icon", clampText(e.record.getString("icon"), 40));
});

onRecordBeforeUpdateRequest("collections", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  setTenantSlugFromTenantId(e.record, tenantId);
  e.record.set("name", clampText(e.record.getString("name"), 80));
  e.record.set("slug", clampText(e.record.getString("slug"), 80));
  e.record.set("icon", clampText(e.record.getString("icon"), 40));
});

onRecordBeforeCreateRequest("articles", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  if (!user) throw new ForbiddenError("auth_required");

  // Resolve tenant via collection → tenant, and enforce admin role.
  const collectionId = e.record.getString("collection");
  if (collectionId) {
    const col = $app.dao().findRecordById("collections", collectionId);
    const tenantId = col.getString("tenant");
    if (tenantId) requireRole(user, tenantId, "admin");
  }

  e.record.set("title", clampText(e.record.getString("title"), 140));
  e.record.set("slug", clampText(e.record.getString("slug"), 140));
  e.record.set("body_markdown", clampText(e.record.getString("body_markdown"), 50_000));
  e.record.set("view_count", e.record.getInt("view_count") || 0);
});

onRecordBeforeUpdateRequest("articles", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  if (!user) throw new ForbiddenError("auth_required");

  const collectionId = e.record.getString("collection");
  if (collectionId) {
    const col = $app.dao().findRecordById("collections", collectionId);
    const tenantId = col.getString("tenant");
    if (tenantId) requireRole(user, tenantId, "admin");
  }

  e.record.set("title", clampText(e.record.getString("title"), 140));
  e.record.set("slug", clampText(e.record.getString("slug"), 140));
  e.record.set("body_markdown", clampText(e.record.getString("body_markdown"), 50_000));
});
