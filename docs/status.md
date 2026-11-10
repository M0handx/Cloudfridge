# CloudFridge: Status

Where the project stands right now. The design and plan live in [project_guide.md](project_guide.md); this file records what has actually been done, what exists in AWS, and what's still open. Update it at the end of every work session.

**Last updated:** 10 November 2026

## Current state

| Phase | Status | Result / Walkthrough |
| --- | --- | --- |
| 1. Application | **Done** (2 Nov 2026) | Full app runs locally, all tests pass · [Phase 1 Walkthrough](phase-1-application.md) |
| 2. Foundation | **Done** (10 Nov 2026) | VPC, security groups, roles, bucket, private RDS, secrets · [Phase 2 Walkthrough](phase-2-foundation.md) |
| 3. Deployment and scaling | **Next**, not started | Load balancer, ASGs, releases · [Phase 3 Walkthrough](phase-3-deployment.md) |
| 4. Daily alerts | Not started | |
| 5. Optional photos | Not started | |
| 6. Testing and delivery | Not started | |

**Next step:** Follow the [Phase 3 walkthrough](phase-3-deployment.md) from step 0, which starts RDS again and activates the `Project` cost tag. Screenshots 2 to 5 are taken; `p1-tests.png` (screenshot 1) is still open.

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
| Session Manager | Console page opens | Confirm on the first server in Phase 3 |
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
| 2 | VPC, internet gateway, 4 subnets, 2 route tables, 6 security groups, 3 IAM roles, releases bucket, DB subnet group, RDS `cloudfridge-db`, 3 SecureString parameters | [phase-2-foundation.md](phase-2-foundation.md#2-resource-table) | RDS **stopped** (AWS restarts it on 17 Nov 2026). Everything else is free and left as is. |

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
| `backend/deploy/`: systemd service file and RDS CA bundle (`rds-ca-bundle.pem`) | 3 |
| Running `bootstrap-db.js` (needs the CA bundle and RDS) | 3 |

---

## Open items

| Item | When |
| --- | --- |
| Screenshot both test suites passing, as `p1-tests.png` (start Docker for the backend database first) | Any time |
| Check the budget (`My Monthly Cost Budget`, \$40) has **Credits** unticked in its advanced options | Phase 3, step 0 |
| Activate the `Project` cost allocation tag. It wasn't listed yet on 10 Nov, as AWS needs up to a day. | Phase 3, step 0 |
| Copy the remaining resource IDs (public subnets, route tables, three security groups, bucket suffix) into the Phase 2 resource table | Phase 3, step 0 |
| Confirm `t3.micro` launches in `eu-west-1` | Phase 3, first launch template |
| Confirm Session Manager connects | Phase 3, first server |
| Local Node.js is 20, while the project targets 22. Everything works on 20, but install Node.js 22 on the servers. | Phase 3 |
| Verify the SES sender and demo recipient addresses | Phase 4 |

---

## Session log

Newest first. One line per session: what was done, and roughly what it cost.

| Date | Work | AWS spend |
| --- | --- | --- |
| 10 Nov 2026 | **Phase 2 done.** Built the network, 6 security groups, 3 roles, releases bucket, private RDS and 3 parameters. Proved the database is private (resolves to `10.0.11.187`, port 5432 times out). 4 screenshots saved. RDS stopped. | Under \$1 (estimate: RDS ran for a few hours; check Billing) |
| 10 Nov 2026 | Docs reworked around the report and presentation: roadmap, evidence plan, Phase 2 walkthrough with screenshot points. | $0 |
| 2 Nov 2026 | Account check. Phase 1 built, tested and committed. | $0 |
