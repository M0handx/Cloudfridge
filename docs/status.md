# CloudFridge: Status

Where the project stands right now. The design and plan live in [project_guide.md](project_guide.md); this file records what has actually been done, what exists in AWS, and what's still open. Update it at the end of every work session.

**Last updated:** 10 November 2026

## Current state

| Phase | Status | Result / Walkthrough |
| --- | --- | --- |
| 1. Application | **Done** (2 Nov 2026) | Full app runs locally, all tests pass · [Phase 1 Walkthrough](phase-1-application.md) |
| 2. Foundation | **Done** (10 Nov 2026) | VPC, security groups, roles, bucket, private RDS, secrets · [Phase 2 Walkthrough](phase-2-foundation.md) |
| 3. Deployment and scaling | **Done** (10 Nov 2026) | App ran through the load balancer, 2 backend servers in 2 zones, self-healing and instance refresh tested (`cloudfridge-dashboard` deferred to Phase 6) · [Phase 3 Walkthrough](phase-3-deployment.md) |
| 4. Daily alerts | **Next**, not started | |
| 5. Optional photos | Not started | |
| 6. Testing and delivery | Not started | |

**Next step:** Start **Phase 4 (Daily alerts)**: verify the SES sender and demo recipient addresses, create the `email-smtp` VPC endpoint + SMTP credentials, and deploy `lambda/send-alerts/` + EventBridge Scheduler. Create `cloudfridge-dashboard` in Phase 6 when `cloudfridge-alb` is recreated for load testing. Screenshots 2 to 9 are taken; `p1-tests.png` (screenshot 1) is still open.

**Deliverables:** a report and a presentation, proven with 14 screenshots in [evidence/](evidence/), listed in the [screenshot list](project_guide.md#screenshot-list). See the [roadmap](project_guide.md#roadmap).

---

## AWS account

Checked on 2 November 2026.

| Check | Answer | Effect on the plan |
| --- | --- | --- |
| Region | `eu-west-1` (Ireland) only | All resources go in `eu-west-1` |
| IAM roles and users | Both allowed | We create our own roles, and SES SMTP credentials work |
| SES | Console works, SMTP credentials created successfully | Use the SES email path, not SNS |
| VPC endpoints | Allowed | The `email-smtp` endpoint is possible |
| Session Manager | Console page opens | Confirmed: connects to the servers (Phase 3) |
| Lab shutdowns | None | The 08:00 alert schedule runs normally |
| Billing | Free Plan, about $140 of credits, expiring around May 2027 | Enough, with strict cost control |

### Decisions from the check

- **Region:** `eu-west-1`.
- **IAM:** our own roles, not a provided lab role.
- **Email:** SES with **email address** identities. The SES page that asks for a domain is the other identity type, and we don't need a domain.
- **Instances:** `t3.micro` for EC2. RDS was created as `db.t4g.micro`, PostgreSQL 17.11, the free-tier choice the console offered.

### Cost rules for the credits

- Between sessions, set both ASGs to 0 and stop RDS.
- During long breaks, delete the load balancer and the email VPC endpoint, because they charge by the hour even when idle.
- Note spending at the end of each session in the log below, for the report.

---

## AWS resources

Each phase walkthrough keeps the full table of its resources and IDs. This is the summary of what exists, and the state it was left in. Every resource uses the `cloudfridge-` prefix and the tag `Project=cloudfridge`.

| Phase | Resources | Full list | Left in state |
| --- | --- | --- | --- |
| 2 | VPC, internet gateway, 4 subnets, 2 route tables, 6 security groups, 3 IAM roles, releases bucket, DB subnet group, RDS `cloudfridge-db`, 3 SecureString parameters | [phase-2-foundation.md](phase-2-foundation.md#2-resource-table) | RDS **stopped** (AWS restarts it automatically after 7 days, around 17 Nov 2026). Everything else is free and left as is. |
| 3 | 2 release zips in S3, 2 launch templates, 2 target groups, 2 ASGs, CPU scaling policy. Load balancer deleted. | [phase-3-deployment.md](phase-3-deployment.md#2-resource-table) | Both ASGs at **0**, no instances running. Load balancer **deleted** (recreate next session). Elastic IPs: 0 (2 stray ones released on 10 Nov). |

---

## Phase 1 verification

Re-checked on 2 November 2026 against the guide's **Done when** criteria.

| Check | Result |
| --- | --- |
| Backend API tests (`backend/npm test`) | 19 of 19 pass, against PostgreSQL 16 in Docker |
| Frontend urgency tests (`frontend/npm test`) | 7 of 7 pass |
| Frontend production build | Builds to `dist/` with no errors |
| Register, add item, mark used, statistics change | Pass, by API test and a manual run against the dev server |
| Correct urgency colors | Pass, by unit tests on every boundary, plus month, year, leap day and daylight saving cases |
| A second user can't see the first user's items | Pass: 404 on read, edit and delete, and statistics are separate |
| Invalid input rejected | Pass: empty name, impossible dates, bad category, bad status, malformed JSON |
| Schema includes `has_photo` and `alert_sent_at` | Yes, so later phases need no migration |

### Built in Phase 1

- `backend/`: Express API with auth, items and statistics, the migration, and `scripts/bootstrap-db.js`.
- `frontend/`: React app with login, register, dashboard, add, edit and statistics pages.
- Empty folders for later phases: `lambda/send-alerts/`, `infra/user-data/`, `scripts/`, `load-test/`, `backend/deploy/`.

### Deliberately left for later

| Item | Phase |
| --- | --- |
| Photo endpoints, `PhotoField`, `services/s3.js` | 5 |
| `backend/deploy/`: systemd service file and RDS CA bundle (`rds-ca-bundle.pem`) | 3 ✅ |
| Running `bootstrap-db.js` (needs the CA bundle and RDS) | 3 ✅ |

---

## Open items

| Item | When |
| --- | --- |
| Recreate `cloudfridge-alb` (and its `/api/*` rule) and create `cloudfridge-dashboard` for load-test metrics | Phase 6 (before `k6` run) |
| Record the 10 Nov spend from **Billing** in the session log below | Next login |
| Screenshot both test suites passing, as `p1-tests.png` (start Docker for the backend database first) | Any time |
| Check the budget (`My Monthly Cost Budget`, \$40) has **Credits** unticked in its advanced options | Next session |
| Activate the `Project` cost allocation tag. Still not listed on 10 Nov afternoon (only `aws:createdBy` and `Name`); AWS needs up to a day. Use **Backfill tags** after activating. | Next session |
| The live frontend release has the test title "CloudFridge V2", kept on purpose. `frontend/index.html` matches it. | Optional |
| Copy the remaining reference IDs (route tables, frontend and email endpoint security groups) into the Phase 2 table | Any time |
| Verify the SES sender and demo recipient addresses | Phase 4 |

---

## Session log

Newest first. One line per session: what was done, and roughly what it cost.

| Date | Work | AWS spend |
| --- | --- | --- |
| 10 Nov 2026 | **Phase 3 done.** Built and uploaded both releases, 2 launch templates, 2 target groups, the load balancer and 2 ASGs. Fixed an endpoint typo in the Parameter Store URLs, created `cloudfridge_app` and ran the migration. App worked through the load balancer, direct server access timed out. Scaled the backend to 2 (zones a and b) with the 50% CPU policy, tested self-healing (replacement started in about 1 second) and instance refreshes on both groups. 4 screenshots plus 2 extras. Ended with ASGs at 0, RDS stopped, load balancer deleted and 2 stray Elastic IPs released. `cloudfridge-dashboard` deferred to Phase 6. | Check Billing (estimate: under \$1, about 1.5 hours of 2 to 3 servers, the load balancer and RDS) |
| 10 Nov 2026 | **Phase 2 done.** Built the network, 6 security groups, 3 roles, releases bucket, private RDS and 3 parameters. Proved the database is private (resolves to `10.0.11.187`, port 5432 times out). 4 screenshots saved. RDS stopped. | Under \$1 (estimate: RDS ran for a few hours; check Billing) |
| 10 Nov 2026 | Docs reworked around the report and presentation: roadmap, evidence plan, Phase 2 walkthrough with screenshot points. | $0 |
| 2 Nov 2026 | Account check. Phase 1 built, tested and committed. | $0 |
