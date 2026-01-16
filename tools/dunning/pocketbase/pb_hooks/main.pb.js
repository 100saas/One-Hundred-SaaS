// Dunning.100SaaS (Tool 9) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 9: sequence/steps validation + seed endpoint (3 best-practice templates)

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

function clampEnum(v, allowed, fallback) {
  const s = String(v || "").trim();
  return allowed.includes(s) ? s : fallback;
}

function seedTemplates(tenantId) {
  const templates = [
    {
      name: "The Friendly Nudge",
      trigger: "payment_failed",
      steps: [
        {
          day_delay: 0,
          subject: "Quick heads up — your payment didn’t go through",
          body_html:
            "<p>Hey {{customer.name}},</p><p>Looks like your last payment for {{invoice.amount}} didn’t go through.</p><p>You can update your card here: {{update_card_link}}</p>",
          type: "email",
        },
      ],
    },
    {
      name: "The CEO Outreach",
      trigger: "payment_failed",
      steps: [
        {
          day_delay: 3,
          subject: "Can I help? Quick check-in from the founder",
          body_html:
            "<p>Hi {{customer.name}},</p><p>I noticed an issue with the invoice ({{invoice.amount}}). If you need anything, just reply — happy to help.</p><p>Update card: {{update_card_link}}</p>",
          type: "email",
        },
      ],
    },
    {
      name: "The Service Cutoff",
      trigger: "payment_failed",
      steps: [
        {
          day_delay: 7,
          subject: "Action required: service will pause unless payment updates",
          body_html:
            "<p>Hi {{customer.name}},</p><p>We still haven’t been able to process the invoice for {{invoice.amount}}.</p><p>Please update your payment method: {{update_card_link}}</p>",
          type: "email",
        },
      ],
    },
  ];

  const created = [];
  const seqCol = $app.dao().findCollectionByNameOrId("sequences");
  const stepCol = $app.dao().findCollectionByNameOrId("steps");
  for (const t of templates) {
    const seq = new Record(seqCol);
    seq.set("tenant", tenantId);
    seq.set("name", t.name);
    seq.set("trigger", t.trigger);
    $app.dao().saveRecord(seq);
    created.push({ id: seq.id, name: t.name });

    for (const st of t.steps) {
      const step = new Record(stepCol);
      step.set("sequence", seq.id);
      step.set("day_delay", st.day_delay);
      step.set("subject", st.subject);
      step.set("body_html", st.body_html);
      step.set("type", st.type);
      $app.dao().saveRecord(step);
    }
  }
  return created;
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
  return k.handleBillingStatus(c, { toolSlug: "dunning" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "dunning" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "dunning" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "dunning" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "dunning" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "sequences", "steps"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "dunning", toolNumber: 9, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "dunning", toolNumber: 9 });
});
routerAdd("POST", "/api/dunning/seed", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent, getAuthRecord } = require(__hooks + "/_shared/kernel.js");
  function seedTemplates(tenantId) {
    const templates = [
      {
        name: "The Friendly Nudge",
        trigger: "payment_failed",
        steps: [
          {
            day_delay: 0,
            subject: "Quick heads up — your payment didn’t go through",
            body_html:
              "<p>Hey {{customer.name}},</p><p>Looks like your last payment for {{invoice.amount}} didn’t go through.</p><p>You can update your card here: {{update_card_link}}</p>",
            type: "email",
          },
        ],
      },
      {
        name: "The CEO Outreach",
        trigger: "payment_failed",
        steps: [
          {
            day_delay: 3,
            subject: "Can I help? Quick check-in from the founder",
            body_html:
              "<p>Hi {{customer.name}},</p><p>I noticed an issue with the invoice ({{invoice.amount}}). If you need anything, just reply — happy to help.</p><p>Update card: {{update_card_link}}</p>",
            type: "email",
          },
        ],
      },
      {
        name: "The Service Cutoff",
        trigger: "payment_failed",
        steps: [
          {
            day_delay: 7,
            subject: "Action required: service will pause unless payment updates",
            body_html:
              "<p>Hi {{customer.name}},</p><p>We still haven’t been able to process the invoice for {{invoice.amount}}.</p><p>Please update your payment method: {{update_card_link}}</p>",
            type: "email",
          },
        ],
      },
    ];

    const created = [];
    const seqCol = $app.dao().findCollectionByNameOrId("sequences");
    const stepCol = $app.dao().findCollectionByNameOrId("steps");
    for (const t of templates) {
      const seq = new Record(seqCol);
      seq.set("tenant", tenantId);
      seq.set("name", t.name);
      seq.set("trigger", t.trigger);
      $app.dao().saveRecord(seq);
      created.push({ id: seq.id, name: t.name });

      for (const st of t.steps) {
        const step = new Record(stepCol);
        step.set("sequence", seq.id);
        step.set("day_delay", st.day_delay);
        step.set("subject", st.subject);
        step.set("body_html", st.body_html);
        step.set("type", st.type);
        $app.dao().saveRecord(step);
      }
    }
    return created;
  }
  const user = getAuthRecord(c);
  const tenantId = String(c.queryParam("tenant") || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  requireRole(user, tenantId, "admin");

  try {
    const existing = $app.dao().findRecordsByFilter("sequences", "tenant.id = {:tid}", "-created", 1, 0, { tid: tenantId });
    if (existing && existing.length) return c.json( 200, { status: "already_seeded" });
  } catch (_) {
    // ignore
  }

  try {
    const created = seedTemplates(tenantId);
    return c.json( 200, { status: "seeded", created });
  } catch (e) {
    $app.logger().error("dunning seed failed", e);
    return c.json( 500, { error: "seed_failed" });
  }
});

onRecordBeforeCreateRequest("sequences", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("name", clampText(e.record.getString("name"), 100));
  e.record.set("trigger", clampEnum(e.record.getString("trigger"), ["payment_failed", "card_expiring"], "payment_failed"));
});

onRecordBeforeUpdateRequest("sequences", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("name", clampText(e.record.getString("name"), 100));
  e.record.set("trigger", clampEnum(e.record.getString("trigger"), ["payment_failed", "card_expiring"], "payment_failed"));
});

onRecordBeforeCreateRequest("steps", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const seqId = e.record.getString("sequence");
  if (seqId) {
    const seq = $app.dao().findRecordById("sequences", seqId);
    const tenantId = seq.getString("tenant");
    if (user && tenantId) requireRole(user, tenantId, "admin");
  }

  const d = e.record.getInt("day_delay");
  e.record.set("day_delay", d < 0 ? 0 : d > 365 ? 365 : d);
  e.record.set("subject", clampText(e.record.getString("subject"), 140));
  e.record.set("body_html", clampText(e.record.getString("body_html"), 12000));
  e.record.set("type", clampEnum(e.record.getString("type"), ["email", "in_app_banner"], "email"));
});

onRecordBeforeUpdateRequest("steps", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const d = e.record.getInt("day_delay");
  e.record.set("day_delay", d < 0 ? 0 : d > 365 ? 365 : d);
  e.record.set("subject", clampText(e.record.getString("subject"), 140));
  e.record.set("body_html", clampText(e.record.getString("body_html"), 12000));
  e.record.set("type", clampEnum(e.record.getString("type"), ["email", "in_app_banner"], "email"));
});
