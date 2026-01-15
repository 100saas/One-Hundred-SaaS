// Handoff.100SaaS (Tool 29) — PocketBase hooks
// Subdomain: handoff.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 29: share token generation and download tracking endpoint

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

function clampText(v, maxLen) {
  const s = String(v || "");
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function isExpired(expiresAtIso) {
  if (!expiresAtIso) return false;
  const t = Date.parse(String(expiresAtIso));
  if (!isFinite(t)) return false;
  return t < Date.now();
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
  return k.handleBillingStatus(c, { toolSlug: "handoff" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "handoff" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "handoff" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "handoff" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "handoff" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "packages", "package_files"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "handoff", toolNumber: 29, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "handoff", toolNumber: 29 });
});

// Tool 29: demo seed (owner-only)
routerAdd("POST", "/api/handoff/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`handoff_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) {
    return c.json(403, { error: "forbidden", message: "rate_limited" });
  }

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const pkgCol = $app.dao().findCollectionByNameOrId("packages");
  const pkg = new Record(pkgCol);
  pkg.set("tenant", tenantId);
  pkg.set("client_name", "Acme Studio");
  pkg.set("title", "Website Launch Assets");
  pkg.set("share_token", k.randToken("pkg"));
  $app.dao().saveRecord(pkg);

  const fileCol = $app.dao().findCollectionByNameOrId("package_files");
  const placeholder = new Record(fileCol);
  placeholder.set("package", pkg.id);
  placeholder.set("label", "Readme");
  // File upload should be done via UI; placeholder keeps demos consistent.
  placeholder.set("file", "");
  try {
    $app.dao().saveRecord(placeholder);
  } catch (_) {}

  return c.json(200, { ok: true, packageId: pkg.id, share_token: pkg.getString("share_token") });
});

// Public: get package + file urls by share token
routerAdd("GET", "/api/handoff/public/package", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  function fileUrl(collection, recordId, filename) {
    return `/api/files/${encodeURIComponent(collection)}/${encodeURIComponent(recordId)}/${encodeURIComponent(filename)}`;
  }
  const token = String(c.queryParam("token") || "").trim();
  if (!token) return c.json(400, { error: "bad_request", message: "missing_token" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`handoff_public_package:ip:${ip}:token:${token}`, now, 240, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let pkg = null;
  try {
    pkg = $app.dao().findFirstRecordByFilter("packages", "share_token = {:t}", { t: token });
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }
  if (k.isExpired(pkg.getString("expires_at"))) return c.json(410, { error: "expired" });

  const files = [];
  try {
    const list = $app.dao().findRecordsByFilter("package_files", "package.id = {:pid}", "-created", 200, 0, { pid: pkg.id });
    for (const r of list || []) {
      const raw = r.get("file");
      const filename = Array.isArray(raw) ? String(raw[0] || "") : String(raw || "");
      if (!filename) continue;
      files.push({ id: r.id, label: r.getString("label"), filename, url: fileUrl("package_files", r.id, filename) });
    }
  } catch (_) {}

  return c.json(200, {
    ok: true,
    package: {
      id: pkg.id,
      client_name: pkg.getString("client_name"),
      title: pkg.getString("title"),
      expires_at: pkg.getString("expires_at"),
      download_count: pkg.getInt("download_count"),
    },
    files,
  });
});

routerAdd("POST", "/api/track-download/:id", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const id = c.pathParam("id");
  if (!id) return c.json(400, { error: "bad_request", message: "missing_id" });
  const user = k.getAuthRecord(c);
  const parsed = k.parseJsonBody(c);
  const token = String(parsed.ok ? parsed.value?.token || "" : "").trim();
  const ip = k.bestEffortClientIp(c?.request?.()) || "";
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`handoff_track_download:ip:${ip}:id:${id}`, now, 120, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }
  try {
    const pkg = $app.dao().findRecordById("packages", id);
    if (k.isExpired(pkg.getString("expires_at"))) return c.json(410, { error: "expired" });
    if (!user) {
      if (!token) return c.json(400, { error: "bad_request", message: "missing_token" });
      if (token !== pkg.getString("share_token")) return c.json(403, { error: "forbidden", message: "invalid_token" });
    }
    pkg.set("download_count", pkg.getInt("download_count") + 1);
    $app.dao().saveRecord(pkg);
    return c.json(200, { ok: true, download_count: pkg.getInt("download_count") });
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }
});

onRecordBeforeCreateRequest("packages", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  if (!e.record.getString("share_token")) e.record.set("share_token", randToken("pkg"));
  e.record.set("client_name", clampText(e.record.getString("client_name"), 120));
  e.record.set("title", clampText(e.record.getString("title"), 140));
  e.record.set("download_count", e.record.getInt("download_count") || 0);
});

onRecordBeforeCreateRequest("package_files", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const packageId = e.record.getString("package");
  if (!packageId) throw new BadRequestError("missing_package");
  const pkg = $app.dao().findRecordById("packages", packageId);
  const tenantId = pkg.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");

  const label = clampText(e.record.getString("label"), 80);
  e.record.set("label", label);
});
