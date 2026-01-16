# Endpoints index

This file is auto-generated from `tools/*/pocketbase/pb_hooks/main.pb.js`.

Regenerate:

```bash
node scripts/generate_endpoints_index.mjs
```

## access

| Method | Path |
|---|---|
| `GET` | `/api/tool/health` |
| `POST` | `/api/access/cycle/:id/import_csv` |
| `POST` | `/api/access/cycle/:id/snapshot_internal` |
| `POST` | `/api/webhooks/revenuecat` |

## action

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/action/demo/seed` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## approve

| Method | Path |
|---|---|
| `GET` | `/api/approve/public/annotations` |
| `GET` | `/api/approve/public/project` |
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/approve/demo/seed` |
| `POST` | `/api/approve/public/annotate` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## archive

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/invites/list` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/archive/demo/seed` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/invites/accept` |
| `POST` | `/api/invites/create` |
| `POST` | `/api/jobs/:id/run` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## audit-links

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/audit-links/demo/seed` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## brief

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/brief/public/brief` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/brief/demo/seed` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## careers

| Method | Path |
|---|---|
| `GET` | `/api/careers/site/:slug` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/webhooks/revenuecat` |

## changes

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/changes/demo/seed` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## churn

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/churn/public/config` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/churn/demo/seed` |
| `POST` | `/api/churn/public/submit` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## collect

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/collect/public/request` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/collect/demo/seed` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## convert

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/convert/demo/seed` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## dunning

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/dunning/seed` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## env

| Method | Path |
|---|---|
| `GET` | `/api/tool/health` |
| `POST` | `/api/env/mark-rotated/:specId` |
| `POST` | `/api/webhooks/revenuecat` |

## fight

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/invites/list` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/fight/demo/seed` |
| `POST` | `/api/invites/accept` |
| `POST` | `/api/invites/create` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe` |
| `POST` | `/api/webhooks/stripe/billing` |

## handoff

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/handoff/public/package` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/handoff/demo/seed` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/track-download/:id` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## help

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/help/public/article` |
| `GET` | `/api/help/public/kb` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/help/demo/seed` |
| `POST` | `/api/kb/article/:id/view` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## hire

| Method | Path |
|---|---|
| `GET` | `/api/hire/jobs/:tenantSlug` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/webhooks/revenuecat` |

## index

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/index/demo/seed` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## log

| Method | Path |
|---|---|
| `GET` | `/api/tool/health` |
| `POST` | `/api/ingest` |
| `POST` | `/api/webhooks/revenuecat` |

## mrr

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/mrr/demo/seed` |
| `POST` | `/api/mrr/run_once` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## nps

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/nps/demo/seed` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## offer

| Method | Path |
|---|---|
| `GET` | `/api/tool/health` |
| `POST` | `/api/offer/send` |
| `POST` | `/api/offer/sign/:token` |
| `POST` | `/api/webhooks/revenuecat` |

## onboard

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/onboard/public/progress` |
| `GET` | `/api/onboard/public/template` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboard/demo/seed` |
| `POST` | `/api/onboard/public/progress` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## pay

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/pay/contractor/invoices` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/pay/contractors/create` |
| `POST` | `/api/pay/demo/seed` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## portal

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/portal/public/client` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/portal/demo/seed` |
| `POST` | `/api/portal/public/item/toggle` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## postmortem

| Method | Path |
|---|---|
| `GET` | `/api/postmortem/report/:id` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/webhooks/revenuecat` |

## press

| Method | Path |
|---|---|
| `GET` | `/api/press/kits/:slug` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/webhooks/revenuecat` |

## proposal

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/proposal/public/view` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/proposal/:id/view` |
| `POST` | `/api/proposal/demo/seed` |
| `POST` | `/api/proposal/public/accept` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## qa

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/qa/demo/seed` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## recover

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/invites/list` |
| `GET` | `/api/recover/rules` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/invites/accept` |
| `POST` | `/api/invites/create` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/recover/demo/seed` |
| `POST` | `/api/recover/rules` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe` |
| `POST` | `/api/webhooks/stripe/billing` |

## ref

| Method | Path |
|---|---|
| `GET` | `/api/tool/health` |
| `POST` | `/api/ref/request` |
| `POST` | `/api/ref/respond/:token` |
| `POST` | `/api/webhooks/revenuecat` |

## refunds

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/refunds/settings` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/refunds/demo/seed` |
| `POST` | `/api/refunds/settings` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe` |
| `POST` | `/api/webhooks/stripe/billing` |

## retainer

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/retainer/demo/seed` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## reviews

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/reviews/public/campaign` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/reviews/demo/seed` |
| `POST` | `/api/reviews/submit` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## route

| Method | Path |
|---|---|
| `GET` | `/api/tool/health` |
| `POST` | `/api/ingest/:apiKey` |
| `POST` | `/api/webhooks/revenuecat` |

## runbook

| Method | Path |
|---|---|
| `GET` | `/api/tool/health` |
| `POST` | `/api/run/:id/checklist` |
| `POST` | `/api/runbook/:id/start` |
| `POST` | `/api/webhooks/revenuecat` |

## score

| Method | Path |
|---|---|
| `GET` | `/api/_debug/score/candidate/:id` |
| `GET` | `/api/score/summary/:candidateId` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/webhooks/revenuecat` |

## signoff

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/signoff/public/deliverable` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/signoff/demo/seed` |
| `POST` | `/api/signoff/public/approve` |
| `POST` | `/api/signoff/public/request_changes` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## sop

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/sop/demo/seed` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## spy

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/spy/demo/seed` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## status

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/status/public/page` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/status/demo/seed` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## subaudit

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/subaudit/demo/seed` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe` |
| `POST` | `/api/webhooks/stripe/billing` |

## ticket

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/ticket/public/form` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/ticket/demo/seed` |
| `POST` | `/api/ticket/public/submit` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## timeline

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/timeline/stripe/customer/:id/summary` |
| `GET` | `/api/timeline/stripe/customers/search` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/timeline/demo/seed` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## tours

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `GET` | `/api/tours/public/tour` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/tours/demo/seed` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## update

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `GET` | `/api/update/public/feed` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/update/demo/seed` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## uptime

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/uptime/demo/seed` |
| `POST` | `/api/uptime/run_once` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## utm

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/utm/demo/seed` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## vat

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `GET` | `/api/vat/settings` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/validate` |
| `POST` | `/api/vat/demo/seed` |
| `POST` | `/api/vat/settings` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

## vote

| Method | Path |
|---|---|
| `GET` | `/api/billing/status` |
| `GET` | `/api/stripe/connect/callback` |
| `GET` | `/api/stripe/connect/start` |
| `GET` | `/api/tool/health` |
| `POST` | `/api/billing/checkout` |
| `POST` | `/api/billing/portal` |
| `POST` | `/api/onboarding/bootstrap` |
| `POST` | `/api/vote/demo/seed` |
| `POST` | `/api/vote/public/toggle` |
| `POST` | `/api/webhooks/revenuecat` |
| `POST` | `/api/webhooks/stripe/billing` |

