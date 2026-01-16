// MRR.100SaaS (Tool 8) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 8: Daily cron to compute snapshot + movement bridge from Stripe subscriptions

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

function toDateOnlyIso(d) {
  const dt = new Date(d);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day} 00:00:00.000Z`;
}

function stripeListSubscriptions(accessToken) {
  const url = "https://api.stripe.com/v1/subscriptions?status=all&limit=100";
  const res = $http.send({
    url,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res?.json?.();
}

function computeMonthlyMrrCentsFromSubscription(sub) {
  const items = sub?.items?.data;
  if (!Array.isArray(items)) return 0;

  let total = 0;
  for (const item of items) {
    const qty = typeof item?.quantity === "number" ? item.quantity : 1;
    const unitAmount = typeof item?.price?.unit_amount === "number" ? item.price.unit_amount : 0;
    const interval = item?.price?.recurring?.interval ? String(item.price.recurring.interval) : "month";
    const intervalCount =
      typeof item?.price?.recurring?.interval_count === "number" ? item.price.recurring.interval_count : 1;

    let monthly = unitAmount * qty;
    if (interval === "year") monthly = Math.round(monthly / (12 * intervalCount));
    else if (interval === "month") monthly = Math.round(monthly / intervalCount);
    else {
      // day/week intervals are not handled accurately; treat as 0 for now to avoid bad finance math.
      monthly = 0;
    }
    total += monthly;
  }
  return total;
}

function anySnapshotsExist(tenantId, dateIso) {
  try {
    const r = $app
      .dao()
      .findFirstRecordByFilter("mrr_snapshots", "tenant.id = {:tid} && date = {:d}", { tid: tenantId, d: dateIso });
    return !!r;
  } catch (_) {
    return false;
  }
}

function upsertSnapshot(tenantId, dateIso, subId, mrrCents, status) {
  let existing = null;
  try {
    existing = $app
      .dao()
      .findFirstRecordByFilter("mrr_snapshots", "tenant.id = {:tid} && date = {:d} && sub_id = {:sid}", {
        tid: tenantId,
        d: dateIso,
        sid: subId,
      });
  } catch (_) {}

  const col = $app.dao().findCollectionByNameOrId("mrr_snapshots");
  const rec = existing || new Record(col);
  rec.set("tenant", tenantId);
  rec.set("date", dateIso);
  rec.set("sub_id", subId);
  rec.set("mrr_cents", mrrCents);
  rec.set("status", status || "");

  $app.dao().saveRecord(rec);
}

function loadSnapshotsMap(tenantId, dateIso) {
  const map = {};
  const records = $app
    .dao()
    .findRecordsByFilter("mrr_snapshots", "tenant.id = {:tid} && date = {:d}", "", 2000, {
      tid: tenantId,
      d: dateIso,
    });

  for (const rec of records || []) {
    map[rec.getString("sub_id")] = rec.getInt("mrr_cents");
  }
  return map;
}

function upsertMovement(tenantId, dateIso, type, amountDelta) {
  let existing = null;
  try {
    existing = $app
      .dao()
      .findFirstRecordByFilter("mrr_movements", "tenant.id = {:tid} && date = {:d} && type = {:t}", {
        tid: tenantId,
        d: dateIso,
        t: type,
      });
  } catch (_) {}

  const col = $app.dao().findCollectionByNameOrId("mrr_movements");
  const rec = existing || new Record(col);
  rec.set("tenant", tenantId);
  rec.set("date", dateIso);
  rec.set("type", type);
  rec.set("amount_delta", amountDelta);
  $app.dao().saveRecord(rec);
}

function computeMovements(todayMap, yesterdayMap) {
  let mNew = 0;
  let churn = 0;
  let expansion = 0;
  let contraction = 0;

  const allIds = new Set([...Object.keys(todayMap), ...Object.keys(yesterdayMap)]);
  for (const id of allIds) {
    const t = todayMap[id] ?? null;
    const y = yesterdayMap[id] ?? null;

    if (y === null && t !== null) mNew += t;
    else if (y !== null && t === null) churn += y;
    else if (y !== null && t !== null) {
      if (t > y) expansion += t - y;
      else if (t < y) contraction += y - t;
    }
  }

  return { new: mNew, churn, expansion, contraction };
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
  return k.handleBillingStatus(c, { toolSlug: "mrr" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "mrr" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "mrr" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "mrr" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "mrr" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "mrr_movements", "mrr_snapshots"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "mrr", toolNumber: 8, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "mrr", toolNumber: 8 });
});

// Tool 8: Run once (owner-only) for testing without waiting for cron.
routerAdd("POST", "/api/mrr/run_once", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`mrr_run_once:user:${user.id}`, now, 20, 60 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  let accessToken = "";
  try {
    const conn = $app.dao().findFirstRecordByFilter("stripe_connections", "tenant.id = {:tid}", { tid: tenantId });
    accessToken = String(conn.getString("access_token") || "").trim();
  } catch (_) {}
  if (!accessToken) return c.json(503, { error: "stripe_connect_not_configured" });

  function toDateOnlyIsoUtc(d) {
    const dt = new Date(d);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dt.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day} 00:00:00.000Z`;
  }

  const todayIso = toDateOnlyIsoUtc(new Date());
  const yesterdayIso = toDateOnlyIsoUtc(Date.now() - 24 * 60 * 60 * 1000);

  // If already computed today, just return ok.
  if (anySnapshotsExist(tenantId, todayIso)) return c.json(200, { ok: true, skipped: true });

  try {
    const subs = stripeListSubscriptions(accessToken);
    const data = Array.isArray(subs?.data) ? subs.data : [];
    for (const sub of data) {
      const status = sub?.status ? String(sub.status) : "";
      if (status !== "active" && status !== "trialing") continue;
      const subId = sub?.id ? String(sub.id) : "";
      if (!subId) continue;
      const mrr = computeMonthlyMrrCentsFromSubscription(sub);
      upsertSnapshot(tenantId, todayIso, subId, mrr, status);
    }

    const todayMap = loadSnapshotsMap(tenantId, todayIso);
    const yesterdayMap = loadSnapshotsMap(tenantId, yesterdayIso);
    const movements = computeMovements(todayMap, yesterdayMap);

    if (movements.new) upsertMovement(tenantId, todayIso, "new", movements.new);
    if (movements.churn) upsertMovement(tenantId, todayIso, "churn", movements.churn);
    if (movements.expansion) upsertMovement(tenantId, todayIso, "expansion", movements.expansion);
    if (movements.contraction) upsertMovement(tenantId, todayIso, "contraction", movements.contraction);

    return c.json(200, { ok: true });
  } catch (e) {
    $app.logger().error("MRR run_once failed", e);
    return c.json(502, { error: "stripe_error" });
  }
});

// Tool 8: Demo seed (keyless UX)
routerAdd("POST", "/api/mrr/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`mrr_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const todayIso = k.toDateOnlyIso(new Date());
  const yesterdayIso = k.toDateOnlyIso(Date.now() - 24 * 60 * 60 * 1000);

  // Upsert a couple snapshots so totals look reasonable.
  upsertSnapshot(tenantId, todayIso, "sub_demo_a", 12000, "active");
  upsertSnapshot(tenantId, todayIso, "sub_demo_b", 8000, "active");
  upsertSnapshot(tenantId, yesterdayIso, "sub_demo_a", 10000, "active");
  upsertSnapshot(tenantId, yesterdayIso, "sub_demo_b", 8000, "active");

  // Movements: new=0, expansion=2000 (demo).
  upsertMovement(tenantId, todayIso, "expansion", 2000);

  return c.json(200, { ok: true });
});

// Daily Ledger at 00:00 UTC
cronAdd("mrr_daily", "0 0 * * *", function () {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function toDateOnlyIsoUtc(d) {
    const dt = new Date(d);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dt.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day} 00:00:00.000Z`;
  }

  function stripeListSubscriptions(accessToken) {
    const url = "https://api.stripe.com/v1/subscriptions?status=all&limit=100";
    const res = $http.send({
      url,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res?.json?.();
  }

  function computeMonthlyMrrCentsFromSubscription(sub) {
    const items = sub?.items?.data;
    if (!Array.isArray(items)) return 0;

    let total = 0;
    for (const item of items) {
      const qty = typeof item?.quantity === "number" ? item.quantity : 1;
      const unitAmount = typeof item?.price?.unit_amount === "number" ? item.price.unit_amount : 0;
      const interval = item?.price?.recurring?.interval ? String(item.price.recurring.interval) : "month";
      const intervalCount =
        typeof item?.price?.recurring?.interval_count === "number" ? item.price.recurring.interval_count : 1;

      let monthly = unitAmount * qty;
      if (interval === "year") monthly = Math.round(monthly / (12 * intervalCount));
      else if (interval === "month") monthly = Math.round(monthly / intervalCount);
      else {
        monthly = 0;
      }
      total += monthly;
    }
    return total;
  }

  function anySnapshotsExist(tenantId, dateIso) {
    try {
      const r = $app
        .dao()
        .findFirstRecordByFilter("mrr_snapshots", "tenant.id = {:tid} && date = {:d}", { tid: tenantId, d: dateIso });
      return !!r;
    } catch (_) {
      return false;
    }
  }

  function upsertSnapshot(tenantId, dateIso, subId, mrrCents, status) {
    let existing = null;
    try {
      existing = $app
        .dao()
        .findFirstRecordByFilter("mrr_snapshots", "tenant.id = {:tid} && date = {:d} && sub_id = {:sid}", {
          tid: tenantId,
          d: dateIso,
          sid: subId,
        });
    } catch (_) {}

    const col = $app.dao().findCollectionByNameOrId("mrr_snapshots");
    const rec = existing || new Record(col);
    rec.set("tenant", tenantId);
    rec.set("date", dateIso);
    rec.set("sub_id", subId);
    rec.set("mrr_cents", mrrCents);
    rec.set("status", status || "");

    $app.dao().saveRecord(rec);
  }

  function loadSnapshotsMap(tenantId, dateIso) {
    const map = {};
    const records = $app
      .dao()
      .findRecordsByFilter("mrr_snapshots", "tenant.id = {:tid} && date = {:d}", "", 2000, {
        tid: tenantId,
        d: dateIso,
      });

    for (const rec of records || []) {
      map[rec.getString("sub_id")] = rec.getInt("mrr_cents");
    }
    return map;
  }

  function upsertMovement(tenantId, dateIso, type, amountDelta) {
    let existing = null;
    try {
      existing = $app
        .dao()
        .findFirstRecordByFilter("mrr_movements", "tenant.id = {:tid} && date = {:d} && type = {:t}", {
          tid: tenantId,
          d: dateIso,
          t: type,
        });
    } catch (_) {}

    const col = $app.dao().findCollectionByNameOrId("mrr_movements");
    const rec = existing || new Record(col);
    rec.set("tenant", tenantId);
    rec.set("date", dateIso);
    rec.set("type", type);
    rec.set("amount_delta", amountDelta);
    $app.dao().saveRecord(rec);
  }

  function computeMovements(todayMap, yesterdayMap) {
    let mNew = 0;
    let churn = 0;
    let expansion = 0;
    let contraction = 0;

    const allIds = new Set([...Object.keys(todayMap), ...Object.keys(yesterdayMap)]);
    for (const id of allIds) {
      const t = todayMap[id] ?? null;
      const y = yesterdayMap[id] ?? null;

      if (y === null && t !== null) mNew += t;
      else if (y !== null && t === null) churn += y;
      else if (y !== null && t !== null) {
        if (t > y) expansion += t - y;
        else if (t < y) contraction += y - t;
      }
    }

    return { new: mNew, churn, expansion, contraction };
  }

  const todayIso = toDateOnlyIsoUtc(new Date());
  const yesterdayIso = toDateOnlyIsoUtc(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const connections = $app.dao().findRecordsByFilter("stripe_connections", "", "", 2000);
    for (const conn of connections || []) {
      const tenantId = conn.getString("tenant");
      const accessToken = conn.getString("access_token") || "";
      if (!tenantId || !accessToken) continue;

      // Idempotent per tenant/day: if any snapshot exists for today, skip.
      if (anySnapshotsExist(tenantId, todayIso)) continue;

      const subs = stripeListSubscriptions(accessToken);
      const data = Array.isArray(subs?.data) ? subs.data : [];

      for (const sub of data) {
        const status = sub?.status ? String(sub.status) : "";
        if (status !== "active" && status !== "trialing") continue;
        const subId = sub?.id ? String(sub.id) : "";
        if (!subId) continue;

        const mrr = computeMonthlyMrrCentsFromSubscription(sub);
        upsertSnapshot(tenantId, todayIso, subId, mrr, status);
      }

      const todayMap = loadSnapshotsMap(tenantId, todayIso);
      const yesterdayMap = loadSnapshotsMap(tenantId, yesterdayIso);
      const movements = computeMovements(todayMap, yesterdayMap);

      if (movements.new) upsertMovement(tenantId, todayIso, "new", movements.new);
      if (movements.churn) upsertMovement(tenantId, todayIso, "churn", movements.churn);
      if (movements.expansion) upsertMovement(tenantId, todayIso, "expansion", movements.expansion);
      if (movements.contraction) upsertMovement(tenantId, todayIso, "contraction", movements.contraction);
    }
  } catch (e) {
    $app.logger().error("MRR cron failed", e);
  }
});
