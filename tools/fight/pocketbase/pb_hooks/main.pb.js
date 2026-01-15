// Generated scaffold for Fight.100SaaS (Dispute Manager) (Tool 3)
// Subdomain: fight.100saas.com
//
// Source of truth: NEW_PRD/00_SHARED_KERNEL.md + NEW_PRD/01_50_BATCH.md
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 3: Stripe webhook for `charge.dispute.created` → create dispute record + internal deadline

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

function msToIso(ms) {
  return new Date(ms).toISOString();
}

function computeInternalDeadlineMs(dueBySeconds) {
  if (!dueBySeconds || typeof dueBySeconds !== "number") return null;
  const dueMs = dueBySeconds * 1000;
  return dueMs - 24 * 60 * 60 * 1000;
}

function findTenantForStripeEvent(event) {
  // Best-effort tenant resolution:
  // 1) Stripe Connect: event.account matches stripe_connections.stripe_account_id
  // 2) Standard: attempt to resolve via charge.customer (requires STRIPE_SECRET_KEY)

  const stripeAccountId = event?.account ? String(event.account) : null;
  if (stripeAccountId) {
    try {
      const conn = $app.dao().findFirstRecordByData("stripe_connections", "stripe_account_id", stripeAccountId);
      const tenantId = conn.getString("tenant");
      if (tenantId) return $app.dao().findRecordById("tenants", tenantId);
    } catch (_) {}
  }

  const stripeSecretKey = getEnv("STRIPE_SECRET_KEY");
  const dispute = event?.data?.object || null;
  const chargeId = dispute?.charge ? String(dispute.charge) : null;
  if (!stripeSecretKey || !chargeId) return null;

  try {
    const chargeRes = $http.send({
      url: `https://api.stripe.com/v1/charges/${encodeURIComponent(chargeId)}`,
      headers: { Authorization: `Bearer ${stripeSecretKey}` },
    });
    const charge = chargeRes?.json?.();
    const customerId = charge?.customer ? String(charge.customer) : null;
    if (!customerId) return null;
    return $app.dao().findFirstRecordByData("tenants", "stripe_customer_id", customerId);
  } catch (e) {
    $app.logger().warn("Fight: failed to resolve tenant from Stripe charge", e);
    return null;
  }
}

// Shared Kernel: RevenueCat webhook → entitlements sync
routerAdd("POST", "/api/webhooks/revenuecat", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleRevenueCatWebhook(c);
});
// Stripe Connect (connect customer's Stripe account to this tenant)
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "fight" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "fight" });
});
// Team invites (no email required): create/list/accept invite tokens
routerAdd("POST", "/api/invites/create", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleInviteCreate(c, { toolSlug: "fight" });
});
routerAdd("GET", "/api/invites/list", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleInviteList(c, { toolSlug: "fight" });
});
routerAdd("POST", "/api/invites/accept", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleInviteAccept(c, { toolSlug: "fight" });
});
// Stripe billing (checkout + portal + webhook to update tenant entitlements)
routerAdd("GET", "/api/billing/status", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingStatus(c, { toolSlug: "fight" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "fight" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "fight" });
});
routerAdd("POST", "/api/onboarding/bootstrap", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleOnboardingBootstrap(c);
});
// Tool entrypoint stub (health)
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "invites", "disputes", "evidence_files"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "fight", toolNumber: 3, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "fight", toolNumber: 3 });
});
// Tool 3: Stripe dispute webhook
routerAdd("POST", "/api/webhooks/stripe", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function computeInternalDeadlineMs(dueBySeconds) {
    if (typeof dueBySeconds !== "number" || !Number.isFinite(dueBySeconds)) return null;
    const ms = Math.floor(dueBySeconds * 1000);
    // Internal deadline = Stripe evidence due_by minus 24 hours.
    return ms - 24 * 60 * 60 * 1000;
  }
  const stripeSecret = getEnv("STRIPE_WEBHOOK_SECRET");
  if (stripeSecret) {
    const sig = c.request().header.get("Stripe-Signature");
    if (!sig) return c.json(401, { error: "unauthorized", message: "missing_stripe_signature" });
  }

  const parsed = parseJsonBody(c);
  if (!parsed.ok) {
    $app.logger().warn("Fight Stripe webhook invalid JSON", parsed.error);
    return c.json(400, { error: "bad_request", message: "invalid_json" });
  }
  const event = parsed.value;

  const eventId = event?.id ? String(event.id) : null;
  const eventType = event?.type ? String(event.type) : null;
  if (!eventId || !eventType) return c.json(400, { error: "bad_request", message: "missing_event_id_or_type" });

  if (eventType !== "charge.dispute.created") {
    return c.json( 200, { ok: true, ignored: true });
  }

  const tenant = findTenantForStripeEvent(event);
  if (!tenant) {
    $app.logger().warn("Fight: could not resolve tenant for dispute event", { eventId });
    return c.json( 200, { ok: true, ignored: true, reason: "tenant_not_found" });
  }

  const dispute = event?.data?.object || null;
  const disputeId = dispute?.id ? String(dispute.id) : null;
  if (!disputeId) return c.json(400, { error: "bad_request", message: "missing_dispute_id" });

  try {
    // Idempotency: stripe_id unique
    try {
      $app.dao().findFirstRecordByData("disputes", "stripe_id", disputeId);
      return c.json( 200, { ok: true, deduped: true });
    } catch (_) {}

    const dueBy = dispute?.evidence_details?.due_by ?? dispute?.evidence_due_by ?? null;
    const dueBySeconds = typeof dueBy === "number" ? dueBy : null;

    const disputesCollection = $app.dao().findCollectionByNameOrId("disputes");
    const record = new Record(disputesCollection);

    record.set("tenant", tenant.id);
    record.set("stripe_id", disputeId);
    record.set("reason", dispute?.reason || "");
    if (dueBySeconds) record.set("due_date", msToIso(dueBySeconds * 1000));

    const internalDeadlineMs = computeInternalDeadlineMs(dueBySeconds);
    if (internalDeadlineMs) record.set("internal_deadline", msToIso(internalDeadlineMs));

    record.set("status", "gathering");

    try {
      $app.dao().saveRecord(record);
    } catch (e) {
      // Race-safe dedupe for unique stripe_id
      try {
        $app.dao().findFirstRecordByData("disputes", "stripe_id", disputeId);
        return c.json( 200, { ok: true, deduped: true });
      } catch (_) {
        throw e;
      }
    }

    return c.json( 200, { ok: true, disputeRecordId: record.id });
  } catch (e) {
    $app.logger().error("Fight Stripe webhook failed", e);
    return c.json( 500, { error: "fight_webhook_failed" });
  }
});

// Demo seed: creates a dispute for the active tenant (no Stripe required).
routerAdd("POST", "/api/fight/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const parsed = k.parseJsonBody(c);
  const body = parsed.ok ? parsed.value : {};
  const tenantId = body?.tenant ? String(body.tenant) : "";
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });

  try {
    k.requireRole(user, tenantId, "admin");
  } catch (e) {
    return c.json(403, { error: "forbidden", message: "insufficient_permissions" });
  }

  try {
    const now = Date.now();
    if (!k.allowRequest(`demo:fight:${tenantId}`, now, 5, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  } catch (_) {}

  const disputesCollection = $app.dao().findCollectionByNameOrId("disputes");
  const now = Date.now();
  const rec = new Record(disputesCollection);
  rec.set("tenant", tenantId);
  rec.set("stripe_id", `dp_demo_${tenantId}_${now}`);
  rec.set("reason", "fraudulent");
  rec.set("due_date", new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString());
  rec.set("internal_deadline", new Date(now + 4 * 24 * 60 * 60 * 1000).toISOString());
  rec.set("status", "gathering");
  $app.dao().saveRecord(rec);

  return c.json(200, { ok: true, disputeId: rec.id });
});

// ---------------------------------------------------------------------------
// Launch hardening: prevent privilege escalation via API Rules gaps.
// ---------------------------------------------------------------------------

onRecordBeforeCreateRequest((e) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(e.httpContext);
  if (user) throw new ForbiddenError("memberships_create_disabled");
}, "memberships");

onRecordBeforeUpdateRequest((e) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(e.httpContext);
  if (user) throw new ForbiddenError("memberships_update_disabled");
}, "memberships");

onRecordBeforeUpdateRequest((e) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(e.httpContext);
  if (!user) return;

  const tenantId = String(e.record?.id || "").trim();
  if (!tenantId) throw new BadRequestError("missing_tenant_id");

  k.requireRole(user, tenantId, "owner");

  const before = e.record.originalCopy();

  const beforeRc = String(before.getString("rc_customer_id") || "");
  const afterRc = String(e.record.getString("rc_customer_id") || "");
  if (beforeRc !== afterRc) throw new ForbiddenError("rc_customer_id_readonly");

  const beforeStripe = String(before.getString("stripe_customer_id") || "");
  const afterStripe = String(e.record.getString("stripe_customer_id") || "");
  if (beforeStripe !== afterStripe) throw new ForbiddenError("stripe_customer_id_readonly");

  const beforeEnt = k.parseJsonValue(before.get("entitlements"), []);
  const afterEnt = k.parseJsonValue(e.record.get("entitlements"), []);
  if (JSON.stringify(beforeEnt || null) !== JSON.stringify(afterEnt || null)) throw new ForbiddenError("entitlements_readonly");
}, "tenants");

// Invites: disallow direct CRUD via record APIs (must go through /api/invites/* routes).
onRecordBeforeCreateRequest((e) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(e.httpContext);
  if (user) throw new ForbiddenError("invites_create_disabled");
}, "invites");

onRecordBeforeUpdateRequest((e) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(e.httpContext);
  if (user) throw new ForbiddenError("invites_update_disabled");
}, "invites");

onRecordBeforeDeleteRequest((e) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(e.httpContext);
  if (user) throw new ForbiddenError("invites_delete_disabled");
}, "invites");
