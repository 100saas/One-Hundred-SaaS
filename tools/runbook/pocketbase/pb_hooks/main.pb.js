// Runbook.100SaaS (Tool 48) — PocketBase hooks
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 48: start runs + checklist state updates (debounce handled client-side)

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

function normalizeTags(tags) {
  const arr = Array.isArray(tags) ? tags : [];
  return arr.map((t) => clampText(String(t || "").trim().toLowerCase(), 24)).filter(Boolean).slice(0, 20);
}

// Shared Kernel: RevenueCat webhook → entitlements sync
routerAdd("POST", "/api/webhooks/revenuecat", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleRevenueCatWebhook(c);
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "runbooks", "incidents_runs"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "runbook", toolNumber: 48, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "runbook", toolNumber: 48 });
});
routerAdd("POST", "/api/runbook/:id/start", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent, getAuthRecord } = require(__hooks + "/_shared/kernel.js");
  const user = getAuthRecord(c);
  const runbookId = String(c.pathParam("id") || "").trim();
  if (!runbookId) return c.json(400, { error: "bad_request", message: "missing_runbook_id" });

  let runbook;
  try {
    runbook = $app.dao().findRecordById("runbooks", runbookId);
  } catch (_) {
    return c.json( 404, { error: "not_found" });
  }

  const tenantId = runbook.getString("tenant");
  requireRole(user, tenantId, "member");

  const run = new Record($app.dao().findCollectionByNameOrId("incidents_runs"));
  run.set("runbook", runbookId);
  run.set("started_at", new Date().toISOString());
  run.set("checklist_state", {});
  $app.dao().saveRecord(run);

  return c.json( 200, { status: "started", run_id: run.id });
});

routerAdd("POST", "/api/run/:id/checklist", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent, getAuthRecord } = require(__hooks + "/_shared/kernel.js");
  const user = getAuthRecord(c);
  const runId = String(c.pathParam("id") || "").trim();
  if (!runId) return c.json(400, { error: "bad_request", message: "missing_run_id" });

  let run;
  try {
    run = $app.dao().findRecordById("incidents_runs", runId);
  } catch (_) {
    return c.json( 404, { error: "not_found" });
  }

  const runbookId = run.getString("runbook");
  const runbook = $app.dao().findRecordById("runbooks", runbookId);
  const tenantId = runbook.getString("tenant");
  requireRole(user, tenantId, "member");

  const parsed = parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const body = parsed.value;

  const state = body?.checklist_state && typeof body.checklist_state === "object" ? body.checklist_state : null;
  if (!state) return c.json(400, { error: "bad_request", message: "missing_checklist_state" });
  run.set("checklist_state", state);
  if (body?.completed === true && user) run.set("completed_by", user.id);
  $app.dao().saveRecord(run);

  return c.json( 200, { status: "saved", run_id: run.id });
});

onRecordBeforeCreateRequest("runbooks", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("title", clampText(e.record.getString("title"), 160));
  e.record.set("markdown_content", clampText(e.record.getString("markdown_content"), 80000));
  e.record.set("tags", normalizeTags(e.record.get("tags")));
});

onRecordBeforeUpdateRequest("runbooks", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("title", clampText(e.record.getString("title"), 160));
  e.record.set("markdown_content", clampText(e.record.getString("markdown_content"), 80000));
  e.record.set("tags", normalizeTags(e.record.get("tags")));
});
