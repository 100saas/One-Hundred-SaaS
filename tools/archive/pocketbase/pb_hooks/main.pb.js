// Generated scaffold for Archive.100SaaS (Compliance) (Tool 2)
// Subdomain: archive.100saas.com
//
// Source of truth: NEW_PRD/00_SHARED_KERNEL.md + NEW_PRD/01_50_BATCH.md
//
// Implements:
// - Shared Kernel: RevenueCat entitlement sync webhook
// - Tool 2: Manual trigger endpoint + cron stub to process jobs
//
// Note: Uploading to S3/R2 requires request signing; this file currently logs what it would do and stores results in `logs`.

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

function forbidden(c, message) {
  return c.json( 403, { error: "forbidden", message });
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

function createLog(jobId, invoiceId, status, message, meta) {
  const logsCollection = $app.dao().findCollectionByNameOrId("logs");
  const record = new Record(logsCollection);
  record.set("job", jobId);
  record.set("invoice_id", invoiceId || "");
  record.set("status", status);
  record.set("message", message || "");
  record.set("meta", meta || {});
  $app.dao().saveRecord(record);
  return record;
}

function stripeListInvoicesSince(stripeSecretKey, createdGteSeconds, limit) {
  const params = [`created[gte]=${encodeURIComponent(String(createdGteSeconds))}`, `limit=${limit || 100}`];
  const url = `https://api.stripe.com/v1/invoices?${params.join("&")}`;
  const res = $http.send({
    url,
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
  });
  return res?.json?.();
}

function processJob(job, mode) {
  const stripeSecretKey = getEnv("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) {
    createLog(job.id, "", "error", "STRIPE_SECRET_KEY not configured", { mode });
    return { ok: false, error: "stripe_not_configured" };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const createdGteSeconds =
    mode === "backfill_2y" ? nowSeconds - 2 * 365 * 24 * 60 * 60 : nowSeconds - 24 * 60 * 60;

  try {
    const invoices = stripeListInvoicesSince(stripeSecretKey, createdGteSeconds, 100);
    const data = Array.isArray(invoices?.data) ? invoices.data : [];

    for (const inv of data) {
      const invoiceId = inv?.id ? String(inv.id) : "";
      createLog(job.id, invoiceId, "success", "fetched_invoice_stub", {
        provider: job.getString("provider"),
        bucket: job.getString("bucket"),
        path_template: job.getString("path_template"),
        invoice_pdf: inv?.invoice_pdf || null,
        customer_name: inv?.customer_name || null,
        customer_email: inv?.customer_email || null,
      });
    }

    return { ok: true, invoices: data.length };
  } catch (e) {
    $app.logger().error("Archive job failed", e);
    createLog(job.id, "", "error", "stripe_fetch_failed", { mode });
    return { ok: false, error: "stripe_fetch_failed" };
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
  return k.handleStripeConnectStart(c, { toolSlug: "archive" });
});
routerAdd("GET", "/api/stripe/connect/callback", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeConnectCallback(c, { toolSlug: "archive" });
});
// Team invites (no email required): create/list/accept invite tokens
routerAdd("POST", "/api/invites/create", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleInviteCreate(c, { toolSlug: "archive" });
});
routerAdd("GET", "/api/invites/list", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleInviteList(c, { toolSlug: "archive" });
});
routerAdd("POST", "/api/invites/accept", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleInviteAccept(c, { toolSlug: "archive" });
});
routerAdd("POST", "/api/onboarding/bootstrap", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleOnboardingBootstrap(c);
});
// Stripe billing (checkout + portal + webhook to update tenant entitlements)
routerAdd("GET", "/api/billing/status", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingStatus(c, { toolSlug: "archive" });
});
routerAdd("POST", "/api/billing/checkout", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingCheckout(c, { toolSlug: "archive" });
});
routerAdd("POST", "/api/billing/portal", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleBillingPortal(c);
});
routerAdd("POST", "/api/webhooks/stripe/billing", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  return k.handleStripeBillingWebhook(c, { toolSlug: "archive" });
});
// Tool entrypoint stub (health)
routerAdd("GET", "/api/tool/health", (c) => {
  const k = require(__hooks + "/_shared/kernel.js");
  const required = ["tenants", "memberships", "stripe_connections", "audit_logs", "invites", "jobs", "logs"];
  const missing = k.listMissingCollections(required);
  if (missing.length) {
    return c.json(500, { ok: false, tool: "archive", toolNumber: 2, missingCollections: missing });
  }
  return c.json(200, { ok: true, tool: "archive", toolNumber: 2 });
});
// Manual trigger: POST /api/jobs/:id/run
routerAdd("POST", "/api/jobs/:id/run", (c) => {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent, getAuthRecord } = require(__hooks + "/_shared/kernel.js");
  function createLog(jobId, invoiceId, status, message, meta) {
    const logsCollection = $app.dao().findCollectionByNameOrId("logs");
    const record = new Record(logsCollection);
    record.set("job", jobId);
    record.set("invoice_id", invoiceId || "");
    record.set("status", status);
    record.set("message", message || "");
    record.set("meta", meta || {});
    $app.dao().saveRecord(record);
    return record;
  }

  function stripeListInvoicesSince(stripeSecretKey, createdGteSeconds, limit) {
    const params = [
      `created[gte]=${encodeURIComponent(String(createdGteSeconds))}`,
      `limit=${limit || 100}`,
    ];
    const url = `https://api.stripe.com/v1/invoices?${params.join("&")}`;
    const res = $http.send({
      url,
      headers: { Authorization: `Bearer ${stripeSecretKey}` },
    });
    return res?.json?.();
  }

  function processJob(job, mode) {
    const stripeSecretKey = getEnv("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      createLog(job.id, "", "error", "STRIPE_SECRET_KEY not configured", { mode });
      return { ok: false, error: "stripe_not_configured" };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const createdGteSeconds =
      mode === "backfill_2y" ? nowSeconds - 2 * 365 * 24 * 60 * 60 : nowSeconds - 24 * 60 * 60;

    try {
      const invoices = stripeListInvoicesSince(stripeSecretKey, createdGteSeconds, 100);
      const data = Array.isArray(invoices?.data) ? invoices.data : [];

      for (const inv of data) {
        const invoiceId = inv?.id ? String(inv.id) : "";
        createLog(job.id, invoiceId, "success", "fetched_invoice_stub", {
          provider: job.getString("provider"),
          bucket: job.getString("bucket"),
          path_template: job.getString("path_template"),
          invoice_pdf: inv?.invoice_pdf || null,
          customer_name: inv?.customer_name || null,
          customer_email: inv?.customer_email || null,
        });
      }

      return { ok: true, invoices: data.length };
    } catch (e) {
      $app.logger().error("Archive job failed", e);
      createLog(job.id, "", "error", "stripe_fetch_failed", { mode });
      return { ok: false, error: "stripe_fetch_failed" };
    }
  }

  const jobId = c?.pathParam?.("id") || null;
  if (!jobId) return c.json(400, { error: "bad_request", message: "missing_job_id" });

  const user = getAuthRecord(c);
  if (!user) return c.json(401, { error: "unauthorized", message: "not_authenticated" });

  let job;
  try {
    job = $app.dao().findRecordById("jobs", jobId);
  } catch (e) {
    return c.json(400, { error: "bad_request", message: "job_not_found" });
  }

  const tenantId = job.getString("tenant");
  if (!tenantId) return c.json(403, { error: "forbidden", message: "job_missing_tenant" });

  requireRole(user, tenantId, "admin");

  const result = processJob(job, "backfill_2y");
  return c.json( result.ok ? 200 : 503, result);
});

// Demo seed: creates a job + a couple logs for the active tenant (no Stripe required).
routerAdd("POST", "/api/archive/demo/seed", (c) => {
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
    if (!k.allowRequest(`demo:archive:${tenantId}`, now, 5, 60 * 60 * 1000)) {
      return c.json(403, { error: "forbidden", message: "rate_limited" });
    }
  } catch (_) {}

  const jobsCollection = $app.dao().findCollectionByNameOrId("jobs");
  const logsCollection = $app.dao().findCollectionByNameOrId("logs");

  const job = new Record(jobsCollection);
  job.set("tenant", tenantId);
  job.set("provider", "s3");
  job.set("bucket", "demo-bucket");
  job.set("path_template", "/{year}/{month}/{customer_name}/{id}.pdf");
  job.set("credentials", { demo: true });
  job.set("is_active", true);
  $app.dao().saveRecord(job);

  const log1 = new Record(logsCollection);
  log1.set("job", job.id);
  log1.set("invoice_id", "in_demo_001");
  log1.set("status", "success");
  log1.set("message", "fetched_invoice_stub");
  log1.set("meta", { demo: true });
  $app.dao().saveRecord(log1);

  const log2 = new Record(logsCollection);
  log2.set("job", job.id);
  log2.set("invoice_id", "in_demo_002");
  log2.set("status", "error");
  log2.set("message", "stripe_not_configured");
  log2.set("meta", { demo: true });
  $app.dao().saveRecord(log2);

  return c.json(200, { ok: true, jobId: job.id });
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

// Cron: daily 3 AM
cronAdd("archive_daily", "0 3 * * *", function () {
  const { json, safeString, badRequest, unauthorized, forbidden, internalError, getEnv, clampText, normalizeSlug, normalizeEmail, normalizeTags, getClientIp, bestEffortClientIp, randToken, randCode, validateUploadToken, clamp01to100, clampNum, requireRole, parseJsonBody, clampEnum, clampIntervalDays, normalizeKeyName, isOverdue, isExpired, setTenantSlug, setTenantSlugFromTenantId, allowRequest, toDateOnlyIso, msToIso, findTenantForStripeEvent } = require(__hooks + "/_shared/kernel.js");
  function createLog(jobId, invoiceId, status, message, meta) {
    const logsCollection = $app.dao().findCollectionByNameOrId("logs");
    const record = new Record(logsCollection);
    record.set("job", jobId);
    record.set("invoice_id", invoiceId || "");
    record.set("status", status);
    record.set("message", message || "");
    record.set("meta", meta || {});
    $app.dao().saveRecord(record);
    return record;
  }

  function stripeListInvoicesSince(stripeSecretKey, createdGteSeconds, limit) {
    const params = [
      `created[gte]=${encodeURIComponent(String(createdGteSeconds))}`,
      `limit=${limit || 100}`,
    ];
    const url = `https://api.stripe.com/v1/invoices?${params.join("&")}`;
    const res = $http.send({
      url,
      headers: { Authorization: `Bearer ${stripeSecretKey}` },
    });
    return res?.json?.();
  }

  function processJob(job, mode) {
    const stripeSecretKey = getEnv("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      createLog(job.id, "", "error", "STRIPE_SECRET_KEY not configured", { mode });
      return { ok: false, error: "stripe_not_configured" };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const createdGteSeconds =
      mode === "backfill_2y" ? nowSeconds - 2 * 365 * 24 * 60 * 60 : nowSeconds - 24 * 60 * 60;

    try {
      const invoices = stripeListInvoicesSince(stripeSecretKey, createdGteSeconds, 100);
      const data = Array.isArray(invoices?.data) ? invoices.data : [];

      for (const inv of data) {
        const invoiceId = inv?.id ? String(inv.id) : "";
        createLog(job.id, invoiceId, "success", "fetched_invoice_stub", {
          provider: job.getString("provider"),
          bucket: job.getString("bucket"),
          path_template: job.getString("path_template"),
          invoice_pdf: inv?.invoice_pdf || null,
          customer_name: inv?.customer_name || null,
          customer_email: inv?.customer_email || null,
        });
      }

      return { ok: true, invoices: data.length };
    } catch (e) {
      $app.logger().error("Archive job failed", e);
      createLog(job.id, "", "error", "stripe_fetch_failed", { mode });
      return { ok: false, error: "stripe_fetch_failed" };
    }
  }

  try {
    const jobs = $app.dao().findRecordsByFilter("jobs", "is_active = true", "-created", 200);
    for (const job of jobs) {
      processJob(job, "daily");
    }
  } catch (e) {
    $app.logger().error("Archive cron failed", e);
  }
});
