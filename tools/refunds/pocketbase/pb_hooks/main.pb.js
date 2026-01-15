// Refunds.100SaaS (Tool 4) — PocketBase hooks
// Subdomain: refunds.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 4:
//   - Stripe webhook: `charge.refunded` → upsert refund_metadata + increment refund_daily_stats
//   - Cron: anomaly detection using Z-score over last 30 days

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

function slackPost(webhookUrl, payload) {
  if (!webhookUrl) return;
  try {
    $http.send({
      url: webhookUrl,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    $app.logger().warn("Refunds: Slack webhook failed", e);
  }
}

function toDateOnlyIso(d) {
  const dt = new Date(d);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day} 00:00:00.000Z`;
}

function findTenantForStripeEvent(event) {
  const stripeAccountId = event?.account ? String(event.account) : null;
  if (stripeAccountId) {
    try {
      const conn = $app.dao().findFirstRecordByData("stripe_connections", "stripe_account_id", stripeAccountId);
      const tenantId = conn.getString("tenant");
      if (tenantId) return $app.dao().findRecordById("tenants", tenantId);
    } catch (_) {}
  }

  const stripeSecretKey = getEnv("STRIPE_SECRET_KEY");
  const charge = event?.data?.object || null;
  const customerId = charge?.customer ? String(charge.customer) : null;
  if (!stripeSecretKey || !customerId) return null;

  try {
    return $app.dao().findFirstRecordByData("tenants", "stripe_customer_id", customerId);
  } catch (_) {
    return null;
  }
}

function getOrCreateDailyStat(tenantId, dateIso) {
  try {
    return $app
      .dao()
      .findFirstRecordByFilter("refund_daily_stats", "tenant.id = {:tid} && date = {:d}", {
        tid: tenantId,
        d: dateIso,
      });
  } catch (_) {}

  const collection = $app.dao().findCollectionByNameOrId("refund_daily_stats");
  const record = new Record(collection);
  record.set("tenant", tenantId);
  record.set("date", dateIso);
  record.set("count", 0);
  record.set("volume_cents", 0);
  record.set("is_anomaly", false);
  $app.dao().saveRecord(record);
  return record;
}

function meanStdDev(values) {
  const xs = values.filter((v) => typeof v === "number" && isFinite(v));
  if (xs.length === 0) return { mean: 0, stdDev: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / xs.length;
  return { mean, stdDev: Math.sqrt(variance) };
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
  return k.handleBillingStatus(c, { toolSlug: "refunds" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "refunds" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "refunds" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "refunds" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "refunds" });
});
// Tool entrypoint stub (health)
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "refund_daily_stats", "refund_metadata", "refund_settings"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "refunds", toolNumber: 4, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "refunds", toolNumber: 4 });
});
// Stripe webhook: charge.refunded
routerAdd("POST", "/api/webhooks/stripe", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function slackPost(webhookUrl, payload) {
    if (!webhookUrl) return;
    try {
      $http.send({
        url: webhookUrl,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      $app.logger().warn("Refunds: Slack webhook failed", e);
    }
  }

  function toDateOnlyIsoUtc(d) {
    const dt = new Date(d);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dt.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day} 00:00:00.000Z`;
  }

  function findTenantForStripeEventLocal(event) {
    const stripeAccountId = event?.account ? String(event.account) : null;
    if (stripeAccountId) {
      try {
        const conn = $app.dao().findFirstRecordByData("stripe_connections", "stripe_account_id", stripeAccountId);
        const tenantId = conn.getString("tenant");
        if (tenantId) return $app.dao().findRecordById("tenants", tenantId);
      } catch (_) {}
    }

    const stripeSecretKey = getEnv("STRIPE_SECRET_KEY");
    const charge = event?.data?.object || null;
    const customerId = charge?.customer ? String(charge.customer) : null;
    if (!stripeSecretKey || !customerId) return null;

    try {
      return $app.dao().findFirstRecordByData("tenants", "stripe_customer_id", customerId);
    } catch (_) {
      return null;
    }
  }

  function getOrCreateDailyStat(tenantId, dateIso) {
    try {
      return $app
        .dao()
        .findFirstRecordByFilter("refund_daily_stats", "tenant.id = {:tid} && date = {:d}", {
          tid: tenantId,
          d: dateIso,
        });
    } catch (_) {}

    const collection = $app.dao().findCollectionByNameOrId("refund_daily_stats");
    const record = new Record(collection);
    record.set("tenant", tenantId);
    record.set("date", dateIso);
    record.set("count", 0);
    record.set("volume_cents", 0);
    record.set("is_anomaly", false);
    $app.dao().saveRecord(record);
    return record;
  }

  const stripeSecret = getEnv("STRIPE_WEBHOOK_SECRET");
  if (stripeSecret) {
    const sig = c.request().header.get("Stripe-Signature");
    if (!sig) return c.json(401, { error: "unauthorized", message: "missing_stripe_signature" });
  }

  const parsed = parseJsonBody(c);
  if (!parsed.ok) {
    return c.json(400, { error: "bad_request", message: "invalid_json" });
  }
  const event = parsed.value;

  const eventType = event?.type ? String(event.type) : null;
  if (eventType !== "charge.refunded") return c.json( 200, { ok: true, ignored: true });

  const tenant = findTenantForStripeEventLocal(event);
  if (!tenant) return c.json( 200, { ok: true, ignored: true, reason: "tenant_not_found" });

  const charge = event?.data?.object || null;
  const refunds = charge?.refunds?.data || [];
  if (!Array.isArray(refunds) || refunds.length === 0) return c.json( 200, { ok: true, ignored: true, reason: "no_refunds" });

  const todayIso = toDateOnlyIsoUtc(new Date());
  const daily = getOrCreateDailyStat(tenant.id, todayIso);

  let created = 0;
  let volumeAdded = 0;

  for (const refund of refunds) {
    const refundId = refund?.id ? String(refund.id) : null;
    if (!refundId) continue;

    // Create metadata record if missing; only increment stats on first create.
    try {
      $app.dao().findFirstRecordByData("refund_metadata", "stripe_refund_id", refundId);
      continue;
    } catch (_) {}

    const col = $app.dao().findCollectionByNameOrId("refund_metadata");
    const rec = new Record(col);
    rec.set("tenant", tenant.id);
    rec.set("stripe_refund_id", refundId);
    rec.set("internal_reason", "");
    rec.set("note", "");

    try {
      $app.dao().saveRecord(rec);
    } catch (e) {
      // Race-safe: treat unique violations as existing.
      try {
        $app.dao().findFirstRecordByData("refund_metadata", "stripe_refund_id", refundId);
        continue;
      } catch (_) {
        throw e;
      }
    }

    created += 1;
    const amount = typeof refund?.amount === "number" ? refund.amount : 0;
    volumeAdded += amount;
  }

  if (created > 0) {
    daily.set("count", daily.getInt("count") + created);
    daily.set("volume_cents", daily.getInt("volume_cents") + volumeAdded);
    $app.dao().saveRecord(daily);
  }

  return c.json( 200, { ok: true, created, volumeAdded });
});

// Tool 4: Settings (Z threshold + optional Slack)
routerAdd("GET", "/api/refunds/settings", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const tenantId = String(c.queryParam("tenant") || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "member");

  try {
    const settings = $app.dao().findFirstRecordByFilter("refund_settings", "tenant.id = {:tid}", { tid: tenantId });
    const thr = settings.getFloat("z_threshold") || 2.0;
    const slack = String(settings.getString("slack_webhook_url") || "").trim();
    return c.json(200, { z_threshold: thr, slack_configured: Boolean(slack) });
  } catch (_) {
    return c.json(200, { z_threshold: 2.0, slack_configured: false });
  }
});

routerAdd("POST", "/api/refunds/settings", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`refunds_settings:user:${user.id}`, now, 60, 60 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const payload = parsed.value || {};

  const tenantId = String(payload.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const zRaw = typeof payload.z_threshold === "number" ? payload.z_threshold : Number(payload.z_threshold);
  const z = Number.isFinite(zRaw) ? Math.max(0.1, Math.min(10, zRaw)) : 2.0;

  let slackUrl = payload.slack_webhook_url != null ? String(payload.slack_webhook_url).trim() : null;
  if (slackUrl === "") slackUrl = null;
  if (slackUrl && !slackUrl.startsWith("https://hooks.slack.com/")) {
    return c.json(400, { error: "bad_request", message: "invalid_slack_webhook_url" });
  }

  let rec = null;
  try {
    rec = $app.dao().findFirstRecordByFilter("refund_settings", "tenant.id = {:tid}", { tid: tenantId });
  } catch (_) {}

  const col = $app.dao().findCollectionByNameOrId("refund_settings");
  const settings = rec || new Record(col);
  settings.set("tenant", tenantId);
  settings.set("z_threshold", z);
  if (slackUrl != null) settings.set("slack_webhook_url", slackUrl);

  $app.dao().saveRecord(settings);
  return c.json(200, { ok: true, z_threshold: z, slack_configured: Boolean(slackUrl) });
});

// Tool 4: Demo seed (keyless UX)
routerAdd("POST", "/api/refunds/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`refunds_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  function upsertDaily(tenant, dateIso, count, volumeCents, isAnomaly) {
    let existing = null;
    try {
      existing = $app.dao().findFirstRecordByFilter("refund_daily_stats", "tenant.id = {:tid} && date = {:d}", { tid: tenant, d: dateIso });
    } catch (_) {}
    const col = $app.dao().findCollectionByNameOrId("refund_daily_stats");
    const rec = existing || new Record(col);
    rec.set("tenant", tenant);
    rec.set("date", dateIso);
    rec.set("count", count);
    rec.set("volume_cents", volumeCents);
    rec.set("is_anomaly", !!isAnomaly);
    $app.dao().saveRecord(rec);
  }

  // Seed last 30 days with a couple anomalies.
  const days = 30;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const iso = k.toDateOnlyIso(d);
    const baseCount = 2 + Math.floor(Math.random() * 6);
    const baseVol = baseCount * (500 + Math.floor(Math.random() * 4000));
    const anomaly = i === 5 || i === 18;
    const vol = anomaly ? baseVol * 6 : baseVol;
    const cnt = anomaly ? baseCount * 3 : baseCount;
    upsertDaily(tenantId, iso, cnt, vol, anomaly);
  }

  // Seed a few metadata rows.
  const metaCol = $app.dao().findCollectionByNameOrId("refund_metadata");
  for (let i = 0; i < 5; i++) {
    const rid = `re_demo_${tenantId.slice(0, 6)}_${i}`;
    try {
      $app.dao().findFirstRecordByData("refund_metadata", "stripe_refund_id", rid);
      continue;
    } catch (_) {}
    const rec = new Record(metaCol);
    rec.set("tenant", tenantId);
    rec.set("stripe_refund_id", rid);
    rec.set("internal_reason", ["bug", "fraud", "pricing", "goodwill"][i % 4]);
    rec.set("note", "Seeded demo refund metadata.");
    try {
      $app.dao().saveRecord(rec);
    } catch (_) {}
  }

  return c.json(200, { ok: true });
});

// Cron: anomaly detection at 1 AM UTC
cronAdd("refunds_anomaly_daily", "0 1 * * *", function () {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function slackPost(webhookUrl, payload) {
    if (!webhookUrl) return;
    try {
      $http.send({
        url: webhookUrl,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      $app.logger().warn("Refunds: Slack webhook failed", e);
    }
  }

  function meanStdDev(values) {
    const xs = values.filter((v) => typeof v === "number" && isFinite(v));
    if (xs.length === 0) return { mean: 0, stdDev: 0 };
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const variance = xs.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / xs.length;
    return { mean, stdDev: Math.sqrt(variance) };
  }
  try {
    const settingsRecords = $app.dao().findRecordsByFilter("refund_settings", "", "", 500);
    for (const settings of settingsRecords) {
      const tenantId = settings.getString("tenant");
      const threshold = settings.getFloat("z_threshold") || 2.0;
      const slackWebhookUrl = settings.getString("slack_webhook_url") || "";

      const stats = $app
        .dao()
        .findRecordsByFilter(
          "refund_daily_stats",
          "tenant.id = {:tid}",
          "-date",
          31,
          { tid: tenantId },
        );

      if (!stats || stats.length < 8) continue; // require some history

      const yesterday = stats[0];
      const history = stats.slice(1).map((r) => r.getInt("volume_cents"));
      const { mean, stdDev } = meanStdDev(history);
      const value = yesterday.getInt("volume_cents");
      const z = stdDev === 0 ? 0 : (value - mean) / stdDev;
      const isAnomaly = z >= threshold;

      if (isAnomaly && !yesterday.getBool("is_anomaly")) {
        yesterday.set("is_anomaly", true);
        $app.dao().saveRecord(yesterday);
        slackPost(slackWebhookUrl, {
          text: `Refunds anomaly detected for tenant ${tenantId}: volume_cents=${value}, z=${z.toFixed(2)} (threshold ${threshold})`,
        });
      }
    }
  } catch (e) {
    $app.logger().error("Refunds cron failed", e);
  }
});
