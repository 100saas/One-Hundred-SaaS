// VAT.100SaaS (Tool 6) — PocketBase hooks
// Subdomain: vat.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 6: `POST /api/validate` → VIES validation with 30-day cache

const ROLE_ORDER = ["viewer", "member", "admin", "owner"];

function json(c, status, payload) {
  return c.json(status, payload);
}

function badRequest(c, message) {
  return c.json( 400, { error: "bad_request", message });
}

function unauthorized(c, message) {
  return c.json( 401, { error: "unauthorized", message });
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

function computeCachedUntilIso(nowMs) {
  return new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString();
}

function isCacheValid(cachedUntilIso, nowMs) {
  if (!cachedUntilIso) return false;
  const t = Date.parse(String(cachedUntilIso));
  if (!isFinite(t)) return false;
  return t > nowMs;
}

function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildViesSoapRequest(countryCode, vatNumber) {
  const cc = String(countryCode || "").trim().toUpperCase();
  const vn = String(vatNumber || "").trim();
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <checkVat xmlns="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
      <countryCode>${escapeXml(cc)}</countryCode>
      <vatNumber>${escapeXml(vn)}</vatNumber>
    </checkVat>
  </soap:Body>
</soap:Envelope>`;
}

function parseViesSoapResponse(xml) {
  const get = (tag) => {
    const m = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
    return m ? m[1].trim() : "";
  };
  const valid = get("valid").toLowerCase() === "true";
  return {
    valid,
    name: get("name"),
    address: get("address"),
    requestDate: get("requestDate"),
  };
}

function getSoftFailForTenant(tenantId) {
  try {
    const settings = $app.dao().findFirstRecordByFilter("vat_settings", "tenant.id = {:tid}", { tid: tenantId });
    return settings.getBool("soft_fail");
  } catch (_) {
    return true; // default soft fail
  }
}

function findCachedValidation(tenantId, countryCode, vatNumber) {
  try {
    return $app
      .dao()
      .findFirstRecordByFilter(
        "tax_validations",
        "tenant.id = {:tid} && country_code = {:cc} && vat_number = {:vn}",
        { tid: tenantId, cc: countryCode, vn: vatNumber },
      );
  } catch (_) {
    return null;
  }
}

function upsertValidation(tenantId, countryCode, vatNumber, result, cachedUntilIso) {
  const existing = findCachedValidation(tenantId, countryCode, vatNumber);
  const collection = $app.dao().findCollectionByNameOrId("tax_validations");
  const record = existing || new Record(collection);

  record.set("tenant", tenantId);
  record.set("country_code", countryCode);
  record.set("vat_number", vatNumber);
  record.set("is_valid", !!result.valid);
  record.set("company_name", result.name || "");
  record.set("cached_until", cachedUntilIso);

  $app.dao().saveRecord(record);
  return record;
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
  return k.handleBillingStatus(c, { toolSlug: "vat" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "vat" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "vat" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "vat" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "vat" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "footer_rules", "tax_validations", "vat_settings"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "vat", toolNumber: 6, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "vat", toolNumber: 6 });
});
// Tool 6: Validate VAT ID via VIES (with cache)
routerAdd("POST", "/api/validate", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent, getAuthRecord } = require(__hooks + "/_shared/kernel.js");
  function computeCachedUntilIso(nowMs) {
    return new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  function isCacheValid(cachedUntilIso, nowMs) {
    if (!cachedUntilIso) return false;
    const t = Date.parse(String(cachedUntilIso));
    if (!isFinite(t)) return false;
    return t > nowMs;
  }

  function escapeXml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }

  function buildViesSoapRequest(countryCode, vatNumber) {
    const cc = String(countryCode || "").trim().toUpperCase();
    const vn = String(vatNumber || "").trim();
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <checkVat xmlns="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
      <countryCode>${escapeXml(cc)}</countryCode>
      <vatNumber>${escapeXml(vn)}</vatNumber>
    </checkVat>
  </soap:Body>
</soap:Envelope>`;
  }

  function parseViesSoapResponse(xml) {
    const get = (tag) => {
      const m = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
      return m ? m[1].trim() : "";
    };
    const valid = get("valid").toLowerCase() === "true";
    return {
      valid,
      name: get("name"),
      address: get("address"),
      requestDate: get("requestDate"),
    };
  }

  function getSoftFailForTenant(tenantId) {
    try {
      const settings = $app.dao().findFirstRecordByFilter("vat_settings", "tenant.id = {:tid}", { tid: tenantId });
      return settings.getBool("soft_fail");
    } catch (_) {
      return true;
    }
  }

  function findCachedValidation(tenantId, countryCode, vatNumber) {
    try {
      return $app
        .dao()
        .findFirstRecordByFilter(
          "tax_validations",
          "tenant.id = {:tid} && country_code = {:cc} && vat_number = {:vn}",
          { tid: tenantId, cc: countryCode, vn: vatNumber },
        );
    } catch (_) {
      return null;
    }
  }

  function upsertValidation(tenantId, countryCode, vatNumber, result, cachedUntilIso) {
    const existing = findCachedValidation(tenantId, countryCode, vatNumber);
    const collection = $app.dao().findCollectionByNameOrId("tax_validations");
    const record = existing || new Record(collection);

    record.set("tenant", tenantId);
    record.set("country_code", countryCode);
    record.set("vat_number", vatNumber);
    record.set("is_valid", !!result.valid);
    record.set("company_name", result.name || "");
    record.set("cached_until", cachedUntilIso);

    $app.dao().saveRecord(record);
    return record;
  }
  const user = getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const parsed = parseJsonBody(c);
  if (!parsed.ok) {
    return c.json(400, { error: "bad_request", message: "invalid_json" });
  }
  const payload = parsed.value;

  const tenantId = payload?.tenant_id ? String(payload.tenant_id) : "";
  const countryCode = payload?.country_code ? String(payload.country_code).trim().toUpperCase() : "";
  const vatNumber = payload?.vat_number ? String(payload.vat_number).trim() : "";

  if (!tenantId || !countryCode || !vatNumber) return c.json(400, { error: "bad_request", message: "missing_fields" });
  requireRole(user, tenantId, "member");

  const nowMs = Date.now();
  const cached = findCachedValidation(tenantId, countryCode, vatNumber);
  if (cached && isCacheValid(cached.getString("cached_until"), nowMs)) {
    return c.json( 200, {
      cached: true,
      valid: cached.getBool("is_valid"),
      company_name: cached.getString("company_name"),
      cached_until: cached.getString("cached_until"),
    });
  }

  const softFail = getSoftFailForTenant(tenantId);
  const body = buildViesSoapRequest(countryCode, vatNumber);

  try {
    const res = $http.send({
      url: "https://ec.europa.eu/taxation_customs/vies/services/checkVatService",
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8" },
      body,
    });
    const xml = res?.body ? String(res.body) : "";
    const parsed = parseViesSoapResponse(xml);
    const cachedUntil = computeCachedUntilIso(nowMs);
    const record = upsertValidation(tenantId, countryCode, vatNumber, parsed, cachedUntil);

    return c.json( 200, {
      cached: false,
      valid: record.getBool("is_valid"),
      company_name: record.getString("company_name"),
      cached_until: record.getString("cached_until"),
    });
  } catch (e) {
    $app.logger().warn("VIES validation failed", e);
    if (softFail) {
      return c.json( 200, {
        cached: false,
        valid: null,
        company_name: "",
        error: "vies_unavailable",
      });
    }
    return c.json( 503, { error: "vies_unavailable" });
  }
});

// Tool 6: Settings (soft_fail toggle)
routerAdd("GET", "/api/vat/settings", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const tenantId = String(c.queryParam("tenant") || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "member");

  try {
    const settings = $app.dao().findFirstRecordByFilter("vat_settings", "tenant.id = {:tid}", { tid: tenantId });
    return c.json(200, { soft_fail: settings.getBool("soft_fail") });
  } catch (_) {
    return c.json(200, { soft_fail: true });
  }
});

routerAdd("POST", "/api/vat/settings", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`vat_settings:user:${user.id}`, now, 60, 60 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const payload = parsed.value || {};

  const tenantId = String(payload.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const softFail = Boolean(payload.soft_fail);

  let existing = null;
  try {
    existing = $app.dao().findFirstRecordByFilter("vat_settings", "tenant.id = {:tid}", { tid: tenantId });
  } catch (_) {}

  const col = $app.dao().findCollectionByNameOrId("vat_settings");
  const rec = existing || new Record(col);
  rec.set("tenant", tenantId);
  rec.set("soft_fail", softFail);
  $app.dao().saveRecord(rec);
  return c.json(200, { ok: true, soft_fail: softFail });
});

// Tool 6: Demo seed (avoid relying on VIES availability)
routerAdd("POST", "/api/vat/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`vat_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const countryCode = "DE";
  const vatNumber = "123456789";
  const cachedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  let existing = null;
  try {
    existing = $app.dao().findFirstRecordByFilter(
      "tax_validations",
      "tenant.id = {:tid} && country_code = {:cc} && vat_number = {:vn}",
      { tid: tenantId, cc: countryCode, vn: vatNumber },
    );
  } catch (_) {}

  const col = $app.dao().findCollectionByNameOrId("tax_validations");
  const rec = existing || new Record(col);
  rec.set("tenant", tenantId);
  rec.set("country_code", countryCode);
  rec.set("vat_number", vatNumber);
  rec.set("is_valid", true);
  rec.set("company_name", "Demo GmbH");
  rec.set("cached_until", cachedUntil);
  $app.dao().saveRecord(rec);

  return c.json(200, { ok: true, seeded: { country_code: countryCode, vat_number: vatNumber } });
});
