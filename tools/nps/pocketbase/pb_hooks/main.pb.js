// NPS.100SaaS (Tool 13) — PocketBase hooks
// Subdomain: nps.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 13: Validate NPS response payload (score 0..10) and prevent obvious spam

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

function clampScore(score) {
  const n = Number(score);
  if (!isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 10) return 10;
  return Math.round(n);
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
  return k.handleBillingStatus(c, { toolSlug: "nps" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "nps" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "nps" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "nps" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "nps" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "surveys", "nps_responses"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "nps", toolNumber: 13, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "nps", toolNumber: 13 });
});

// Tool 13: demo seed (owner-only)
routerAdd("POST", "/api/nps/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`nps_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  // Create one survey if missing.
  let survey = null;
  try {
    const list = $app.dao().findRecordsByFilter("surveys", "tenant.id = {:tid}", "-created", 1, 0, { tid: tenantId });
    survey = list?.[0] || null;
  } catch (_) {}

  if (!survey) {
    const scol = $app.dao().findCollectionByNameOrId("surveys");
    survey = new Record(scol);
    survey.set("tenant", tenantId);
    survey.set("question", "How likely are you to recommend us?");
    survey.set("is_active", true);
    $app.dao().saveRecord(survey);
  }

  const rcol = $app.dao().findCollectionByNameOrId("nps_responses");
  const scores = [10, 9, 8, 2, 4, 7];
  for (let i = 0; i < scores.length; i++) {
    const rec = new Record(rcol);
    rec.set("survey", survey.id);
    rec.set("score", scores[i]);
    rec.set("comment", i === 0 ? "Love it" : i === 3 ? "Too expensive" : "");
    rec.set("user_identifier", `demo_user_${i}`);
    try {
      $app.dao().saveRecord(rec);
    } catch (_) {}
  }

  return c.json(200, { ok: true, survey_id: survey.id });
});
onRecordBeforeCreateRequest("nps_responses", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function clampScore(score) {
    const n = Number(score);
    if (!isFinite(n)) return null;
    if (n < 0) return 0;
    if (n > 10) return 10;
    return Math.round(n);
  }
  const ip = bestEffortClientIp(e.httpContext);
  const surveyId = String(e.record.getString("survey") || "").trim();
  if (ip && surveyId) {
    const now = Date.now();
    if (!allowRequest(`nps_response:${surveyId}:ip:${ip}`, now, 30, 10 * 60 * 1000)) {
      throw new ForbiddenError("rate_limited");
    }
  }
  const score = clampScore(e.record.getInt("score"));
  if (score === null) throw new BadRequestError("invalid_score");
  e.record.set("score", score);

  const comment = String(e.record.getString("comment") || "");
  if (comment.length > 2000) e.record.set("comment", comment.slice(0, 2000));

  const uid = String(e.record.getString("user_identifier") || "");
  if (uid.length > 128) e.record.set("user_identifier", uid.slice(0, 128));
});

// Optional: restrict survey writes to tenant admins
onRecordBeforeCreateRequest("surveys", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
});
