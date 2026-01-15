// Action.100SaaS (Tool 28) — PocketBase hooks
// Subdomain: action.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Shared Kernel: self-serve onboarding + billing + Stripe connect
// - Tool 28: Ensure action_items.tenant matches meeting.tenant and clamp fields

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

function clampText(v, maxLen) {
  const s = String(v || "");
  return s.length > maxLen ? s.slice(0, maxLen) : s;
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
  return k.handleBillingStatus(c, { toolSlug: "action" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "action" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "action" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "action" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "action" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "meetings", "action_items"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "action", toolNumber: 28, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "action", toolNumber: 28 });
});

// Tool 28: demo seed (owner-only)
routerAdd("POST", "/api/action/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`action_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const meetingsCol = $app.dao().findCollectionByNameOrId("meetings");
  const itemsCol = $app.dao().findCollectionByNameOrId("action_items");

  const meeting = new Record(meetingsCol);
  meeting.set("tenant", tenantId);
  meeting.set("title", "Weekly Team Sync");
  meeting.set("date", new Date().toISOString());
  meeting.set("attendees", "Alice, Bob, Carol");
  meeting.set("notes", "## Notes\n- Discussed roadmap\n");
  $app.dao().saveRecord(meeting);

  const tasks = [
    { task: "Send updated proposal to Acme", assignee: "Alice" },
    { task: "Follow up on API keys", assignee: "Bob" },
  ];
  for (const t of tasks) {
    const rec = new Record(itemsCol);
    rec.set("meeting", meeting.id);
    rec.set("tenant", tenantId);
    rec.set("task", t.task);
    rec.set("assignee", t.assignee);
    rec.set("is_done", false);
    rec.set("due_date", new Date(Date.now() + 3 * 86400_000).toISOString());
    $app.dao().saveRecord(rec);
  }

  return c.json(200, { ok: true, meetingId: meeting.id });
});
onRecordBeforeCreateRequest("meetings", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "member");
  e.record.set("title", clampText(e.record.getString("title"), 140));
  e.record.set("attendees", clampText(e.record.getString("attendees"), 400));
  e.record.set("notes", clampText(e.record.getString("notes"), 50_000));
});

onRecordBeforeUpdateRequest("meetings", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "member");
  e.record.set("title", clampText(e.record.getString("title"), 140));
  e.record.set("attendees", clampText(e.record.getString("attendees"), 400));
  e.record.set("notes", clampText(e.record.getString("notes"), 50_000));
});

onRecordBeforeCreateRequest("action_items", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const meetingId = e.record.getString("meeting");
  if (!meetingId) throw new BadRequestError("missing_meeting");

  const meeting = $app.dao().findRecordById("meetings", meetingId);
  const tenantId = meeting.getString("tenant");
  if (!tenantId) throw new BadRequestError("meeting_missing_tenant");
  if (user) requireRole(user, tenantId, "member");

  e.record.set("tenant", tenantId);
  e.record.set("task", clampText(e.record.getString("task"), 240));
  e.record.set("assignee", clampText(e.record.getString("assignee"), 120));
  e.record.set("is_done", !!e.record.getBool("is_done"));
});

onRecordBeforeUpdateRequest("action_items", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const meetingId = e.record.getString("meeting");
  if (!meetingId) throw new BadRequestError("missing_meeting");
  const meeting = $app.dao().findRecordById("meetings", meetingId);
  const tenantId = meeting.getString("tenant");
  if (!tenantId) throw new BadRequestError("meeting_missing_tenant");
  if (user) requireRole(user, tenantId, "member");
  e.record.set("tenant", tenantId);
  e.record.set("task", clampText(e.record.getString("task"), 240));
  e.record.set("assignee", clampText(e.record.getString("assignee"), 120));
  e.record.set("is_done", !!e.record.getBool("is_done"));
});
