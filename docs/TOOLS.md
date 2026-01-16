# Tools

This is the index of tools in this monorepo. Each tool is a PocketBase-first backend (schema + hooks) that you can run locally and self-host.

Quickstart:

```bash
node scripts/pb/run.mjs <toolSlug>
```

See: `docs/SELF_HOST.md`.

## How do I pick a tool?

Pick something you actually want to run this week. A few easy starting points:
- Customer feedback: `vote`, `nps`, `churn`
- Support/docs: `help`, `ticket`
- Monitoring: `uptime`, `status`

| # | Tool | Slug | Folder | Run |
|---:|---|---|---|---|
| 2 | Archive.100SaaS (Compliance) | `archive` | [`tools/archive`](../tools/archive) | `node scripts/pb/run.mjs archive` |
| 3 | Fight.100SaaS (Dispute Manager) | `fight` | [`tools/fight`](../tools/fight) | `node scripts/pb/run.mjs fight` |
| 4 | Refunds.100SaaS (Anomaly Detection) | `refunds` | [`tools/refunds`](../tools/refunds) | `node scripts/pb/run.mjs refunds` |
| 5 | Timeline.100SaaS (Single Customer View) | `timeline` | [`tools/timeline`](../tools/timeline) | `node scripts/pb/run.mjs timeline` |
| 6 | VAT.100SaaS (Compliance) | `vat` | [`tools/vat`](../tools/vat) | `node scripts/pb/run.mjs vat` |
| 7 | SubAudit.100SaaS (Change Logger) | `subaudit` | [`tools/subaudit`](../tools/subaudit) | `node scripts/pb/run.mjs subaudit` |
| 8 | MRR.100SaaS (Reporting) | `mrr` | [`tools/mrr`](../tools/mrr) | `node scripts/pb/run.mjs mrr` |
| 9 | Dunning.100SaaS (Copy & Schedule) | `dunning` | [`tools/dunning`](../tools/dunning) | `node scripts/pb/run.mjs dunning` |
| 10 | Pay.100SaaS (Contractor Portal) | `pay` | [`tools/pay`](../tools/pay) | `node scripts/pb/run.mjs pay` |
| 11 | Vote.100SaaS (Feature Board) | `vote` | [`tools/vote`](../tools/vote) | `node scripts/pb/run.mjs vote` |
| 12 | Changes.100SaaS (Changelog) | `changes` | [`tools/changes`](../tools/changes) | `node scripts/pb/run.mjs changes` |
| 13 | NPS.100SaaS (Micro-Surveys) | `nps` | [`tools/nps`](../tools/nps) | `node scripts/pb/run.mjs nps` |
| 14 | Churn.100SaaS (Exit Survey Widget) | `churn` | [`tools/churn`](../tools/churn) | `node scripts/pb/run.mjs churn` |
| 15 | Onboard.100SaaS (Checklists) | `onboard` | [`tools/onboard`](../tools/onboard) | `node scripts/pb/run.mjs onboard` |
| 16 | Tours.100SaaS (Product Walkthroughs) | `tours` | [`tools/tours`](../tools/tours) | `node scripts/pb/run.mjs tours` |
| 17 | Status.100SaaS (Status Page) | `status` | [`tools/status`](../tools/status) | `node scripts/pb/run.mjs status` |
| 18 | Uptime.100SaaS (Website Monitor) | `uptime` | [`tools/uptime`](../tools/uptime) | `node scripts/pb/run.mjs uptime` |
| 19 | Ticket.100SaaS (Helpdesk) | `ticket` | [`tools/ticket`](../tools/ticket) | `node scripts/pb/run.mjs ticket` |
| 20 | Help.100SaaS (Knowledge Base) | `help` | [`tools/help`](../tools/help) | `node scripts/pb/run.mjs help` |
| 21 | Approve.100SaaS (Design Feedback) | `approve` | [`tools/approve`](../tools/approve) | `node scripts/pb/run.mjs approve` |
| 22 | Portal.100SaaS (Client Home) | `portal` | [`tools/portal`](../tools/portal) | `node scripts/pb/run.mjs portal` |
| 23 | SOP.100SaaS (Process Builder) | `sop` | [`tools/sop`](../tools/sop) | `node scripts/pb/run.mjs sop` |
| 24 | Signoff.100SaaS (Approvals) | `signoff` | [`tools/signoff`](../tools/signoff) | `node scripts/pb/run.mjs signoff` |
| 25 | Collect.100SaaS (Asset Request) | `collect` | [`tools/collect`](../tools/collect) | `node scripts/pb/run.mjs collect` |
| 26 | Update.100SaaS (Status Feed) | `update` | [`tools/update`](../tools/update) | `node scripts/pb/run.mjs update` |
| 27 | Proposal.100SaaS (Proposal Generator) | `proposal` | [`tools/proposal`](../tools/proposal) | `node scripts/pb/run.mjs proposal` |
| 28 | Action.100SaaS (Meeting Tasks) | `action` | [`tools/action`](../tools/action) | `node scripts/pb/run.mjs action` |
| 29 | Handoff.100SaaS (Client Handoff Portal) | `handoff` | [`tools/handoff`](../tools/handoff) | `node scripts/pb/run.mjs handoff` |
| 30 | Retainer.100SaaS (Time Tracking) | `retainer` | [`tools/retainer`](../tools/retainer) | `node scripts/pb/run.mjs retainer` |
| 31 | UTM.100SaaS (Link Builder) | `utm` | [`tools/utm`](../tools/utm) | `node scripts/pb/run.mjs utm` |
| 32 | QA.100SaaS (Launch Checklist) | `qa` | [`tools/qa`](../tools/qa) | `node scripts/pb/run.mjs qa` |
| 33 | Brief.100SaaS (Content Brief Builder) | `brief` | [`tools/brief`](../tools/brief) | `node scripts/pb/run.mjs brief` |
| 34 | Audit.100SaaS (Link Broken Checker) | `audit-links` | [`tools/audit-links`](../tools/audit-links) | `node scripts/pb/run.mjs audit-links` |
| 35 | Index.100SaaS (GSC Monitor) | `index` | [`tools/index`](../tools/index) | `node scripts/pb/run.mjs index` |
| 36 | Reviews.100SaaS (Review Funnel) | `reviews` | [`tools/reviews`](../tools/reviews) | `node scripts/pb/run.mjs reviews` |
| 37 | Convert.100SaaS (Popup Builder) | `convert` | [`tools/convert`](../tools/convert) | `node scripts/pb/run.mjs convert` |
| 38 | Spy.100SaaS (Competitor Diff) | `spy` | [`tools/spy`](../tools/spy) | `node scripts/pb/run.mjs spy` |
| 39 | Press.100SaaS (Media Kit) | `press` | [`tools/press`](../tools/press) | `node scripts/pb/run.mjs press` |
| 40 | Route.100SaaS (Lead Router) | `route` | [`tools/route`](../tools/route) | `node scripts/pb/run.mjs route` |
| 41 | Score.100SaaS (Interview Rubric) | `score` | [`tools/score`](../tools/score) | `node scripts/pb/run.mjs score` |
| 42 | Hire.100SaaS (Mini ATS) | `hire` | [`tools/hire`](../tools/hire) | `node scripts/pb/run.mjs hire` |
| 43 | Ref.100SaaS (Reference Checks) | `ref` | [`tools/ref`](../tools/ref) | `node scripts/pb/run.mjs ref` |
| 44 | Careers.100SaaS (Job Board) | `careers` | [`tools/careers`](../tools/careers) | `node scripts/pb/run.mjs careers` |
| 45 | Offer.100SaaS (Offer Letters) | `offer` | [`tools/offer`](../tools/offer) | `node scripts/pb/run.mjs offer` |
| 46 | Log.100SaaS (Audit Trail) | `log` | [`tools/log`](../tools/log) | `node scripts/pb/run.mjs log` |
| 47 | Env.100SaaS (Secrets Hygiene) | `env` | [`tools/env`](../tools/env) | `node scripts/pb/run.mjs env` |
| 48 | Runbook.100SaaS (Interactive Ops) | `runbook` | [`tools/runbook`](../tools/runbook) | `node scripts/pb/run.mjs runbook` |
| 49 | Postmortem.100SaaS (Incident Retro) | `postmortem` | [`tools/postmortem`](../tools/postmortem) | `node scripts/pb/run.mjs postmortem` |
| 50 | Access.100SaaS (User Access Reviews) | `access` | [`tools/access`](../tools/access) | `node scripts/pb/run.mjs access` |
|  | Recover | `recover` | [`tools/recover`](../tools/recover) | `node scripts/pb/run.mjs recover` |

Related:

- Endpoints index: `docs/ENDPOINTS.md`
- How to contribute: `docs/GETTING_STARTED.md`
- How we decide what ships: `docs/GOVERNANCE.md`
