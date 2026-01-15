// Shared Kernel + Recover (Tool 1) hooks.
//
// Notes:
// - This file is written for PocketBase's JS hooks runtime (pb_hooks/main.pb.js).
// - Schema creation is documented in ../SCHEMA.md (bootstrapping automation can be added later).

const ROLE_ORDER = ["viewer", "member", "admin", "owner"];

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

function findTenantForStripeInvoice(invoice) {
  const customerId = invoice?.customer ? String(invoice.customer) : null;

  if (customerId) {
    try {
      return $app.dao().findFirstRecordByData("tenants", "stripe_customer_id", customerId);
    } catch (_) {}
  }

  return null;
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
    $app.logger().warn("Slack webhook failed", e);
  }
}

function getInvoiceAmountCents(invoice) {
  const candidates = [
    invoice?.amount_due,
    invoice?.amount_remaining,
    invoice?.amount_paid,
    invoice?.total,
  ];

  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Shared Kernel: RevenueCat webhook → entitlements sync
// ---------------------------------------------------------------------------

routerAdd("POST", "/api/webhooks/revenuecat", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleRevenueCatWebhook(c);
});
// Stripe Connect (connect customer's Stripe account to this tenant)
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "recover" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "recover" });
});
// Team invites (no email required): create/list/accept invite tokens
routerAdd("POST", "/api/invites/create", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleInviteCreate(c, { toolSlug: "recover" });
});
routerAdd("GET", "/api/invites/list", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleInviteList(c, { toolSlug: "recover" });
});
routerAdd("POST", "/api/invites/accept", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleInviteAccept(c, { toolSlug: "recover" });
});
// Stripe billing (checkout + portal + webhook to update tenant entitlements)
routerAdd("GET", "/api/billing/status", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingStatus(c, { toolSlug: "recover" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "recover" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "recover" });
});
routerAdd("POST", "/api/onboarding/bootstrap", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleOnboardingBootstrap(c);
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "invites", "incidents", "rules"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "recover", toolNumber: 1, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "recover", toolNumber: 1 });
});

// Recover settings: manage rules (Slack URL is treated as a secret; only "configured" is returned).
routerAdd("GET", "/api/recover/rules", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const tenantId = String(c?.queryParam?.("tenant") || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });

  k.requireRole(user, tenantId, "owner");

  let rule = null;
  try {
    rule = $app.dao().findFirstRecordByFilter("rules", "tenant.id = {:tid}", { tid: tenantId });
  } catch (_) {}

  const minAmount = rule ? rule.getFloat("min_amount") : 0;
  const slackWebhookUrl = rule ? String(rule.getString("slack_webhook_url") || "") : "";

  return c.json(200, {
    ok: true,
    rule: {
      id: rule?.id || null,
      tenant: tenantId,
      min_amount: minAmount,
      slack_configured: Boolean(slackWebhookUrl),
    },
  });
});

routerAdd("POST", "/api/recover/rules", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  try {
    const now = Date.now();
    if (!k.allowRequest(`recover_rules:user:${user.id}`, now, 120, 60 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });
  } catch (_) {}

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const body = parsed.value || {};

  const tenantId = String(body?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const minAmount = (() => {
    const n = Number(body?.min_amount);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  })();

  const slackWebhookUrl = String(body?.slack_webhook_url || "").trim();
  if (slackWebhookUrl && !slackWebhookUrl.startsWith("https://hooks.slack.com/")) {
    return c.json(400, { error: "bad_request", message: "invalid_slack_webhook_url" });
  }

  let rule = null;
  try {
    rule = $app.dao().findFirstRecordByFilter("rules", "tenant.id = {:tid}", { tid: tenantId });
  } catch (_) {}

  const rulesCollection = $app.dao().findCollectionByNameOrId("rules");
  const rec = rule || new Record(rulesCollection);
  rec.set("tenant", tenantId);
  rec.set("min_amount", minAmount);
  // If a non-empty slack URL is provided, replace it; otherwise leave as-is.
  if (slackWebhookUrl) rec.set("slack_webhook_url", slackWebhookUrl);
  $app.dao().saveRecord(rec);

  return c.json(200, {
    ok: true,
    rule: {
      id: rec.id,
      tenant: tenantId,
      min_amount: rec.getFloat("min_amount"),
      slack_configured: Boolean(String(rec.getString("slack_webhook_url") || "")),
    },
  });
});
// ---------------------------------------------------------------------------
// Recover (Tool 1): Stripe webhook → incident + Slack
// ---------------------------------------------------------------------------

routerAdd("POST", "/api/webhooks/stripe", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const stripeSecret = k.getEnv("STRIPE_WEBHOOK_SECRET");
  if (stripeSecret) {
    // PocketBase JS hooks don’t guarantee raw body access across versions.
    // We at least enforce the presence of Stripe’s signature header when a secret is configured.
    const sig = c.request().header.get("Stripe-Signature");
    if (!sig) return c.json(401, { error: "unauthorized", message: "missing_stripe_signature" });
  }

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) {
    $app.logger().warn("Stripe webhook invalid JSON", parsed.error);
    return c.json(400, { error: "bad_request", message: "invalid_json" });
  }
  const event = parsed.value;

  const eventId = event?.id ? String(event.id) : null;
  const eventType = event?.type ? String(event.type) : null;

  if (!eventId || !eventType) return c.json(400, { error: "bad_request", message: "missing_event_id_or_type" });

  if (eventType !== "invoice.payment_failed") {
    return c.json( 200, { ok: true, ignored: true });
  }

  const invoice = event?.data?.object || null;
  if (!invoice) return c.json(400, { error: "bad_request", message: "missing_invoice" });

  const tenant = (() => {
    const customerId = invoice?.customer ? String(invoice.customer) : null;
    if (!customerId) return null;
    try {
      return $app.dao().findFirstRecordByData("tenants", "stripe_customer_id", customerId);
    } catch (_) {
      return null;
    }
  })();
  if (!tenant) {
    $app.logger().warn("Recover Stripe webhook: could not resolve tenant", { eventId });
    return c.json( 200, { ok: true, ignored: true, reason: "tenant_not_found" });
  }

  try {
    function getInvoiceAmountCentsLocal(inv) {
      const candidates = [inv?.amount_due, inv?.amount_remaining, inv?.amount_paid, inv?.total];
      for (const value of candidates) {
        if (typeof value === "number" && Number.isFinite(value)) return value;
      }
      return 0;
    }

    function slackPostLocal(webhookUrl, payload) {
      if (!webhookUrl) return;
      try {
        $http.send({
          url: webhookUrl,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        $app.logger().warn("Slack webhook failed", e);
      }
    }

    // Load rule config (if any).
    let rule = null;
    try {
      rule = $app.dao().findFirstRecordByFilter(
        "rules",
        "tenant.id = {:tid}",
        { tid: tenant.id },
      );
    } catch (_) {}

    const minAmount = rule ? rule.getFloat("min_amount") : 0;
    const slackWebhookUrl = rule ? rule.getString("slack_webhook_url") : "";

    const amountCents = getInvoiceAmountCentsLocal(invoice);
    if (amountCents < minAmount) {
      return c.json( 200, { ok: true, ignored: true, reason: "below_min_amount" });
    }

    // Idempotency: if incident exists for this Stripe event, return early.
    try {
      $app.dao().findFirstRecordByData("incidents", "stripe_event_id", eventId);
      return c.json( 200, { ok: true, deduped: true });
    } catch (_) {}

    const incidentsCollection = $app.dao().findCollectionByNameOrId("incidents");
    const incident = new Record(incidentsCollection);

    incident.set("tenant", tenant.id);
    incident.set("stripe_event_id", eventId);
    incident.set("amount_cents", amountCents);
    incident.set("customer_email", invoice?.customer_email || "");
    incident.set("status", "open");

    try {
      $app.dao().saveRecord(incident);
    } catch (e) {
      // If two webhook deliveries race, the unique index on stripe_event_id may reject the second.
      try {
        $app.dao().findFirstRecordByData("incidents", "stripe_event_id", eventId);
        return c.json( 200, { ok: true, deduped: true });
      } catch (_) {
        throw e;
      }
    }

    slackPostLocal(slackWebhookUrl, {
      text: `Recover: payment failed for ${invoice?.customer_email || "unknown customer"} ($${(
        amountCents / 100
      ).toFixed(2)})`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Recover — Payment Failed*\n• Amount: *$${(amountCents / 100).toFixed(
              2,
            )}*\n• Customer: *${invoice?.customer_email || "unknown"}*\n• Tenant: \`${
              tenant.getString("slug") || tenant.id
            }\`\n• Stripe Event: \`${eventId}\``,
          },
        },
      ],
    });

    return c.json( 200, { ok: true, incidentId: incident.id });
  } catch (e) {
    $app.logger().error("Recover Stripe webhook failed", e);
    return c.json(500, { error: "internal_error", message: "recover_webhook_failed" });
  }
});

// Demo seed (no Stripe required): creates a few incidents for the active tenant.
routerAdd("POST", "/api/recover/demo/seed", (c) => {
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
    if (!k.allowRequest(`demo:recover:${tenantId}`, now, 5, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  } catch (_) {}

  const incidentsCollection = $app.dao().findCollectionByNameOrId("incidents");
  const now = Date.now();
  const samples = [
    { amount_cents: 12900, customer_email: "customer1@example.com", status: "open" },
    { amount_cents: 5900, customer_email: "customer2@example.com", status: "assigned" },
    { amount_cents: 2500, customer_email: "customer3@example.com", status: "snoozed" },
  ];

  let created = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const rec = new Record(incidentsCollection);
    rec.set("tenant", tenantId);
    rec.set("stripe_event_id", `demo_${tenantId}_${now}_${i}`);
    rec.set("amount_cents", s.amount_cents);
    rec.set("customer_email", s.customer_email);
    rec.set("status", s.status);
    $app.dao().saveRecord(rec);
    created += 1;
  }

  return c.json(200, { ok: true, created });
});

// ---------------------------------------------------------------------------
// Launch hardening: prevent privilege escalation via API Rules gaps.
// - Disallow direct membership creation via user auth (must go through controlled endpoints).
// - Prevent owners from editing billing identifiers/entitlements directly.
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

  // Only owners can update tenant display fields; billing fields are admin/system-only.
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
