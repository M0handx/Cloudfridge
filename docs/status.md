# CloudFridge: Status

Where the project stands right now. The design and plan live in [project_guide.md](project_guide.md); this file records what has actually been done, what exists in AWS, and what's still open. Update it at the end of every work session.

**Last updated:** 12 November 2026

## Current state

| Phase | Status | Result / Walkthrough |
| --- | --- | --- |
| 1. Application | **Done** (2 Nov 2026) | Full app runs locally, all tests pass (`p1-tests.png`) · [Phase 1 Walkthrough](phase-1-application.md) |
| 2. Foundation | **Done** (10 Nov 2026) | VPC, security groups, roles, bucket, private RDS, secrets · [Phase 2 Walkthrough](phase-2-foundation.md) |
| 3. Deployment and scaling | **Done** (10 Nov 2026) | App ran through ALB, 2 backend servers in 2 AZs, self-healing tested · [Phase 3 Walkthrough](phase-3-deployment.md) |
| 4. Daily alerts | **Done** (11 Nov 2026) | `cloudfridge-send-alerts` Lambda in VPC, SES alerts deduplicated, daily rule attached · [Phase 4 Walkthrough](phase-4-alerts.md) |
| 5. Optional photos | Skipped | Not needed for core requirements · S3 storage already proven via releases |
| 6. Testing and delivery | **Done** (12 Nov 2026) | CloudWatch dashboard created, load test run (CPU 99.89%), ASG scaled 2 → 4 instances, all 14 screenshots secured · [Phase 6 Walkthrough](phase-6-delivery.md) |

**Next step:** All implementation and AWS testing are complete. Write the final report (~10 pages) and presentation slides (~12 slides) using the 14 screenshots in [evidence/](evidence/). All paid AWS resources can remain terminated/deleted.

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
| 2 | VPC, internet gateway, 4 subnets, 2 route tables, 6 security groups, 3 IAM roles, releases bucket, DB subnet group, 3 SecureString parameters | [phase-2-foundation.md](phase-2-foundation.md#2-resource-table) | RDS `cloudfridge-db` **deleted** on 12 Nov 2026 (no final snapshot). Network, roles, parameters and bucket are free (bucket costs fractions of a cent) and left as is. |
| 3 | 2 release zips in S3, 2 launch templates, 2 target groups, 2 ASGs, CPU scaling policy | [phase-3-deployment.md](phase-3-deployment.md#2-resource-table) | Both ASGs at **0**, no instances. `cloudfridge-alb` **deleted** again on 12 Nov. |
| 4 | `cloudfridge-send-alerts` Lambda, `Cloudfridge-daily-alerts` EventBridge rule, SES verified email, IAM SMTP user | [phase-4-alerts.md](phase-4-alerts.md#2-resource-table) | Email VPC endpoint **deleted**. Lambda kept (free when idle). With RDS gone, disable or delete the daily rule so the function stops failing every morning. |
| 6 | `cloudfridge-dashboard` (CloudWatch) | [phase-6-delivery.md](phase-6-delivery.md#2-resource-table) | Kept (the first 3 dashboards are free). |

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
| Confirm the project requirements: the guide assumes "at least 5 of the 9 components", and Docker and an orchestrator weren't built. If all 9 are mandatory, these two are missing. | Before writing the report |
| Check **SES → Mail Manager → Ingress endpoints** and **Secrets Manager** for anything left by the first (Mail Manager) SMTP credentials, and delete it | Now |
| Disable or delete the `Cloudfridge-daily-alerts` rule (RDS is gone, so each run fails) | Now |
| Delete the 2 IAM SMTP users (`ses-smtp-user.*`) once grading is done; their keys are still active | After grading |
| Retake `p6-cost.png` from **Bills** or **Credits**: the current Cost Explorer view shows $0.00 with an empty graph | Tomorrow (costs need about a day to appear) |
| `p1-tests.png` shows only the 7 frontend tests. Either add the 19 backend tests (start Docker, run `backend/npm test`) or describe them in the report's text | Before the report |
| Record the real spend from **Billing** in the session log (10, 11 and 12 Nov) | Tomorrow |
| Check the budget (`My Monthly Cost Budget`, \$40) has **Credits** unticked in its advanced options | Next session |
| The `Project` cost allocation tag: check whether it's active now, so `p6-cost.png` can filter by it | Tomorrow |
| The deployed frontend had the test title "CloudFridge V2"; `frontend/index.html` matches it. Mention it in the report or change it back. | Optional |
| Copy the remaining reference IDs (route tables, frontend security group) into the Phase 2 table | Optional |

---

## Session log

Newest first. One line per session: what was done, and roughly what it cost.

| Date | Work | AWS spend |
| --- | --- | --- |
| 12 Nov 2026 | **Phase 6 done.** Recreated `cloudfridge-alb` and scaled ASGs. Created CloudWatch dashboard `cloudfridge-dashboard` tracking CPU and healthy hosts. Wrote and executed `load-test/load.js` with concurrent bcrypt logins: CPU spiked to 99.89%, triggering target tracking policy `cloudfridge-backend-cpu50` and scaling backend ASG from 2 to 4 instances. Captured `p6-scaling.png`, `p6-asg-activity.png`, `p6-cost.png`, and `p1-tests.png`. All 14 project evidence screenshots completed. Shut down all live resources (ASGs to 0, ALB deleted, RDS deleted). | Check Billing (estimate: < $0.20 for load test and ALB run) |
| 11 Nov 2026 | **Phase 4 done.** Wrote `lambda/send-alerts/` (`index.js`, `sendAlert.js`, `package.json`) and updated `scripts/package.sh`. Verified `mohandweb1@gmail.com` in SES (`eu-west-1`) and created IAM SMTP credentials. Created `cloudfridge-email-endpoint` (`vpce-0eaca2ea7795d0153`) with Private DNS, fixed `cloudfridge-email-endpoint-sg` port (`0` → `587`), deployed `cloudfridge-send-alerts` in VPC, verified alert email delivery, duplicate suppression, and date-update re-triggering, attached EventBridge rule `Cloudfridge-daily-alerts` (`cron(0 7 * * ? *)`), saved 4 screenshots (`p4-email-a.png`, `p4-email-b.png`, `p4-lambda.png`, `p4-lambda-triggers.png`), and deleted the VPC endpoint. | Check Billing (estimate: a few cents for ~1 hour of `cloudfridge-email-endpoint` and `cloudfridge-db`) |
| 10 Nov 2026 | **Phase 3 done.** Built and uploaded both releases, 2 launch templates, 2 target groups, the load balancer and 2 ASGs. Fixed an endpoint typo in the Parameter Store URLs, created `cloudfridge_app` and ran the migration. App worked through the load balancer, direct server access timed out. Scaled the backend to 2 (zones a and b) with the 50% CPU policy, tested self-healing (replacement started in about 1 second) and instance refreshes on both groups. 4 screenshots plus 2 extras. Ended with ASGs at 0, RDS stopped, load balancer deleted and 2 stray Elastic IPs released. `cloudfridge-dashboard` deferred to Phase 6. | Check Billing (estimate: under \$1, about 1.5 hours of 2 to 3 servers, the load balancer and RDS) |
| 10 Nov 2026 | **Phase 2 done.** Built the network, 6 security groups, 3 roles, releases bucket, private RDS and 3 parameters. Proved the database is private (resolves to `10.0.11.187`, port 5432 times out). 4 screenshots saved. RDS stopped. | Under \$1 (estimate: RDS ran for a few hours; check Billing) |
| 10 Nov 2026 | Docs reworked around the report and presentation: roadmap, evidence plan, Phase 2 walkthrough with screenshot points. | $0 |
| 2 Nov 2026 | Account check. Phase 1 built, tested and committed. | $0 |
