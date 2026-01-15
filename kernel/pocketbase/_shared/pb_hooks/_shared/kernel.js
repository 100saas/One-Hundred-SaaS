const ROLE_ORDER = ["viewer", "member", "admin", "owner"];

function json(c, status, payload) {
  return c.json(status, payload);
}

function safeString(v) {
  return v === null || v === undefined ? "" : String(v);
}

function badRequest(c, message, extra) {
  return json(c, 400, { error: "bad_request", message, ...(extra || {}) });
}

function unauthorized(c, message, extra) {
  return json(c, 401, { error: "unauthorized", message, ...(extra || {}) });
}

function forbidden(c, message, extra) {
  return json(c, 403, { error: "forbidden", message, ...(extra || {}) });
}

function internalError(c, message, extra) {
  return json(c, 500, { error: "internal_error", message, ...(extra || {}) });
}

function serviceUnavailable(c, error, extra) {
  return json(c, 503, { error: safeString(error) || "service_unavailable", ...(extra || {}) });
}

function ok(c, payload) {
  return json(c, 200, payload || { ok: true });
}

function auditLog(tenantId, actorId, action, meta) {
  try {
    const auditCollection = $app.dao().findCollectionByNameOrId("audit_logs");
    const rec = new Record(auditCollection);
    rec.set("tenant", safeString(tenantId));
    rec.set("actor", safeString(actorId) || "");
    rec.set("action", clampText(action, 120));
    rec.set("meta", meta && typeof meta === "object" ? meta : {});
    $app.dao().saveRecord(rec);
    return rec;
  } catch (_) {
    return null;
  }
}

function getEnv(name) {
  const value = $os.getenv(name);
  return value && String(value).trim() ? String(value).trim() : null;
}

function clampText(v, maxLen) {
  const s = safeString(v);
  if (!Number.isFinite(Number(maxLen)) || Number(maxLen) <= 0) return s;
  const n = Math.floor(Number(maxLen));
  return s.length > n ? s.slice(0, n) : s;
}

function normalizeSlug(v) {
  return safeString(v)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 80);
}

function normalizeEmail(v) {
  const s = safeString(v).trim().toLowerCase().slice(0, 254);
  if (!s) return "";
  if (!s.includes("@")) return "";
  return s;
}

function normalizeTags(value) {
  const raw = Array.isArray(value)
    ? value.map((v) => safeString(v))
    : safeString(value)
        .split(/[,\n]+/g)
        .map((s) => s.trim());

  const out = [];
  const seen = new Set();
  for (const t of raw) {
    const tag = safeString(t).trim().toLowerCase().slice(0, 40);
    if (!tag) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= 25) break;
  }
  return out;
}

function getClientIp(req) {
  try {
    const getHeader = (name) => safeString(req?.header?.get?.(name)).trim();
    const cf = getHeader("CF-Connecting-IP");
    if (cf) return cf;
    const xff = getHeader("X-Forwarded-For");
    if (xff) return xff.split(",")[0].trim();
  } catch (_) {}
  return "";
}

function bestEffortClientIp(req) {
  return getClientIp(req);
}

function randToken(prefix) {
  const raw = (() => {
    try {
      return $security.randomString(32);
    } catch (_) {
      return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }
  })()
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 32);

  return prefix ? `${safeString(prefix)}_${raw}` : raw;
}

function randCode(len) {
  const n = Number.isFinite(Number(len)) ? Math.max(4, Math.min(12, Math.floor(Number(len)))) : 6;
  let s = "";
  for (let i = 0; i < n; i++) s += String(Math.floor(Math.random() * 10));
  return s;
}

function validateUploadToken({ providedToken, expectedToken }) {
  const provided = safeString(providedToken).trim();
  const expected = safeString(expectedToken).trim();
  if (!provided || !expected) return false;
  if (provided.length < 12 || expected.length < 12) return false;
  return provided === expected;
}

function clamp01to100(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 1;
  if (n < 1) return 1;
  if (n > 100) return 100;
  return Math.round(n);
}

function clampNum(v, minValue, maxValue, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const min = Number(minValue);
  const max = Number(maxValue);
  if (Number.isFinite(min) && n < min) return min;
  if (Number.isFinite(max) && n > max) return max;
  return n;
}

function requireRole(user, tenantId, requiredRole) {
  if (!user || !user.id) throw new ForbiddenError("Not authenticated");

  const membership = $app.dao().findFirstRecordByData("memberships", "user", user.id, "tenant", tenantId);

  if (!membership) throw new ForbiddenError("No access to this tenant");

  const role = membership.getString("role");
  if (ROLE_ORDER.indexOf(role) < ROLE_ORDER.indexOf(requiredRole)) {
    throw new ForbiddenError("Insufficient permissions");
  }

  return membership;
}

function parseJsonBody(c) {
  try {
    const req = c.request();
    if (!req || !req.body || typeof req.body.read !== "function") {
      return { ok: false, error: new Error("request_body_unavailable") };
    }

    const contentLengthRaw = req.contentLength;
    const contentLength =
      typeof contentLengthRaw === "number" && Number.isFinite(contentLengthRaw) && contentLengthRaw > 0
        ? Math.floor(contentLengthRaw)
        : 0;

    // Avoid huge allocations; Stripe events and tool payloads should be small.
    const MAX_BYTES = 1_000_000; // ~1MB
    const bufLen = contentLength > 0 ? Math.min(contentLength, MAX_BYTES) : 16_384;
    const buf = new Uint8Array(bufLen);

    // In this JS runtime, `read()` may fill the buffer and then throw `GoError: EOF`.
    try {
      req.body.read(buf);
    } catch (_) {}

    let n = contentLength > 0 && contentLength <= buf.length ? contentLength : 0;
    if (!n) {
      // Fallback: trim at first NUL byte.
      for (let i = 0; i < buf.length; i++) {
        if (buf[i] === 0) {
          n = i;
          break;
        }
      }
      if (!n) n = buf.length;
    }

    let s = "";
    for (let i = 0; i < n; i++) s += String.fromCharCode(buf[i]);
    const trimmed = s.trim();
    if (!trimmed) return { ok: false, error: new Error("empty_body") };

    return { ok: true, value: JSON.parse(trimmed) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function parseJsonValue(value, fallback) {
  if (Array.isArray(value)) {
    // PocketBase Go->JS bridge sometimes returns JSON fields as a byte array.
    // If it looks like bytes, attempt to decode and JSON.parse it.
    const looksLikeBytes =
      value.length > 1 &&
      typeof value[0] === "number" &&
      value.length <= 2_000_000 &&
      value.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 255);
    if (looksLikeBytes) {
      try {
        let s = "";
        for (const n of value) s += String.fromCharCode(n);
        const parsed = JSON.parse(s);
        if (parsed && typeof parsed === "object") return parsed;
      } catch (_) {
        // fall through
      }
    }
    return value;
  }

  if (value && typeof value === "object") return value;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return fallback;
    try {
      return JSON.parse(s);
    } catch (_) {
      return fallback;
    }
  }
  return fallback;
}

function clampEnum(value, allowed, fallback) {
  const v = String(value || "").trim();
  return Array.isArray(allowed) && allowed.includes(v) ? v : fallback;
}

function clampIntervalDays(v, fallbackDays, maxDays) {
  const n = Number(v);
  const fallback = Number.isFinite(Number(fallbackDays)) ? Math.floor(Number(fallbackDays)) : 90;
  const max = Number.isFinite(Number(maxDays)) ? Math.floor(Number(maxDays)) : 3650;
  if (!Number.isFinite(n) || n <= 0) return fallback;
  if (n > max) return max;
  return Math.round(n);
}

function encodeForm(pairs) {
  const out = [];
  const list = Array.isArray(pairs) ? pairs : [];
  for (const pair of list) {
    if (!pair || pair.length < 2) continue;
    const k = safeString(pair[0]);
    const v = safeString(pair[1]);
    out.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return out.join("&");
}

function stripeRequest({ method, path, secretKey, formPairs }) {
  const url = `https://api.stripe.com${path}`;
  const headers = {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const res = $http.send({
    method: method || "GET",
    url,
    headers,
    body: formPairs ? encodeForm(formPairs) : undefined,
  });
  return res?.json?.();
}

function stripeConnectRequest({ method, path, secretKey, formPairs }) {
  const url = `https://connect.stripe.com${path}`;
  const headers = {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const res = $http.send({
    method: method || "GET",
    url,
    headers,
    body: formPairs ? encodeForm(formPairs) : undefined,
  });
  return res?.json?.();
}

function computeTenantEntitlementsFromStripeSubscription(args) {
  const toolSlug = safeString(args?.toolSlug).trim();
  const bundleEntitlementId = safeString(args?.bundleEntitlementId || "bundle_all").trim() || "bundle_all";
  const toolEntitlementPrefix = safeString(args?.toolEntitlementPrefix || "tool_").trim() || "tool_";

  const stripePriceBundle = safeString(args?.stripePriceBundle).trim();
  const stripePriceTool = safeString(args?.stripePriceTool).trim();

  const sub = args?.subscription || null;
  const status = safeString(sub?.status).trim();
  const isActive = status === "active" || status === "trialing";
  if (!isActive) return [];

  const items = Array.isArray(sub?.items?.data) ? sub.items.data : [];
  const priceIds = items
    .map((it) => safeString(it?.price?.id).trim())
    .filter(Boolean);

  if (stripePriceBundle && priceIds.includes(stripePriceBundle)) return [bundleEntitlementId];
  if (stripePriceTool && priceIds.includes(stripePriceTool)) return [`${toolEntitlementPrefix}${toolSlug}`];
  return [];
}

function buildStripeConnectAuthorizeUrl({ clientId, state, redirectUri }) {
  const cid = safeString(clientId).trim();
  const st = safeString(state).trim();
  const redir = safeString(redirectUri).trim();
  if (!cid || !st || !redir) return null;

  const params = [
    ["response_type", "code"],
    ["client_id", cid],
    ["scope", "read_write"],
    ["state", st],
    ["redirect_uri", redir],
  ];
  return `https://connect.stripe.com/oauth/authorize?${encodeForm(params)}`;
}

function buildStripeConnectState(tenantId) {
  const tid = safeString(tenantId).trim();
  if (!tid) return null;
  return `t_${tid}_${randToken("sc")}`;
}

function parseStripeConnectState(state) {
  const s = safeString(state).trim();
  if (!s || s.length > 200) return null;
  const m = /^t_([A-Za-z0-9]+)_([A-Za-z0-9_]+)$/.exec(s);
  if (!m) return null;
  return { tenantId: m[1], token: m[2], raw: s };
}

function normalizeKeyName(v) {
  return safeString(v)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

function isOverdue(lastRotatedIso, intervalDays, nowMs) {
  const lastMs = Date.parse(safeString(lastRotatedIso));
  if (!Number.isFinite(lastMs)) return true;
  const dueMs = lastMs + clampIntervalDays(intervalDays) * 24 * 60 * 60 * 1000;
  return Number(nowMs || Date.now()) > dueMs;
}

function isExpired(expiresAtIso) {
  if (!expiresAtIso) return false;
  const t = Date.parse(safeString(expiresAtIso));
  if (!Number.isFinite(t)) return false;
  return t < Date.now();
}

function setTenantSlug(e) {
  const record = e?.record || null;
  if (!record) return;
  const tenantId = record.getString("tenant");
  if (!tenantId) return;
  try {
    const tenant = $app.dao().findRecordById("tenants", tenantId);
    record.set("tenant_slug", tenant.getString("slug") || "");
  } catch (_) {}
}

function setTenantSlugFromTenantId(record, tenantId) {
  if (!record || !tenantId) return;
  try {
    const tenant = $app.dao().findRecordById("tenants", tenantId);
    record.set("tenant_slug", tenant.getString("slug") || "");
  } catch (_) {}
}

// Fixed-window limiter (best-effort). Key should be tenant id or api key.
const _RATE = new Map();
function allowRequest(key, nowMs, limit, windowMs) {
  const lim = Number.isFinite(Number(limit)) ? Math.floor(Number(limit)) : 100;
  const winMs = Number.isFinite(Number(windowMs)) ? Math.floor(Number(windowMs)) : 60_000;
  const now = Number(nowMs || Date.now());
  const id = safeString(key);
  if (!id) return false;
  const win = Math.floor(now / winMs);
  const prev = _RATE.get(id);
  if (!prev || prev.win !== win) {
    _RATE.set(id, { win, count: 1 });
    return true;
  }
  if (prev.count >= lim) return false;
  prev.count += 1;
  return true;
}

function toDateOnlyIso(value) {
  const ms = typeof value === "number" ? value : Date.parse(safeString(value));
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(
    2,
    "0",
  )}`;
}

function msToIso(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return null;
  return new Date(n).toISOString();
}

function findTenantForStripeEvent(event) {
  const stripeAccountId = event?.account ? safeString(event.account) : "";
  if (stripeAccountId) {
    try {
      const conn = $app.dao().findFirstRecordByData("stripe_connections", "stripe_account_id", stripeAccountId);
      const tenantId = safeString(conn?.getString?.("tenant"));
      if (tenantId) return $app.dao().findRecordById("tenants", tenantId);
    } catch (_) {}
  }

  const obj = event?.data?.object || null;
  const customerId = obj?.customer ? safeString(obj.customer) : "";
  if (!customerId) return null;
  try {
    return $app.dao().findFirstRecordByData("tenants", "stripe_customer_id", customerId);
  } catch (_) {
    return null;
  }
}

function getAuthRecord(c) {
  try {
    const ar = c?.authRecord;
    if (ar && typeof ar === "object" && ar.id) return ar;

    const authObj = c?.auth;
    if (authObj && typeof authObj === "object" && authObj.id) return authObj;

    const authRec = c?.auth?.record;
    if (authRec && authRec.id) return authRec;
  } catch (_) {}

  try {
    if (typeof $apis?.requestInfo === "function") {
      const info = $apis.requestInfo(c);
      const rec = info?.authRecord;
      if (rec && rec.id) return rec;
    }
  } catch (_) {}

  return null;
}

function handleRevenueCatWebhook(c) {
  const secret = getEnv("RC_WEBHOOK_SECRET");
  const apiKey = getEnv("RC_API_KEY");

  if (!secret || !apiKey) {
    $app.logger().warn("RevenueCat webhook called but RC_WEBHOOK_SECRET/RC_API_KEY not configured");
    return serviceUnavailable(c, "revenuecat_not_configured");
  }

  try {
    const now = Date.now();
    if (!allowRequest(`webhook:revenuecat:all`, now, 120, 60 * 1000)) return forbidden(c, "rate_limited");
  } catch (_) {}

  const auth = c.request().header.get("Authorization") || "";
  if (auth !== `Bearer ${secret}`) return unauthorized(c, "invalid_authorization");

  const parsed = parseJsonBody(c);
  if (!parsed.ok) {
    $app.logger().warn("RevenueCat webhook invalid JSON", parsed.error);
    return badRequest(c, "invalid_json");
  }

  const body = parsed.value || null;
  const rcId = body?.event?.app_user_id ? String(body.event.app_user_id) : null;
  if (!rcId) return badRequest(c, "missing_event_app_user_id");

  try {
    let tenant = null;
    try {
      tenant = $app.dao().findFirstRecordByData("tenants", "rc_customer_id", rcId);
    } catch (_) {
      $app.logger().warn("RevenueCat webhook: unknown rc_customer_id", rcId);
      return json(c, 200, { status: "ignored", reason: "unknown_customer_id" });
    }

    const res = $http.send({
      url: `${getEnv("RC_API_BASE_URL") || "https://api.revenuecat.com"}/v1/subscribers/${encodeURIComponent(rcId)}`,
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const payload = res?.json?.();
    const entitlements = payload?.subscriber?.entitlements || {};
    const now = Date.now();
    const entitlementIds = Object.keys(entitlements).filter((id) => {
      const v = entitlements?.[id] || null;
      if (!v || typeof v !== "object") return false;
      if (v.is_active === true) return true;

      const expiresMs = Number(v.expires_date_ms);
      if (Number.isFinite(expiresMs)) return expiresMs >= now;

      const expiresIso = safeString(v.expires_date);
      if (!expiresIso) return true; // lifetime/unknown
      const expiresParsed = Date.parse(expiresIso);
      if (!Number.isFinite(expiresParsed)) return true;
      return expiresParsed >= now;
    });

    tenant.set("entitlements", entitlementIds);
    $app.dao().saveRecord(tenant);

    return json(c, 200, { status: "synced", entitlements: entitlementIds });
  } catch (e) {
    $app.logger().error("RevenueCat entitlement sync failed", e);
    return internalError(c, "sync_failed");
  }
}

function listMissingCollections(collectionNames) {
  const names = Array.isArray(collectionNames) ? collectionNames : [];
  const missing = [];
  for (const name of names) {
    const n = safeString(name).trim();
    if (!n) continue;
    try {
      $app.dao().findCollectionByNameOrId(n);
    } catch (_) {
      missing.push(n);
    }
  }
  return missing;
}

function handleOnboardingBootstrap(c) {
  const user = getAuthRecord(c);
  if (!user) return unauthorized(c, "not_authenticated");

  // Best-effort abuse protection: avoid infinite tenant creation.
  try {
    const ip = bestEffortClientIp(c?.request?.());
    const now = Date.now();
    if (!allowRequest(`onboarding:user:${user.id}`, now, 5, 60 * 60 * 1000)) return forbidden(c, "rate_limited");
    if (ip && !allowRequest(`onboarding:ip:${ip}`, now, 15, 60 * 60 * 1000)) return forbidden(c, "rate_limited");
  } catch (_) {}

  const parsed = parseJsonBody(c);
  if (!parsed.ok) return badRequest(c, "invalid_json");
  const body = parsed.value || {};

  const name = clampText(body?.name, 120).trim();
  if (!name) return badRequest(c, "missing_name");

  const slugSeed = clampText(body?.slug, 120).trim() || name;
  let slug = normalizeSlug(slugSeed);
  if (!slug) slug = normalizeSlug(`tenant-${randCode(6)}`);

  const tenantsCollection = $app.dao().findCollectionByNameOrId("tenants");
  const membershipsCollection = $app.dao().findCollectionByNameOrId("memberships");

  let tenant = null;
  let lastErr = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const nextSlug = attempt === 0 ? slug : normalizeSlug(`${slug}-${randCode(4)}`);
    try {
      const rec = new Record(tenantsCollection);
      rec.set("name", name);
      rec.set("slug", nextSlug);
      $app.dao().saveRecord(rec);
      tenant = rec;
      slug = nextSlug;
      break;
    } catch (e) {
      lastErr = e;
      // Try again with a suffix (likely slug collision).
    }
  }

  if (!tenant) {
    $app.logger().error("onboarding bootstrap tenant create failed", lastErr);
    return internalError(c, "tenant_create_failed");
  }

  try {
    // Stable RevenueCat customer id for this tenant. Use this as RevenueCat `app_user_id`.
    tenant.set("rc_customer_id", `tenant_${tenant.id}`);
    $app.dao().saveRecord(tenant);
  } catch (e) {
    $app.logger().warn("onboarding bootstrap rc_customer_id set failed", e);
  }

  try {
    const membership = new Record(membershipsCollection);
    membership.set("user", user.id);
    membership.set("tenant", tenant.id);
    membership.set("role", "owner");
    membership.set("status", "active");
    $app.dao().saveRecord(membership);

    return json(c, 200, {
      ok: true,
      tenant: {
        id: tenant.id,
        name: tenant.getString("name"),
        slug: tenant.getString("slug"),
        rc_customer_id: tenant.getString("rc_customer_id"),
      },
      membership: { id: membership.id, role: membership.getString("role"), status: membership.getString("status") },
    });
  } catch (e) {
    $app.logger().error("onboarding bootstrap membership create failed", e);
    return internalError(c, "membership_create_failed", { tenantId: tenant.id });
  }
}

function handleBillingStatus(c, opts) {
  const user = getAuthRecord(c);
  if (!user) return unauthorized(c, "not_authenticated");

  const tenantId = safeString(c?.queryParam?.("tenant") || "").trim();
  if (!tenantId) return badRequest(c, "missing_tenant");

  requireRole(user, tenantId, "viewer");

  const toolSlug = safeString(opts?.toolSlug).trim();
  const stripeSecret = getEnv("STRIPE_SECRET_KEY");
  const stripePriceBundle = getEnv("STRIPE_PRICE_BUNDLE");
  const stripePriceTool = getEnv("STRIPE_PRICE_TOOL");

  const rcConfigured = Boolean(getEnv("RC_WEBHOOK_SECRET") && getEnv("RC_API_KEY"));
  const stripeConfigured = Boolean(stripeSecret && stripePriceBundle && stripePriceTool);

  const tenant = $app.dao().findRecordById("tenants", tenantId);

  return ok(c, {
    ok: true,
    toolSlug: toolSlug || null,
    billing: {
      revenuecatConfigured: rcConfigured,
      stripeConfigured,
      stripePricesConfigured: Boolean(stripePriceBundle && stripePriceTool),
    },
    tenant: {
      id: tenant.id,
      rc_customer_id: tenant.getString("rc_customer_id"),
      stripe_customer_id: tenant.getString("stripe_customer_id"),
      entitlements: parseJsonValue(tenant.get("entitlements"), []),
    },
  });
}

function handleBillingCheckout(c, opts) {
  const user = getAuthRecord(c);
  if (!user) return unauthorized(c, "not_authenticated");

  try {
    const ip = bestEffortClientIp(c?.request?.());
    const now = Date.now();
    if (!allowRequest(`billing:checkout:user:${user.id}`, now, 10, 60 * 60 * 1000)) return forbidden(c, "rate_limited");
    if (ip && !allowRequest(`billing:checkout:ip:${ip}`, now, 30, 60 * 60 * 1000)) return forbidden(c, "rate_limited");
  } catch (_) {}

  const stripeSecret = getEnv("STRIPE_SECRET_KEY");
  const stripePriceBundle = getEnv("STRIPE_PRICE_BUNDLE");
  const stripePriceTool = getEnv("STRIPE_PRICE_TOOL");
  if (!stripeSecret || !stripePriceBundle || !stripePriceTool) return serviceUnavailable(c, "stripe_not_configured");

  const publicAppUrl = getEnv("PUBLIC_APP_URL");
  if (!publicAppUrl) return serviceUnavailable(c, "public_app_url_not_configured");

  const parsed = parseJsonBody(c);
  if (!parsed.ok) return badRequest(c, "invalid_json");
  const body = parsed.value || {};

  const tenantId = safeString(body?.tenant).trim();
  if (!tenantId) return badRequest(c, "missing_tenant");

  const plan = clampEnum(body?.plan, ["bundle", "tool"], "tool");
  const toolSlug = safeString(opts?.toolSlug).trim();

  requireRole(user, tenantId, "owner");
  auditLog(tenantId, user.id, "billing.checkout.start", { plan });

  const tenant = $app.dao().findRecordById("tenants", tenantId);
  const tenantName = tenant.getString("name") || "Workspace";
  const rcCustomerId = tenant.getString("rc_customer_id") || "";

  let stripeCustomerId = safeString(tenant.getString("stripe_customer_id")).trim();
  if (!stripeCustomerId) {
    const created = stripeRequest({
      method: "POST",
      path: "/v1/customers",
      secretKey: stripeSecret,
      formPairs: [
        ["name", tenantName],
        ["metadata[tenant_id]", tenantId],
        ["metadata[tool_slug]", toolSlug],
        ["metadata[rc_customer_id]", rcCustomerId],
      ],
    });
    stripeCustomerId = safeString(created?.id).trim();
    if (!stripeCustomerId) return internalError(c, "stripe_customer_create_failed");
    try {
      tenant.set("stripe_customer_id", stripeCustomerId);
      $app.dao().saveRecord(tenant);
    } catch (e) {
      $app.logger().warn("billing checkout: failed to persist stripe_customer_id", e);
    }
  }

  const priceId = plan === "bundle" ? stripePriceBundle : stripePriceTool;
  const successUrl = `${publicAppUrl.replace(/\/+$/, "")}/billing?status=success`;
  const cancelUrl = `${publicAppUrl.replace(/\/+$/, "")}/billing?status=cancel`;

  const session = stripeRequest({
    method: "POST",
    path: "/v1/checkout/sessions",
    secretKey: stripeSecret,
    formPairs: [
      ["mode", "subscription"],
      ["customer", stripeCustomerId],
      ["line_items[0][price]", priceId],
      ["line_items[0][quantity]", "1"],
      ["success_url", successUrl],
      ["cancel_url", cancelUrl],
      ["client_reference_id", tenantId],
      ["metadata[tenant_id]", tenantId],
      ["metadata[tool_slug]", toolSlug],
      ["metadata[plan]", plan],
      ["subscription_data[metadata][tenant_id]", tenantId],
      ["subscription_data[metadata][tool_slug]", toolSlug],
      ["subscription_data[metadata][plan]", plan],
    ],
  });

  const url = safeString(session?.url).trim();
  if (!url) return internalError(c, "stripe_checkout_create_failed");

  return ok(c, { ok: true, url, sessionId: safeString(session?.id).trim() || null });
}

function handleBillingPortal(c) {
  const user = getAuthRecord(c);
  if (!user) return unauthorized(c, "not_authenticated");

  const stripeSecret = getEnv("STRIPE_SECRET_KEY");
  if (!stripeSecret) return serviceUnavailable(c, "stripe_not_configured");

  const publicAppUrl = getEnv("PUBLIC_APP_URL");
  if (!publicAppUrl) return serviceUnavailable(c, "public_app_url_not_configured");

  const parsed = parseJsonBody(c);
  if (!parsed.ok) return badRequest(c, "invalid_json");
  const body = parsed.value || {};

  const tenantId = safeString(body?.tenant).trim();
  if (!tenantId) return badRequest(c, "missing_tenant");

  requireRole(user, tenantId, "owner");
  auditLog(tenantId, user.id, "billing.portal.start", {});
  const tenant = $app.dao().findRecordById("tenants", tenantId);
  const stripeCustomerId = safeString(tenant.getString("stripe_customer_id")).trim();
  if (!stripeCustomerId) return badRequest(c, "missing_stripe_customer_id");

  const returnUrl = `${publicAppUrl.replace(/\/+$/, "")}/billing`;
  const portal = stripeRequest({
    method: "POST",
    path: "/v1/billing_portal/sessions",
    secretKey: stripeSecret,
    formPairs: [
      ["customer", stripeCustomerId],
      ["return_url", returnUrl],
    ],
  });

  const url = safeString(portal?.url).trim();
  if (!url) return internalError(c, "stripe_portal_create_failed");
  return ok(c, { ok: true, url });
}

function handleStripeBillingWebhook(c, opts) {
  const stripeSecret = getEnv("STRIPE_SECRET_KEY");
  const stripePriceBundle = getEnv("STRIPE_PRICE_BUNDLE");
  const stripePriceTool = getEnv("STRIPE_PRICE_TOOL");
  if (!stripeSecret || !stripePriceBundle || !stripePriceTool) return serviceUnavailable(c, "stripe_not_configured");

  const stripeWebhookSecret = getEnv("STRIPE_WEBHOOK_SECRET");
  if (stripeWebhookSecret) {
    // Raw-body signature verification isn't reliable in PB hook JS runtime, but requiring the header
    // blocks naive abuse. We still fetch the event from Stripe by id for correctness.
    const sig = c.request().header.get("Stripe-Signature");
    if (!sig) return unauthorized(c, "missing_stripe_signature");
  }

  try {
    const now = Date.now();
    if (!allowRequest(`webhook:stripe_billing:all`, now, 180, 60 * 1000)) return forbidden(c, "rate_limited");
  } catch (_) {}

  const parsed = parseJsonBody(c);
  if (!parsed.ok) return badRequest(c, "invalid_json");
  const event = parsed.value || null;
  const eventId = safeString(event?.id).trim();
  if (!eventId) return badRequest(c, "missing_event_id");
  if (!/^evt_[A-Za-z0-9]+$/.test(eventId)) return badRequest(c, "invalid_event_id");

  let stripeEvent = null;
  try {
    stripeEvent = stripeRequest({ method: "GET", path: `/v1/events/${encodeURIComponent(eventId)}`, secretKey: stripeSecret });
  } catch (e) {
    $app.logger().warn("stripe billing webhook: stripe event fetch failed", e);
    return badRequest(c, "invalid_event_id");
  }
  const type = safeString(stripeEvent?.type).trim() || safeString(event?.type).trim();
  const obj = stripeEvent?.data?.object || event?.data?.object || null;

  const toolSlug = safeString(opts?.toolSlug).trim();
  const bundleEntitlementId = safeString(getEnv("BUNDLE_ENTITLEMENT_ID") || "bundle_all").trim() || "bundle_all";
  const toolEntitlementPrefix = safeString(getEnv("TOOL_ENTITLEMENT_PREFIX") || "tool_").trim() || "tool_";

  const customerId = safeString(obj?.customer).trim();
  const metaTenantId = safeString(obj?.metadata?.tenant_id).trim();

  let tenant = null;
  if (customerId) {
    try {
      tenant = $app.dao().findFirstRecordByData("tenants", "stripe_customer_id", customerId);
    } catch (_) {}
  }

  if (!tenant && metaTenantId) {
    try {
      tenant = $app.dao().findRecordById("tenants", metaTenantId);
      if (customerId) {
        try {
          tenant.set("stripe_customer_id", customerId);
          $app.dao().saveRecord(tenant);
        } catch (e) {
          $app.logger().warn("stripe billing webhook: failed to persist stripe_customer_id", e);
        }
      }
    } catch (_) {}
  }

  if (!tenant) return ok(c, { ok: true, status: "ignored", reason: "tenant_not_found" });

  const t = type || "";
  if (t === "checkout.session.completed") {
    const subId = safeString(obj?.subscription).trim();
    if (!subId) return ok(c, { ok: true, status: "ignored", reason: "no_subscription" });
    const sub = stripeRequest({ method: "GET", path: `/v1/subscriptions/${encodeURIComponent(subId)}?expand[]=items.data.price`, secretKey: stripeSecret });
    const entitlements = computeTenantEntitlementsFromStripeSubscription({
      subscription: sub,
      toolSlug,
      bundleEntitlementId,
      toolEntitlementPrefix,
      stripePriceBundle,
      stripePriceTool,
    });
    tenant.set("entitlements", entitlements);
    $app.dao().saveRecord(tenant);
    auditLog(tenant.id, "", "billing.entitlements.synced", { provider: "stripe", type: t, entitlements });
    return ok(c, { ok: true, status: "synced", entitlements });
  }

  if (t.startsWith("customer.subscription.")) {
    const entitlements = computeTenantEntitlementsFromStripeSubscription({
      subscription: obj,
      toolSlug,
      bundleEntitlementId,
      toolEntitlementPrefix,
      stripePriceBundle,
      stripePriceTool,
    });
    tenant.set("entitlements", entitlements);
    $app.dao().saveRecord(tenant);
    auditLog(tenant.id, "", "billing.entitlements.synced", { provider: "stripe", type: t, entitlements });
    return ok(c, { ok: true, status: "synced", entitlements });
  }

  return ok(c, { ok: true, status: "ignored", reason: "event_type_ignored", type: t || null });
}

function handleStripeConnectStart(c, opts) {
  const user = getAuthRecord(c);
  if (!user) return unauthorized(c, "not_authenticated");

  try {
    const ip = bestEffortClientIp(c?.request?.());
    const now = Date.now();
    if (!allowRequest(`stripe_connect:start:user:${user.id}`, now, 20, 60 * 60 * 1000)) return forbidden(c, "rate_limited");
    if (ip && !allowRequest(`stripe_connect:start:ip:${ip}`, now, 60, 60 * 60 * 1000)) return forbidden(c, "rate_limited");
  } catch (_) {}

  const stripeSecret = getEnv("STRIPE_SECRET_KEY");
  const clientId = getEnv("STRIPE_CONNECT_CLIENT_ID");
  const publicAppUrl = getEnv("PUBLIC_APP_URL");
  if (!stripeSecret) return serviceUnavailable(c, "stripe_not_configured");
  if (!clientId) return serviceUnavailable(c, "stripe_connect_not_configured");
  if (!publicAppUrl) return serviceUnavailable(c, "public_app_url_not_configured");

  const tenantId = safeString(c?.queryParam?.("tenant") || "").trim();
  if (!tenantId) return badRequest(c, "missing_tenant");
  requireRole(user, tenantId, "owner");
  auditLog(tenantId, user.id, "stripe_connect.start", { toolSlug: safeString(opts?.toolSlug) || null });

  const returnTo = clampText(c?.queryParam?.("return") || "", 200).trim() || "/app/home";

  const tenant = $app.dao().findRecordById("tenants", tenantId);
  const state = buildStripeConnectState(tenantId);
  if (!state) return internalError(c, "state_create_failed");

  try {
    const settings = parseJsonValue(tenant.get("settings"), {}) || {};
    settings.stripe_connect_state = state;
    settings.stripe_connect_state_expires_ms = Date.now() + 10 * 60 * 1000;
    settings.stripe_connect_return_to = returnTo;
    tenant.set("settings", settings);
    $app.dao().saveRecord(tenant);
  } catch (e) {
    $app.logger().warn("stripe connect: failed to persist state", e);
    return internalError(c, "state_persist_failed");
  }

  const callbackUrl = `${publicAppUrl.replace(/\/+$/, "")}/api/stripe/connect/callback`;
  const url = buildStripeConnectAuthorizeUrl({ clientId, state, redirectUri: callbackUrl });
  if (!url) return internalError(c, "authorize_url_failed");

  return ok(c, { ok: true, url });
}

function handleStripeConnectCallback(c, opts) {
  const publicAppUrl = getEnv("PUBLIC_APP_URL");
  const stripeSecret = getEnv("STRIPE_SECRET_KEY");
  const clientId = getEnv("STRIPE_CONNECT_CLIENT_ID");
  if (!publicAppUrl) return serviceUnavailable(c, "public_app_url_not_configured");
  if (!stripeSecret) return serviceUnavailable(c, "stripe_not_configured");
  if (!clientId) return serviceUnavailable(c, "stripe_connect_not_configured");

  const toolSlug = safeString(opts?.toolSlug).trim();

  const stateRaw = safeString(c?.queryParam?.("state") || "").trim();
  const code = safeString(c?.queryParam?.("code") || "").trim();
  const error = safeString(c?.queryParam?.("error") || "").trim();

  const parsed = parseStripeConnectState(stateRaw);
  if (!parsed) return badRequest(c, "invalid_state");

  let tenant = null;
  try {
    tenant = $app.dao().findRecordById("tenants", parsed.tenantId);
  } catch (_) {}
  if (!tenant) return badRequest(c, "tenant_not_found");

  const settings = parseJsonValue(tenant.get("settings"), {}) || {};
  const expectedState = safeString(settings.stripe_connect_state).trim();
  const expiresMs = Number(settings.stripe_connect_state_expires_ms);
  const returnTo = safeString(settings.stripe_connect_return_to).trim() || "/app/home";

  if (!expectedState || expectedState !== parsed.raw) return badRequest(c, "state_mismatch");
  if (Number.isFinite(expiresMs) && Date.now() > expiresMs) return badRequest(c, "state_expired");

  // Clear the state as early as possible to prevent reuse.
  try {
    settings.stripe_connect_state = null;
    settings.stripe_connect_state_expires_ms = null;
    tenant.set("settings", settings);
    $app.dao().saveRecord(tenant);
  } catch (_) {}

  const baseRedirect = `${publicAppUrl.replace(/\/+$/, "")}${returnTo.startsWith("/") ? returnTo : "/app/home"}`;

  if (error) {
    auditLog(tenant.id, "", "stripe_connect.error", { error });
    return c.redirect(302, `${baseRedirect}${baseRedirect.includes("?") ? "&" : "?"}stripe_connect=error`);
  }
  if (!code) return c.redirect(302, `${baseRedirect}${baseRedirect.includes("?") ? "&" : "?"}stripe_connect=missing_code`);

  const callbackUrl = `${publicAppUrl.replace(/\/+$/, "")}/api/stripe/connect/callback`;
  const tokenRes = stripeConnectRequest({
    method: "POST",
    path: "/oauth/token",
    secretKey: stripeSecret,
    formPairs: [
      ["grant_type", "authorization_code"],
      ["code", code],
      ["client_secret", stripeSecret],
      ["redirect_uri", callbackUrl],
    ],
  });

  const stripeAccountId = safeString(tokenRes?.stripe_user_id).trim();
  const accessToken = safeString(tokenRes?.access_token).trim();
  const refreshToken = safeString(tokenRes?.refresh_token).trim();
  if (!stripeAccountId || !accessToken) {
    $app.logger().warn("stripe connect token exchange failed", tokenRes);
    auditLog(tenant.id, "", "stripe_connect.exchange_failed", {});
    return c.redirect(302, `${baseRedirect}${baseRedirect.includes("?") ? "&" : "?"}stripe_connect=exchange_failed`);
  }

  try {
    const collection = $app.dao().findCollectionByNameOrId("stripe_connections");
    let record = null;
    try {
      record = $app.dao().findFirstRecordByFilter("stripe_connections", "tenant.id = {:tid}", { tid: tenant.id });
    } catch (_) {}

    if (!record) record = new Record(collection);
    record.set("tenant", tenant.id);
    record.set("stripe_account_id", stripeAccountId);
    record.set("access_token", accessToken);
    record.set("refresh_token", refreshToken);
    $app.dao().saveRecord(record);
  } catch (e) {
    $app.logger().error("stripe connect: failed to save stripe_connections", e);
    auditLog(tenant.id, "", "stripe_connect.save_failed", {});
    return c.redirect(302, `${baseRedirect}${baseRedirect.includes("?") ? "&" : "?"}stripe_connect=save_failed`);
  }

  // Optional: also persist tenant-level Stripe account id (best-effort).
  try {
    if (tenant.getString("stripe_account_id") !== stripeAccountId) {
      tenant.set("stripe_account_id", stripeAccountId);
      $app.dao().saveRecord(tenant);
    }
  } catch (_) {}

  auditLog(tenant.id, "", "stripe_connect.connected", { stripe_account_id: stripeAccountId });
  return c.redirect(302, `${baseRedirect}${baseRedirect.includes("?") ? "&" : "?"}stripe_connect=ok`);
}

function handleInviteCreate(c, opts) {
  const user = getAuthRecord(c);
  if (!user) return unauthorized(c, "not_authenticated");

  try {
    const ip = bestEffortClientIp(c?.request?.());
    const now = Date.now();
    if (!allowRequest(`invites:create:user:${user.id}`, now, 50, 60 * 60 * 1000)) return forbidden(c, "rate_limited");
    if (ip && !allowRequest(`invites:create:ip:${ip}`, now, 150, 60 * 60 * 1000)) return forbidden(c, "rate_limited");
  } catch (_) {}

  const parsed = parseJsonBody(c);
  if (!parsed.ok) return badRequest(c, "invalid_json");
  const body = parsed.value || {};

  const tenantId = safeString(body?.tenant).trim();
  if (!tenantId) return badRequest(c, "missing_tenant");
  requireRole(user, tenantId, "owner");

  const email = normalizeEmail(body?.email);
  if (!email) return badRequest(c, "invalid_email");

  const role = clampEnum(body?.role, ["admin", "member", "viewer"], "member");

  const token = randToken("inv");
  if (!token || token.length < 12) return internalError(c, "token_generate_failed");

  const invitesCollection = $app.dao().findCollectionByNameOrId("invites");
  const rec = new Record(invitesCollection);
  rec.set("tenant", tenantId);
  rec.set("email", email);
  rec.set("role", role);
  rec.set("status", "pending");
  rec.set("token", token);
  rec.set("created_by", user.id);
  rec.set("expires_at", msToIso(Date.now() + 7 * 24 * 60 * 60 * 1000));
  $app.dao().saveRecord(rec);
  auditLog(tenantId, user.id, "invites.created", { email, role, inviteId: rec.id });

  const publicAppUrl = getEnv("PUBLIC_APP_URL");
  const inviteUrl = publicAppUrl ? `${publicAppUrl.replace(/\/+$/, "")}/app/home?invite=${encodeURIComponent(token)}` : null;

  return ok(c, {
    ok: true,
    invite: {
      id: rec.id,
      tenant: rec.getString("tenant"),
      email: rec.getString("email"),
      role: rec.getString("role"),
      status: rec.getString("status"),
      token: rec.getString("token"),
      expires_at: rec.getString("expires_at"),
      invite_url: inviteUrl,
    },
  });
}

function handleInviteList(c, opts) {
  const user = getAuthRecord(c);
  if (!user) return unauthorized(c, "not_authenticated");

  const tenantId = safeString(c?.queryParam?.("tenant") || "").trim();
  if (!tenantId) return badRequest(c, "missing_tenant");
  requireRole(user, tenantId, "admin");

  const dao = $app.dao();
  const records = dao.findRecordsByFilter("invites", "tenant.id = {:tid}", "created desc", 200, 0, { tid: tenantId }) || [];

  return ok(c, {
    ok: true,
    items: records.map((r) => ({
      id: r.id,
      tenant: r.getString("tenant"),
      email: r.getString("email"),
      role: r.getString("role"),
      status: r.getString("status"),
      token: r.getString("token"),
      expires_at: r.getString("expires_at"),
      accepted_at: r.getString("accepted_at"),
    })),
  });
}

function handleInviteAccept(c, opts) {
  const user = getAuthRecord(c);
  if (!user) return unauthorized(c, "not_authenticated");

  try {
    const ip = bestEffortClientIp(c?.request?.());
    const now = Date.now();
    if (!allowRequest(`invites:accept:user:${user.id}`, now, 100, 60 * 60 * 1000)) return forbidden(c, "rate_limited");
    if (ip && !allowRequest(`invites:accept:ip:${ip}`, now, 300, 60 * 60 * 1000)) return forbidden(c, "rate_limited");
  } catch (_) {}

  const parsed = parseJsonBody(c);
  if (!parsed.ok) return badRequest(c, "invalid_json");
  const body = parsed.value || {};

  const token = safeString(body?.token).trim();
  if (!token || token.length < 12 || token.length > 80) return badRequest(c, "invalid_token");

  let invite = null;
  try {
    invite = $app.dao().findFirstRecordByData("invites", "token", token);
  } catch (_) {
    return badRequest(c, "invite_not_found");
  }

  const status = safeString(invite.getString("status")).trim();
  if (status !== "pending") return badRequest(c, "invite_not_pending");

  const expiresAtMs = Date.parse(safeString(invite.getString("expires_at")));
  if (Number.isFinite(expiresAtMs) && Date.now() > expiresAtMs) {
    try {
      invite.set("status", "expired");
      $app.dao().saveRecord(invite);
    } catch (_) {}
    return badRequest(c, "invite_expired");
  }

  const tenantId = safeString(invite.getString("tenant")).trim();
  if (!tenantId) return badRequest(c, "invite_missing_tenant");

  // If the user is already a member, accept becomes idempotent.
  try {
    $app.dao().findFirstRecordByFilter(
      "memberships",
      "user.id = {:uid} && tenant.id = {:tid}",
      { uid: user.id, tid: tenantId },
    );
    invite.set("status", "accepted");
    invite.set("accepted_by", user.id);
    invite.set("accepted_at", msToIso(Date.now()));
    $app.dao().saveRecord(invite);
    return ok(c, { ok: true, status: "already_member" });
  } catch (_) {}

  const role = clampEnum(invite.getString("role"), ["admin", "member", "viewer"], "member");

  const membershipsCollection = $app.dao().findCollectionByNameOrId("memberships");
  const membership = new Record(membershipsCollection);
  membership.set("user", user.id);
  membership.set("tenant", tenantId);
  membership.set("role", role);
  membership.set("status", "active");
  $app.dao().saveRecord(membership);
  auditLog(tenantId, user.id, "invites.accepted", { role, inviteId: invite.id, membershipId: membership.id });

  invite.set("status", "accepted");
  invite.set("accepted_by", user.id);
  invite.set("accepted_at", msToIso(Date.now()));
  $app.dao().saveRecord(invite);

  return ok(c, {
    ok: true,
    tenant: tenantId,
    role,
    membership: { id: membership.id },
  });
}

module.exports = {
  json,
  ok,
  auditLog,
  safeString,
  badRequest,
  unauthorized,
  forbidden,
  internalError,
  serviceUnavailable,
  getEnv,
  clampText,
  normalizeSlug,
  normalizeEmail,
  normalizeTags,
  getClientIp,
  bestEffortClientIp,
  randToken,
  randCode,
  validateUploadToken,
  clamp01to100,
  clampNum,
  requireRole,
  parseJsonBody,
  parseJsonValue,
  clampEnum,
  clampIntervalDays,
  encodeForm,
  stripeRequest,
  stripeConnectRequest,
  computeTenantEntitlementsFromStripeSubscription,
  buildStripeConnectAuthorizeUrl,
  buildStripeConnectState,
  parseStripeConnectState,
  normalizeKeyName,
  isOverdue,
  isExpired,
  setTenantSlug,
  setTenantSlugFromTenantId,
  allowRequest,
  toDateOnlyIso,
  msToIso,
  findTenantForStripeEvent,
  getAuthRecord,
  listMissingCollections,
  handleRevenueCatWebhook,
  handleOnboardingBootstrap,
  handleBillingStatus,
  handleBillingCheckout,
  handleBillingPortal,
  handleStripeBillingWebhook,
  handleStripeConnectStart,
  handleStripeConnectCallback,
  handleInviteCreate,
  handleInviteList,
  handleInviteAccept,
};
