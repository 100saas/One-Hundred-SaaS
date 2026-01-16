// Reviews.100SaaS (Tool 36) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 36: Slug normalization and rating clamping; submission endpoint to decide redirect vs feedback

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

function normalizeSlug(v) {
  return String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function clampRating(v) {
  const n = Number(v);
  if (!isFinite(n)) return 0;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function clampText(v, maxLen) {
  const s = String(v || "");
  return s.length > maxLen ? s.slice(0, maxLen) : s;
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
  return k.handleBillingStatus(c, { toolSlug: "reviews" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "reviews" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "reviews" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "reviews" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "reviews" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "campaigns", "feedback_entries"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "reviews", toolNumber: 36, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "reviews", toolNumber: 36 });
});

// Tool 36: demo seed (owner-only)
routerAdd("POST", "/api/reviews/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`reviews_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) {
    return c.json(403, { error: "forbidden", message: "rate_limited" });
  }

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const col = $app.dao().findCollectionByNameOrId("campaigns");
  const rec = new Record(col);
  rec.set("tenant", tenantId);
  rec.set("name", "Acme Coffee");
  rec.set("google_maps_link", "https://www.google.com/maps");
  rec.set("min_stars", 4);
  rec.set("slug", normalizeSlug("acme-coffee"));
  $app.dao().saveRecord(rec);

  return c.json(200, { ok: true, campaignId: rec.id, slug: rec.getString("slug") });
});

// Public: fetch campaign by slug (for /rate/:slug)
routerAdd("GET", "/api/reviews/public/campaign", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  function fileUrl(collection, recordId, filename) {
    return `/api/files/${encodeURIComponent(collection)}/${encodeURIComponent(recordId)}/${encodeURIComponent(filename)}`;
  }
  const slug = normalizeSlug(String(c.queryParam("slug") || ""));
  if (!slug) return c.json(400, { error: "bad_request", message: "missing_slug" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`reviews_public_campaign:ip:${ip}:slug:${slug}`, now, 240, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let campaign = null;
  try {
    campaign = $app.dao().findFirstRecordByData("campaigns", "slug", slug);
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }

  const rawLogo = campaign.get("logo");
  const logoName = Array.isArray(rawLogo) ? String(rawLogo[0] || "") : String(rawLogo || "");
  return c.json(200, {
    ok: true,
    campaign: {
      id: campaign.id,
      name: campaign.getString("name"),
      google_maps_link: campaign.getString("google_maps_link"),
      min_stars: campaign.getInt("min_stars") || 4,
      slug: campaign.getString("slug"),
      logo: logoName ? { name: logoName, url: fileUrl("campaigns", campaign.id, logoName) } : null,
    },
  });
});
// Public submit helper: returns action = redirect|feedback
routerAdd("POST", "/api/reviews/submit", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function clampRating(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    if (n < 1) return 1;
    if (n > 5) return 5;
    return Math.round(n);
  }
  const parsed = parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const body = parsed.value;

  const slug = normalizeSlug(body?.slug);
  const rating = clampRating(body?.rating);

  if (!slug) return c.json(400, { error: "bad_request", message: "missing_slug" });

  try {
    const campaign = $app.dao().findFirstRecordByData("campaigns", "slug", slug);
    const minStars = campaign.getInt("min_stars") || 4;
    const maps = campaign.getString("google_maps_link") || "";

    if (rating >= minStars) {
      return c.json( 200, { action: "redirect", url: maps });
    }

    // Save feedback entry
    const col = $app.dao().findCollectionByNameOrId("feedback_entries");
    const rec = new Record(col);
    rec.set("campaign", campaign.id);
    rec.set("rating", rating);
    rec.set("message", clampText(body?.message, 2000));
    rec.set("contact_email", clampText(body?.contact_email, 254));
    $app.dao().saveRecord(rec);

    return c.json( 200, { action: "feedback_saved" });
  } catch (e) {
    return c.json( 404, { error: "campaign_not_found" });
  }
});

onRecordBeforeCreateRequest("campaigns", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("slug", normalizeSlug(e.record.getString("slug")));
  e.record.set("min_stars", Math.max(1, Math.min(5, e.record.getInt("min_stars") || 4)));
  e.record.set("name", clampText(e.record.getString("name"), 80));
});

onRecordBeforeCreateRequest("feedback_entries", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function clampRating(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    if (n < 1) return 1;
    if (n > 5) return 5;
    return Math.round(n);
  }
  e.record.set("rating", clampRating(e.record.getInt("rating")));
  e.record.set("message", clampText(e.record.getString("message"), 2000));
  e.record.set("contact_email", clampText(e.record.getString("contact_email"), 254));
});
