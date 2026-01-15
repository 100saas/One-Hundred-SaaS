// Score.100SaaS (Tool 41) — PocketBase hooks
// Subdomain: score.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 41: rubric validation + score clamping + candidate summary endpoint

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

function clampScore(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  if (x < 1) return 1;
  if (x > 5) return 5;
  return Math.round(x);
}

function normalizeRubric(rubric) {
  const list = Array.isArray(rubric) ? rubric : [];
  return list
    .map((r) => ({
      category: String(r?.category || "").trim(),
      weight: Number(r?.weight || 1),
    }))
    .filter((r) => r.category)
    .map((r) => ({ ...r, weight: Number.isFinite(r.weight) && r.weight > 0 ? r.weight : 1 }));
}

// Shared Kernel: RevenueCat webhook → entitlements sync
routerAdd("POST", "/api/webhooks/revenuecat", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleRevenueCatWebhook(c);
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "roles", "candidates", "scorecards"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "score", toolNumber: 41, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "score", toolNumber: 41 });
});
// Debug helper for hook-runtime quirks (enabled only when DEBUG_TOOL_ROUTES=1).
routerAdd("GET", "/api/_debug/score/candidate/:id", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  if (String(k.getEnv("DEBUG_TOOL_ROUTES") || "") !== "1") return c.json(404, { error: "not_found" });
  const id = String(c.pathParam("id") || "").trim();
  if (!id) return c.json(400, { error: "bad_request", message: "missing_id" });
  try {
    const cand = $app.dao().findRecordById("candidates", id);
    const raw = cand.get("role");
    let roleFound = false;
    let roleErr = "";
    let roleRubricType = "";
    let roleRubricTag = "";
    let roleRubricIsArray = false;
    let roleRubricFirstKeys = null;
    let roleRubricFirstStr = "";
    try {
      const roleId = String(cand.getString("role") || "").trim();
      if (roleId) {
        const r = $app.dao().findRecordById("roles", roleId);
        roleFound = true;
        const rr = r.get("rubric");
        roleRubricType = typeof rr;
        roleRubricTag = Object.prototype.toString.call(rr);
        roleRubricIsArray = Array.isArray(rr);
        if (Array.isArray(rr) && rr[0] && typeof rr[0] === "object") {
          roleRubricFirstKeys = Object.keys(rr[0]).slice(0, 12);
          try {
            roleRubricFirstStr = JSON.stringify(rr[0]);
          } catch (_) {}
        } else if (rr && typeof rr === "object") {
          try {
            roleRubricFirstStr = JSON.stringify(rr);
          } catch (_) {}
        } else {
          roleRubricFirstStr = String(rr);
        }
      }
    } catch (e) {
      roleErr = String(e?.message || e);
    }
    return c.json(200, {
      role_getString: cand.getString("role"),
      role_raw_type: typeof raw,
      role_raw_tag: Object.prototype.toString.call(raw),
      role_raw_keys: raw && typeof raw === "object" ? Object.keys(raw).slice(0, 12) : null,
      role_raw_str: String(raw),
      role_raw_isArray: Array.isArray(raw),
      role_found_via_dao: roleFound,
      role_find_error: roleErr,
      role_rubric_type: roleRubricType,
      role_rubric_tag: roleRubricTag,
      role_rubric_isArray: roleRubricIsArray,
      role_rubric_first_keys: roleRubricFirstKeys,
      role_rubric_first_str: roleRubricFirstStr,
    });
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }
});
routerAdd("GET", "/api/score/summary/:candidateId", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, parseJsonValue, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent, getAuthRecord } = require(__hooks + "/_shared/kernel.js");
  function clampScore(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return null;
    if (x < 1) return 1;
    if (x > 5) return 5;
    return Math.round(x);
  }

  function normalizeRubric(rubric) {
    const list = Array.isArray(rubric) ? rubric : [];
    return list
      .map((r) => ({
        category: String(r?.category || "").trim(),
        weight: Number(r?.weight || 1),
      }))
      .filter((r) => r.category)
      .map((r) => ({ ...r, weight: Number.isFinite(r.weight) && r.weight > 0 ? r.weight : 1 }));
  }
  const user = getAuthRecord(c);
  const candidateId = String(c.pathParam("candidateId") || "").trim();
  if (!candidateId) return c.json(400, { error: "bad_request", message: "missing_candidate_id" });

  let candidate;
  try {
    candidate = $app.dao().findRecordById("candidates", candidateId);
  } catch (_) {
    return c.json( 404, { error: "not_found" });
  }

  const tenantId = candidate.getString("tenant");
  requireRole(user, tenantId, "member");

  let role = null;
  try {
    let roleId = "";
    try {
      roleId = String(candidate.getString("role") || "").trim();
    } catch (_) {}

    if (!roleId) {
      const rawRole = candidate.get("role");
      if (Array.isArray(rawRole)) {
        roleId = String(rawRole[0] || "").trim();
      } else if (typeof rawRole === "string") {
        const s = rawRole.trim();
        if (s.startsWith("[")) {
          const parsed = parseJsonValue(s, []);
          if (Array.isArray(parsed) && parsed[0]) roleId = String(parsed[0]).trim();
        } else {
          roleId = s;
        }
      }
    }

    if (roleId) role = $app.dao().findRecordById("roles", roleId);
  } catch (_) {
    // optional
  }

  const rubric = normalizeRubric(role ? parseJsonValue(role.get("rubric"), []) : []);
  const categories = rubric.map((r) => r.category);
  const sums = Object.fromEntries(categories.map((c2) => [c2, 0]));
  const counts = Object.fromEntries(categories.map((c2) => [c2, 0]));
  const decisionCounts = { strong_hire: 0, hire: 0, no_hire: 0 };

  const cards = $app
    .dao()
    .findRecordsByFilter("scorecards", "candidate = {:cid}", "-created", 200, 0, { cid: candidateId });

  for (const sc of cards || []) {
    const decision = String(sc.getString("decision") || "").trim();
    if (decisionCounts[decision] != null) decisionCounts[decision] += 1;
    const scores = parseJsonValue(sc.get("scores"), {});
    for (const cat of categories) {
      const v = clampScore(scores?.[cat]);
      if (v == null) continue;
      sums[cat] += v;
      counts[cat] += 1;
    }
  }

  const averages = {};
  for (const cat of categories) {
    averages[cat] = counts[cat] ? sums[cat] / counts[cat] : 0;
  }

  let wSum = 0;
  let wTotal = 0;
  for (const r of rubric) {
    wSum += (averages[r.category] || 0) * r.weight;
    wTotal += r.weight;
  }

  return c.json( 200, {
    candidate: { id: candidate.id, name: candidate.getString("name") },
    rubric,
    averages,
    overall: wTotal ? wSum / wTotal : 0,
    decisionCounts,
  });
});

onRecordBeforeCreateRequest("roles", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, parseJsonValue, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeRubric(rubric) {
    const list = Array.isArray(rubric) ? rubric : [];
    return list
      .map((r) => ({
        category: String(r?.category || "").trim(),
        weight: Number(r?.weight || 1),
      }))
      .filter((r) => r.category)
      .map((r) => ({ ...r, weight: Number.isFinite(r.weight) && r.weight > 0 ? r.weight : 1 }));
  }
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  e.record.set("title", clampText(e.record.getString("title"), 120));
  e.record.set("rubric", normalizeRubric(parseJsonValue(e.record.get("rubric"), [])));
});

onRecordBeforeUpdateRequest("roles", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, parseJsonValue, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function normalizeRubric(rubric) {
    const list = Array.isArray(rubric) ? rubric : [];
    return list
      .map((r) => ({
        category: String(r?.category || "").trim(),
        weight: Number(r?.weight || 1),
      }))
      .filter((r) => r.category)
      .map((r) => ({ ...r, weight: Number.isFinite(r.weight) && r.weight > 0 ? r.weight : 1 }));
  }
  e.record.set("title", clampText(e.record.getString("title"), 120));
  e.record.set("rubric", normalizeRubric(parseJsonValue(e.record.get("rubric"), [])));
});

onRecordBeforeCreateRequest("candidates", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "member");
  e.record.set("name", clampText(e.record.getString("name"), 120));
});

onRecordBeforeUpdateRequest("candidates", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("name", clampText(e.record.getString("name"), 120));
});

onRecordBeforeCreateRequest("scorecards", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, parseJsonValue, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function clampScore(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return null;
    if (x < 1) return 1;
    if (x > 5) return 5;
    return Math.round(x);
  }
  const user = e.httpContext?.auth?.record || null;
  const candidateId = e.record.getString("candidate");
  if (!candidateId) throw new BadRequestError("missing_candidate");
  const candidate = $app.dao().findRecordById("candidates", candidateId);
  const tenantId = candidate.getString("tenant");
  if (user) requireRole(user, tenantId, "member");
  if (user) e.record.set("interviewer", user.id);

  const decision = String(e.record.getString("decision") || "").trim();
  if (!["strong_hire", "hire", "no_hire"].includes(decision)) e.record.set("decision", "hire");

  const scores = parseJsonValue(e.record.get("scores"), {});
  const next = {};
  for (const [k, v] of Object.entries(scores || {})) {
    const kk = clampText(k, 64);
    const vv = clampScore(v);
    if (!kk || vv == null) continue;
    next[kk] = vv;
  }
  e.record.set("scores", next);
  e.record.set("notes", clampText(e.record.getString("notes"), 4000));
});

onRecordBeforeUpdateRequest("scorecards", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, parseJsonValue, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function clampScore(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return null;
    if (x < 1) return 1;
    if (x > 5) return 5;
    return Math.round(x);
  }
  const scores = parseJsonValue(e.record.get("scores"), {});
  const next = {};
  for (const [k, v] of Object.entries(scores || {})) {
    const kk = clampText(k, 64);
    const vv = clampScore(v);
    if (!kk || vv == null) continue;
    next[kk] = vv;
  }
  e.record.set("scores", next);
  e.record.set("notes", clampText(e.record.getString("notes"), 4000));
});
