// Offer.100SaaS (Tool 45) — PocketBase hooks
// Subdomain: offer.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 45: sign_token generation + signing endpoint + status transition hardening

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

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase().slice(0, 200);
}

function clampEnum(v, allowed, fallback) {
  const s = String(v || "").trim();
  return allowed.includes(s) ? s : fallback;
}

function getClientIp(req) {
  const h = (name) => String(req?.header?.get?.(name) || "").trim();
  return h("CF-Connecting-IP") || h("X-Forwarded-For").split(",")[0].trim() || "";
}

function ensureSignToken(e) {
  const cur = String(e.record.getString("sign_token") || "").trim();
  if (cur && cur.length >= 16) return cur;
  const raw = $security.randomString(32);
  const t = raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32).toLowerCase();
  e.record.set("sign_token", t);
  return t;
}

// Shared Kernel: RevenueCat webhook → entitlements sync
routerAdd("POST", "/api/webhooks/revenuecat", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleRevenueCatWebhook(c);
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "offer_templates", "sent_offers"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "offer", toolNumber: 45, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "offer", toolNumber: 45 });
});
routerAdd("POST", "/api/offer/send", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent, getAuthRecord } = require(__hooks + "/_shared/kernel.js");
  const user = getAuthRecord(c);
  const tenantId = String(c.queryParam("tenant") || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  requireRole(user, tenantId, "member");

  const parsed = parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const body = parsed.value;

  const templateId = String(body?.template_id || "").trim();
  if (!templateId) return c.json(400, { error: "bad_request", message: "missing_template_id" });

  let template;
  try {
    template = $app.dao().findRecordById("offer_templates", templateId);
  } catch (_) {
    return c.json(404, { error: "template_not_found" });
  }
  if (String(template.getString("tenant") || "").trim() !== tenantId) {
    return c.json(403, { error: "forbidden", message: "template_tenant_mismatch" });
  }

  const email = normalizeEmail(body?.candidate_email);
  if (!email) return c.json(400, { error: "bad_request", message: "missing_candidate_email" });

  const offer = new Record($app.dao().findCollectionByNameOrId("sent_offers"));
  offer.set("tenant", tenantId);
  offer.set("template", templateId);
  offer.set("candidate_email", email);
  offer.set("variable_values", body?.variable_values && typeof body.variable_values === "object" ? body.variable_values : {});
  offer.set("status", "sent");
  offer.set("sign_token", $security.randomString(32).replace(/[^a-zA-Z0-9]/g, "").slice(0, 32).toLowerCase());

  try {
    $app.dao().saveRecord(offer);
    return c.json( 200, { status: "sent", offer_id: offer.id, sign_token: offer.getString("sign_token") });
  } catch (e) {
    $app.logger().error("offer send failed", e);
    return c.json( 500, { error: "send_failed" });
  }
});

routerAdd("POST", "/api/offer/sign/:token", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const token = String(c.pathParam("token") || "").trim().toLowerCase();
  if (!token || token.length < 16) return c.json(400, { error: "bad_request", message: "invalid_token" });

  let offer;
  try {
    offer = $app.dao().findFirstRecordByData("sent_offers", "sign_token", token);
  } catch (_) {
    return c.json( 404, { error: "not_found" });
  }

  const curStatus = String(offer.getString("status") || "").trim();
  if (curStatus === "voided") return c.json( 409, { error: "voided" });
  if (curStatus === "signed") return c.json( 200, { status: "already_signed" });

  offer.set("status", "signed");
  offer.set("signed_at", new Date().toISOString());
  offer.set("signer_ip", getClientIp(c.request()));
  $app.dao().saveRecord(offer);

  return c.json( 200, { status: "signed", offer_id: offer.id });
});

onRecordBeforeCreateRequest("offer_templates", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("name", clampText(e.record.getString("name"), 120));
  e.record.set("content_html", clampText(e.record.getString("content_html"), 60000));
  const vars = e.record.get("variables");
  e.record.set("variables", Array.isArray(vars) ? vars.map((x) => clampText(x, 64)).filter(Boolean) : []);
});

onRecordBeforeUpdateRequest("offer_templates", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("name", clampText(e.record.getString("name"), 120));
  e.record.set("content_html", clampText(e.record.getString("content_html"), 60000));
  const vars = e.record.get("variables");
  e.record.set("variables", Array.isArray(vars) ? vars.map((x) => clampText(x, 64)).filter(Boolean) : []);
});

onRecordBeforeCreateRequest("sent_offers", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function ensureSignToken(e2) {
    const cur = String(e2.record.getString("sign_token") || "").trim();
    if (cur && cur.length >= 16) return cur;
    const raw = $security.randomString(32);
    const t = raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32).toLowerCase();
    e2.record.set("sign_token", t);
    return t;
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "member");
  e.record.set("candidate_email", normalizeEmail(e.record.getString("candidate_email")));
  e.record.set("status", clampEnum(e.record.getString("status"), ["draft", "sent", "signed", "voided"], "draft"));
  ensureSignToken(e);
  e.record.set("signer_ip", clampText(e.record.getString("signer_ip"), 64));
});

onRecordBeforeUpdateRequest("sent_offers", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("candidate_email", normalizeEmail(e.record.getString("candidate_email")));
  e.record.set("status", clampEnum(e.record.getString("status"), ["draft", "sent", "signed", "voided"], e.record.getString("status")));
  e.record.set("signer_ip", clampText(e.record.getString("signer_ip"), 64));
});
