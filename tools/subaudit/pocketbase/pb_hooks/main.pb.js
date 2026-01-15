// SubAudit.100SaaS (Tool 7) — PocketBase hooks
// Subdomain: audit.100saas.com (PRD conflict with Tool 34; see NEW_PRD/PROGRESS.md)
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 7: Stripe webhook `customer.subscription.updated` → create subscription_diffs record

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
  const sub = event?.data?.object || null;
  const customerId = sub?.customer ? String(sub.customer) : null;

  if (!stripeSecretKey || !customerId) return null;
  try {
    return $app.dao().findFirstRecordByData("tenants", "stripe_customer_id", customerId);
  } catch (_) {
    return null;
  }
}

function detectChange(previousAttributes, subscription) {
  const prev = previousAttributes || {};
  const cur = subscription || {};

  if (typeof prev.cancel_at_period_end === "boolean" && prev.cancel_at_period_end !== cur.cancel_at_period_end) {
    return {
      change_type: "cancellation",
      old_value: String(prev.cancel_at_period_end),
      new_value: String(cur.cancel_at_period_end),
      actor: "system",
    };
  }

  const prevItems = prev?.items?.data;
  const curItems = cur?.items?.data;

  if (Array.isArray(prevItems) && Array.isArray(curItems) && prevItems.length && curItems.length) {
    const p0 = prevItems[0];
    const c0 = curItems[0];

    const prevQty = typeof p0?.quantity === "number" ? p0.quantity : null;
    const curQty = typeof c0?.quantity === "number" ? c0.quantity : null;

    if (prevQty !== null && curQty !== null && prevQty !== curQty) {
      return { change_type: "quantity", old_value: String(prevQty), new_value: String(curQty), actor: "system" };
    }

    const prevPrice = p0?.price?.id ? String(p0.price.id) : null;
    const curPrice = c0?.price?.id ? String(c0.price.id) : null;

    if (prevPrice && curPrice && prevPrice !== curPrice) {
      // Without amounts, we can't reliably label downgrade vs upgrade.
      return { change_type: "upgrade", old_value: prevPrice, new_value: curPrice, actor: "system" };
    }
  }

  return null;
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
  return k.handleBillingStatus(c, { toolSlug: "subaudit" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "subaudit" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "subaudit" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "subaudit" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "subaudit" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "subscription_diffs"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "subaudit", toolNumber: 7, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "subaudit", toolNumber: 7 });
});
// Tool 7: Stripe subscription updated webhook
routerAdd("POST", "/api/webhooks/stripe", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const stripeSecret = getEnv("STRIPE_WEBHOOK_SECRET");
  if (stripeSecret) {
    const sig = c.request().header.get("Stripe-Signature");
    if (!sig) return c.json(401, { error: "unauthorized", message: "missing_stripe_signature" });
  }

  try {
    function detectChangeLocal(previousAttributes, subscription) {
      const prev = previousAttributes || {};
      const cur = subscription || {};

      if (typeof prev.cancel_at_period_end === "boolean" && prev.cancel_at_period_end !== cur.cancel_at_period_end) {
        return {
          change_type: "cancellation",
          old_value: String(prev.cancel_at_period_end),
          new_value: String(cur.cancel_at_period_end),
          actor: "system",
        };
      }

      const prevItems = prev?.items?.data;
      const curItems = cur?.items?.data;

      if (Array.isArray(prevItems) && Array.isArray(curItems) && prevItems.length && curItems.length) {
        const p0 = prevItems[0];
        const c0 = curItems[0];

        const prevQty = typeof p0?.quantity === "number" ? p0.quantity : null;
        const curQty = typeof c0?.quantity === "number" ? c0.quantity : null;

        if (prevQty !== null && curQty !== null && prevQty !== curQty) {
          return { change_type: "quantity", old_value: String(prevQty), new_value: String(curQty), actor: "system" };
        }

        const prevPrice = p0?.price?.id ? String(p0.price.id) : null;
        const curPrice = c0?.price?.id ? String(c0.price.id) : null;

        if (prevPrice && curPrice && prevPrice !== curPrice) {
          // Without amounts, we can't reliably label downgrade vs upgrade.
          return { change_type: "upgrade", old_value: prevPrice, new_value: curPrice, actor: "system" };
        }
      }

      return null;
    }

    const parsed = parseJsonBody(c);
    if (!parsed.ok) {
      return c.json(400, { error: "bad_request", message: "invalid_json" });
    }
    const event = parsed.value;

    const eventType = event?.type ? String(event.type) : null;
    if (eventType !== "customer.subscription.updated") return c.json( 200, { ok: true, ignored: true });

    const subscription = event?.data?.object || null;
    const prev = event?.data?.previous_attributes || null;
    if (!subscription || !prev) return c.json( 200, { ok: true, ignored: true, reason: "no_previous_attributes" });

    const tenant = findTenantForStripeEvent(event);
    if (!tenant) return c.json( 200, { ok: true, ignored: true, reason: "tenant_not_found" });

    const subId = subscription?.id ? String(subscription.id) : "";
    const customerId = subscription?.customer ? String(subscription.customer) : "";
    if (!subId) return c.json(400, { error: "bad_request", message: "missing_subscription_id" });

    const change = detectChangeLocal(prev, subscription);
    if (!change) return c.json( 200, { ok: true, ignored: true, reason: "no_diff_detected" });

    // Best-effort dedupe: don't add exact same diff twice within a short window.
    try {
      const existing = $app.dao().findFirstRecordByFilter(
        "subscription_diffs",
        "tenant.id = {:tid} && stripe_sub_id = {:sid} && old_value = {:ov} && new_value = {:nv} && change_type = {:ct}",
        { tid: tenant.id, sid: subId, ov: change.old_value, nv: change.new_value, ct: change.change_type },
      );
      if (existing) return c.json( 200, { ok: true, deduped: true });
    } catch (_) {}

    const col = $app.dao().findCollectionByNameOrId("subscription_diffs");
    const rec = new Record(col);
    rec.set("tenant", tenant.id);
    rec.set("stripe_sub_id", subId);
    rec.set("stripe_customer_id", customerId);
    rec.set("change_type", change.change_type);
    rec.set("old_value", change.old_value);
    rec.set("new_value", change.new_value);
    rec.set("actor", change.actor);

    try {
      $app.dao().saveRecord(rec);
    } catch (e) {
      $app.logger().error("SubAudit failed to save diff", e);
      return c.json( 500, { error: "subaudit_save_failed" });
    }

    return c.json( 200, { ok: true, diffId: rec.id });
  } catch (e) {
    $app.logger().error("SubAudit Stripe webhook failed", String(e));
    return c.json(500, { error: "subaudit_webhook_failed" });
  }
});

// Tool 7: Demo seed (keyless UX)
routerAdd("POST", "/api/subaudit/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`subaudit_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const col = $app.dao().findCollectionByNameOrId("subscription_diffs");
  const diffs = [
    { ct: "cancellation", ov: "false", nv: "true" },
    { ct: "quantity", ov: "1", nv: "3" },
    { ct: "upgrade", ov: "price_basic", nv: "price_pro" },
  ];

  for (let i = 0; i < diffs.length; i++) {
    const d = diffs[i];
    const rec = new Record(col);
    rec.set("tenant", tenantId);
    rec.set("stripe_sub_id", `sub_demo_${i}`);
    rec.set("stripe_customer_id", `cus_demo_${i}`);
    rec.set("change_type", d.ct);
    rec.set("old_value", d.ov);
    rec.set("new_value", d.nv);
    rec.set("actor", "system");
    try {
      $app.dao().saveRecord(rec);
    } catch (_) {}
  }

  return c.json(200, { ok: true });
});
