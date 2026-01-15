// Approve.100SaaS (Tool 21) — PocketBase hooks
// Subdomain: approve.100saas.com
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Shared Kernel: self-serve onboarding + billing + Stripe connect
// - Tool 21: Generate share_token for projects and clamp annotation coordinates

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

function randToken(prefix) {
  const raw = $security.randomString(32);
  return `${prefix}_${raw}`;
}

function clamp01to100(value) {
  const n = Number(value);
  if (!isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n * 1000) / 1000;
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
  return k.handleBillingStatus(c, { toolSlug: "approve" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "approve" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "approve" });
});
routerAdd("GET", "/api/stripe/connect/start", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectStart(c, { toolSlug: "approve" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "approve" });
});
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "projects", "proofs", "annotations"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "approve", toolNumber: 21, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "approve", toolNumber: 21 });
});

// Tool 21: demo seed (owner-only; creates a share project + empty proof)
routerAdd("POST", "/api/approve/demo/seed", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const user = k.getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  const now = Date.now();
  if (!k.allowRequest(`approve_demo_seed:user:${user.id}`, now, 10, 10 * 60 * 1000)) return c.json(403, { error: "forbidden", message: "rate_limited" });

  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const tenantId = String(parsed.value?.tenant || "").trim();
  if (!tenantId) return c.json(400, { error: "bad_request", message: "missing_tenant" });
  k.requireRole(user, tenantId, "owner");

  const projectsCol = $app.dao().findCollectionByNameOrId("projects");
  const proofsCol = $app.dao().findCollectionByNameOrId("proofs");
  const annCol = $app.dao().findCollectionByNameOrId("annotations");

  const project = new Record(projectsCol);
  project.set("tenant", tenantId);
  project.set("name", "Demo Project");
  project.set("share_token", k.randToken("share"));
  $app.dao().saveRecord(project);

  const proof = new Record(proofsCol);
  proof.set("project", project.id);
  proof.set("name", "Homepage v1");
  $app.dao().saveRecord(proof);

  const ann = new Record(annCol);
  ann.set("proof", proof.id);
  ann.set("x_percent", 35);
  ann.set("y_percent", 20);
  ann.set("comment", "Add more whitespace here.");
  ann.set("status", "open");
  $app.dao().saveRecord(ann);

  return c.json(200, { ok: true, share_token: project.getString("share_token"), projectId: project.id, proofId: proof.id });
});

function requireProjectForShareToken(token) {
  return $app.dao().findFirstRecordByFilter("projects", "share_token = {:t}", { t: String(token || "") });
}

function requireProofForProject(proofId, projectId) {
  const proof = $app.dao().findRecordById("proofs", proofId);
  if (proof.getString("project") !== String(projectId || "")) throw new NotFoundError("proof_not_found");
  return proof;
}

// Public: project + proofs for a share token
routerAdd("GET", "/api/approve/public/project", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const token = String(c.queryParam("token") || "").trim();
  if (!token) return c.json(400, { error: "bad_request", message: "missing_token" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`approve_public_project:ip:${ip}:token:${token}`, now, 240, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let project = null;
  try {
    project = requireProjectForShareToken(token);
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }

  let proofs = [];
  try {
    proofs = $app.dao().findRecordsByFilter("proofs", "project = {:pid}", "-created", 100, 0, { pid: project.id });
  } catch (_) {
    proofs = [];
  }

  return c.json(200, {
    ok: true,
    project: { id: project.id, name: project.getString("name"), share_token: project.getString("share_token") },
    proofs: proofs.map((p) => ({
      id: p.id,
      name: p.getString("name"),
      image: p.get("image") || "",
    })),
  });
});

// Public: list annotations for a proof under a share token
routerAdd("GET", "/api/approve/public/annotations", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const token = String(c.queryParam("token") || "").trim();
  const proofId = String(c.queryParam("proof") || "").trim();
  if (!token) return c.json(400, { error: "bad_request", message: "missing_token" });
  if (!proofId) return c.json(400, { error: "bad_request", message: "missing_proof" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`approve_public_annotations:ip:${ip}:proof:${proofId}`, now, 240, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let project = null;
  try {
    project = requireProjectForShareToken(token);
    requireProofForProject(proofId, project.id);
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }

  let items = [];
  try {
    items = $app.dao().findRecordsByFilter("annotations", "proof = {:pid}", "created", 500, 0, { pid: proofId });
  } catch (_) {
    items = [];
  }

  return c.json(200, {
    ok: true,
    annotations: items.map((a) => ({
      id: a.id,
      proof: a.getString("proof"),
      x_percent: a.getFloat("x_percent"),
      y_percent: a.getFloat("y_percent"),
      comment: a.getString("comment"),
      status: a.getString("status"),
      created: a.getString("created"),
    })),
  });
});

// Public: create annotation under a share token
routerAdd("POST", "/api/approve/public/annotate", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const parsed = k.parseJsonBody(c);
  if (!parsed.ok) return c.json(400, { error: "bad_request", message: "invalid_json" });
  const body = parsed.value || {};

  const token = String(body.token || "").trim();
  const proofId = String(body.proof || "").trim();
  if (!token) return c.json(400, { error: "bad_request", message: "missing_token" });
  if (!proofId) return c.json(400, { error: "bad_request", message: "missing_proof" });

  const ip = k.bestEffortClientIp(c?.request?.());
  if (ip) {
    const now = Date.now();
    if (!k.allowRequest(`approve_public_annotate:ip:${ip}:proof:${proofId}`, now, 30, 10 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  }

  let project = null;
  try {
    project = requireProjectForShareToken(token);
    requireProofForProject(proofId, project.id);
  } catch (_) {
    return c.json(404, { error: "not_found" });
  }

  const comment = k.clampText(String(body.comment || "").trim(), 2000);
  if (!comment) return c.json(400, { error: "bad_request", message: "missing_comment" });

  const annCol = $app.dao().findCollectionByNameOrId("annotations");
  const ann = new Record(annCol);
  ann.set("proof", proofId);
  ann.set("x_percent", k.clamp01to100(body.x_percent));
  ann.set("y_percent", k.clamp01to100(body.y_percent));
  ann.set("comment", comment);
  ann.set("status", "open");
  $app.dao().saveRecord(ann);

  return c.json(200, { ok: true, id: ann.id });
});

onRecordBeforeCreateRequest("projects", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  const tenantId = e.record.getString("tenant");
  if (user && tenantId) requireRole(user, tenantId, "admin");
  if (!e.record.getString("share_token")) e.record.set("share_token", randToken("share"));
});

onRecordBeforeCreateRequest("annotations", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  const user = e.httpContext?.auth?.record || null;
  if (user) {
    const proofId = e.record.getString("proof");
    if (proofId) {
      const proof = $app.dao().findRecordById("proofs", proofId);
      const project = $app.dao().findRecordById("projects", proof.getString("project"));
      requireRole(user, project.getString("tenant"), "member");
    }
  }
  e.record.set("x_percent", clamp01to100(e.record.getFloat("x_percent")));
  e.record.set("y_percent", clamp01to100(e.record.getFloat("y_percent")));
  const comment = String(e.record.getString("comment") || "");
  if (comment.length > 2000) e.record.set("comment", comment.slice(0, 2000));
  const status = String(e.record.getString("status") || "open");
  e.record.set("status", status === "resolved" ? "resolved" : "open");
});

onRecordBeforeUpdateRequest("annotations", (e) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  e.record.set("x_percent", clamp01to100(e.record.getFloat("x_percent")));
  e.record.set("y_percent", clamp01to100(e.record.getFloat("y_percent")));
  const comment = String(e.record.getString("comment") || "");
  if (comment.length > 2000) e.record.set("comment", comment.slice(0, 2000));
  const status = String(e.record.getString("status") || "open");
  e.record.set("status", status === "resolved" ? "resolved" : "open");
});
