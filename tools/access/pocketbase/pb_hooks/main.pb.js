// Access.100SaaS (Tool 50) — PocketBase hooks
// Subdomain: access.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 50: snapshot memberships into review_items + CSV import

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

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase().slice(0, 200);
}

function clampEnum(v, allowed, fallback) {
  const s = String(v || "").trim();
  return allowed.includes(s) ? s : fallback;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((v) => String(v || "").trim());
}

function parseAccessCsv(csv) {
  const s = String(csv || "").trim();
  if (!s) return [];
  const lines = s.split(/\\r?\\n/).filter((l) => l.trim().length);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idxEmail = headers.findIndex((h) => ["email", "user_email"].includes(h));
  const idxRole = headers.findIndex((h) => ["role"].includes(h));
  const idxLast = headers.findIndex((h) => ["last_login", "last login", "lastlogin"].includes(h));
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const email = idxEmail >= 0 ? cols[idxEmail] : "";
    if (!email) continue;
    rows.push({
      user_email: normalizeEmail(email),
      role: idxRole >= 0 ? clampText(cols[idxRole], 80) : "",
      last_login: idxLast >= 0 ? cols[idxLast] : "",
    });
  }
  return rows;
}

// Shared Kernel: RevenueCat webhook → entitlements sync
routerAdd("POST", "/api/webhooks/revenuecat", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleRevenueCatWebhook(c);
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "review_cycles", "review_items"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "access", toolNumber: 50, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "access", toolNumber: 50 });
});
routerAdd("POST", "/api/access/cycle/:id/snapshot_internal", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent, getAuthRecord } = require(__hooks + "/_shared/kernel.js");
  try {
    const user = getAuthRecord(c);
    const cycleId = String(c.pathParam("id") || "").trim();
    if (!cycleId) return c.json(400, { error: "bad_request", message: "missing_cycle_id" });

    let cycle;
    try {
      cycle = $app.dao().findRecordById("review_cycles", cycleId);
    } catch (_) {
      return c.json( 404, { error: "not_found" });
    }

    const tenantId = cycle.getString("tenant");
    requireRole(user, tenantId, "admin");

    try {
      const existing = $app
        .dao()
        .findRecordsByFilter("review_items", "cycle.id = {:cid} && system_name = '100SaaS'", "-created", 1, 0, { cid: cycleId });
      if (existing && existing.length) return c.json( 200, { status: "already_snapshotted" });
    } catch (_) {
      // ignore
    }

    const memberships = $app
      .dao()
      .findRecordsByFilter("memberships", "tenant.id = {:tid}", "-created", 2000, 0, { tid: tenantId });

    let created = 0;
    const itemsCol = $app.dao().findCollectionByNameOrId("review_items");
    for (const m of memberships || []) {
      const uid = m.getString("user");
      let u;
      try {
        u = $app.dao().findRecordById("users", uid);
      } catch (_) {
        continue;
      }
      const item = new Record(itemsCol);
      item.set("cycle", cycleId);
      item.set("system_name", "100SaaS");
      item.set("user_email", normalizeEmail(u.getString("email")));
      item.set("role", clampText(m.getString("role"), 80));
      item.set("decision", "pending");
      $app.dao().saveRecord(item);
      created += 1;
    }

    return c.json( 200, { status: "snapshotted", created });
  } catch (e) {
    $app.logger().error("access snapshot_internal failed", e);
    return c.json(500, { error: "internal_error" });
  }
});

routerAdd("POST", "/api/access/cycle/:id/import_csv", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent, getAuthRecord } = require(__hooks + "/_shared/kernel.js");
  function parseCsvLine(line) {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
        continue;
      }
      if (ch === '"') {
        inQuotes = true;
        continue;
      }
      if (ch === ",") {
        out.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out.map((v) => String(v || "").trim());
  }

  function parseAccessCsv(csv) {
    const s = String(csv || "").trim();
    if (!s) return [];
    const lines = s.split(/\r?\n/).filter((l) => l.trim().length);
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const idxEmail = headers.findIndex((h) => ["email", "user_email"].includes(h));
    const idxRole = headers.findIndex((h) => ["role"].includes(h));
    const idxLast = headers.findIndex((h) => ["last_login", "last login", "lastlogin"].includes(h));
    const rows = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cols = parseCsvLine(lines[i]);
      const email = idxEmail >= 0 ? cols[idxEmail] : "";
      if (!email) continue;
      rows.push({
        user_email: normalizeEmail(email),
        role: idxRole >= 0 ? clampText(cols[idxRole], 80) : "",
        last_login: idxLast >= 0 ? cols[idxLast] : "",
      });
    }
    return rows;
  }

  try {
    const user = getAuthRecord(c);
    const cycleId = String(c.pathParam("id") || "").trim();
    if (!cycleId) return c.json(400, { error: "bad_request", message: "missing_cycle_id" });

    let cycle;
    try {
      cycle = $app.dao().findRecordById("review_cycles", cycleId);
    } catch (_) {
      return c.json( 404, { error: "not_found" });
    }

    const tenantId = cycle.getString("tenant");
    requireRole(user, tenantId, "admin");

    const parsed = parseJsonBody(c);
    if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
    const body = parsed.value;

    const csv = String(body?.csv || "");
    const systemName = clampText(body?.system_name || "CSV", 80);
    const rows = parseAccessCsv(csv);
    if (!rows.length) return c.json(400, { error: "bad_request", message: "no_rows" });

    let created = 0;
    const itemsCol = $app.dao().findCollectionByNameOrId("review_items");
    for (const r of rows) {
      const item = new Record(itemsCol);
      item.set("cycle", cycleId);
      item.set("system_name", systemName);
      item.set("user_email", r.user_email);
      item.set("role", clampText(r.role, 80));
      const dt = Date.parse(String(r.last_login || ""));
      if (Number.isFinite(dt)) item.set("last_login", new Date(dt).toISOString());
      item.set("decision", "pending");
      $app.dao().saveRecord(item);
      created += 1;
    }

    return c.json( 200, { status: "imported", created });
  } catch (e) {
    $app.logger().error("access import_csv failed", e);
    return c.json(500, { error: "internal_error" });
  }
});

onRecordBeforeCreateRequest("review_cycles", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("name", clampText(e.record.getString("name"), 120));
  e.record.set("status", clampEnum(e.record.getString("status"), ["active", "completed"], "active"));
});

onRecordBeforeUpdateRequest("review_cycles", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("name", clampText(e.record.getString("name"), 120));
  e.record.set("status", clampEnum(e.record.getString("status"), ["active", "completed"], e.record.getString("status")));
});

onRecordBeforeCreateRequest("review_items", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const cycleId = e.record.getString("cycle");
  if (!cycleId) throw new BadRequestError("missing_cycle");
  const cycle = $app.dao().findRecordById("review_cycles", cycleId);
  e.record.set("user_email", normalizeEmail(e.record.getString("user_email")));
  e.record.set("system_name", clampText(e.record.getString("system_name"), 80));
  e.record.set("role", clampText(e.record.getString("role"), 80));
  e.record.set("decision", clampEnum(e.record.getString("decision"), ["pending", "keep", "revoke", "modify"], "pending"));
  e.record.set("notes", clampText(e.record.getString("notes"), 2000));
  // Ensure cycle relation is valid; tenant is implied through cycle.
  if (!cycle) throw new BadRequestError("invalid_cycle");
});

onRecordBeforeUpdateRequest("review_items", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("user_email", normalizeEmail(e.record.getString("user_email")));
  e.record.set("system_name", clampText(e.record.getString("system_name"), 80));
  e.record.set("role", clampText(e.record.getString("role"), 80));
  e.record.set("decision", clampEnum(e.record.getString("decision"), ["pending", "keep", "revoke", "modify"], e.record.getString("decision")));
  e.record.set("notes", clampText(e.record.getString("notes"), 2000));
});
