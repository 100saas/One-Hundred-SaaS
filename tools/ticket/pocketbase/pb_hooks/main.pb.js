// Ticket.100SaaS (Tool 19) — PocketBase hooks
// Subdomain: ticket.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Shared Kernel: self-serve onboarding + billing + Stripe connect
// - Tool 19: SLA calculation on ticket create

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

function clampEnum(value, allowed, fallback) {
  const v = String(value || "").trim();
  return allowed.includes(v) ? v : fallback;
}

function computeSlaBreachIso(nowMs, slaHours) {
  const h = typeof slaHours === "number" && isFinite(slaHours) ? slaHours : 24;
  const ms = nowMs + Math.max(0, h) * 60 * 60 * 1000;
  return new Date(ms).toISOString();
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
  return k.handleBillingStatus(c, { toolSlug: "ticket" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "ticket" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "ticket" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "ticket" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "ticket" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "forms", "tickets", "ticket_messages"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "ticket", toolNumber: 19, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "ticket", toolNumber: 19 });
});

// Tool 19: demo seed (owner-only)
routerAdd("POST", "/api/ticket/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`ticket_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const formsCol = $app.dao().findCollectionByNameOrId("forms");
  const ticketsCol = $app.dao().findCollectionByNameOrId("tickets");
  const msgsCol = $app.dao().findCollectionByNameOrId("ticket_messages");

  const form = new Record(formsCol);
  form.set("tenant", tenantId);
  form.set("name", "Support");
  form.set("sla_hours", 24);
  $app.dao().saveRecord(form);

  const t1 = new Record(ticketsCol);
  t1.set("tenant", tenantId);
  t1.set("form", form.id);
  t1.set("subject", "Can you help me with onboarding?");
  t1.set("requester_email", "customer@example.com");
  $app.dao().saveRecord(t1);

  const m1 = new Record(msgsCol);
  m1.set("ticket", t1.id);
  m1.set("sender_type", "customer");
  m1.set("body_html", "<p>I’m stuck on step 2.</p>");
  m1.set("is_internal_note", false);
  $app.dao().saveRecord(m1);

  return c.json(200, { ok: true, formId: form.id, ticketId: t1.id });
});

// Public: fetch a form by id (no auth)
routerAdd("GET", "/api/ticket/public/form", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const formId = String(c.queryParam("form") || "").trim();
  if (!formId) return c.json(400, { error: "bad_request", message: "missing_form" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`ticket_public_form:ip:${ip}:form:${formId}`, now, 120, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  try {
    const form = $app.dao().findRecordById("forms", formId);
    return c.json(200, {
      ok: true,
      form: {
        id: form.id,
        name: String(form.getString("name") || ""),
        sla_hours: form.getFloat("sla_hours") || 24,
      },
    });
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }
});

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Public: submit a ticket for a form (creates ticket + initial message server-side)
routerAdd("POST", "/api/ticket/public/submit", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const body = parsed.value || {};

  const formId = String(body.form || "").trim();
  if (!formId) return c.json(400, { error: "bad_request", message: "missing_form" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`ticket_public_submit:ip:${ip}:form:${formId}`, now, 12, 10 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let form = null;
  try {
    form = $app.dao().findRecordById("forms", formId);
  } catch (_) {
    return c.json(404, { error: "not_found", message: "form_not_found" });
  }

  const tenantId = String(form.getString("tenant") || "").trim();
  if (!tenantId) return c.json(500, { error: "internal_error", message: "form_missing_tenant" });

  const email = k.normalizeEmail(body.requester_email) || "";
  if (!email) return c.json(400, { error: "bad_request", message: "invalid_email" });

  const subject = k.clampText(String(body.subject || "").trim(), 140);
  if (!subject) return c.json(400, { error: "bad_request", message: "missing_subject" });

  const message = k.clampText(String(body.message || "").trim(), 5000);
  if (!message) return c.json(400, { error: "bad_request", message: "missing_message" });

  const ticketsCol = $app.dao().findCollectionByNameOrId("tickets");
  const msgsCol = $app.dao().findCollectionByNameOrId("ticket_messages");

  const ticket = new Record(ticketsCol);
  ticket.set("tenant", tenantId);
  ticket.set("form", formId);
  ticket.set("subject", subject);
  ticket.set("requester_email", email);
  $app.dao().saveRecord(ticket);

  const msg = new Record(msgsCol);
  msg.set("ticket", ticket.id);
  msg.set("sender_type", "customer");
  msg.set("is_internal_note", false);
  msg.set("body_html", `<p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>`);
  $app.dao().saveRecord(msg);

  return c.json(200, { ok: true, ticketId: ticket.id });
});

onRecordBeforeCreateRequest("tickets", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function computeSlaBreachIso(nowMs, slaHours) {
    const h = typeof slaHours === "number" && isFinite(slaHours) ? slaHours : 24;
    const ms = nowMs + Math.max(0, h) * 60 * 60 * 1000;
    return new Date(ms).toISOString();
  }
  const now = Date.now();

  const tenantId = e.record.getString("tenant");
  if (!tenantId) throw new BadRequestError("missing_tenant");

  // If internal (agent), enforce membership; if public form submission, this may be absent.
  const user = e.httpContext?.auth?.record || null;
  if (user) requireRole(user, tenantId, "member");

  e.record.set("status", clampEnum(e.record.getString("status"), ["new", "open", "pending", "resolved"], "new"));
  e.record.set("priority", clampEnum(e.record.getString("priority"), ["low", "medium", "high"], "medium"));

  const subject = String(e.record.getString("subject") || "").trim();
  if (subject.length > 140) e.record.set("subject", subject.slice(0, 140));

  const formId = e.record.getString("form");
  let slaHours = 24;
  if (formId) {
    try {
      const form = $app.dao().findRecordById("forms", formId);
      slaHours = form.getFloat("sla_hours") || 24;
    } catch (_) {}
  }

  e.record.set("sla_breach_at", computeSlaBreachIso(now, slaHours));
});
