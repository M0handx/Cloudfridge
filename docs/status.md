# CloudFridge: Status

Where the project stands right now. The design and plan live in [project_guide.md](project_guide.md); this file records what has actually been done, what exists in AWS, and what's still open. Update it at the end of every work session.

**Last updated:** 2 November 2026

## Current state

| Phase | Status | Result |
| --- | --- | --- |
| 1. Application | **Done** (2 Nov 2026) | Full app runs locally, all tests pass |
| 2. Foundation | Next | |
| 3. Deployment and scaling | Not started | |
| 4. Daily alerts | Not started | |
| 5. Optional photos | Not started | |
| 6. Testing and delivery | Not started | |

**Next step:** Phase 2, step 1: create the VPC in `eu-west-1`.

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
- **Instances:** `t3.micro` for EC2 and `db.t3.micro` for RDS.

### Cost rules for the credits

- Between sessions, set both ASGs to 0 and stop RDS.
- During long breaks, delete the load balancer and the email VPC endpoint, because they charge by the hour even when idle.
- Note spending at the end of each session in the log below, for the report.

---

## AWS resources

Nothing has been created in AWS yet. Add each resource here as it's created, so cleanup and the report are easy. Every resource uses the `cloudfridge-` prefix and the tag `Project=cloudfridge`.

| Resource | Name or ID | Phase | Notes |
| --- | --- | --- | --- |
| | | | |

Parameter Store keys, once created: `/cloudfridge/db/admin-url`, `/cloudfridge/db/app-url`, `/cloudfridge/jwt-secret`.

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
| Set an AWS budget alert, for example at $20 and $50 | Before creating anything in Phase 2 |
| Confirm `t3.micro` launches in `eu-west-1` | Phase 2 |
| Confirm Session Manager connects | Phase 3, first server |
| Local Node.js is 20, while the project targets 22. Everything works on 20, but install Node.js 22 on the servers. | Phase 3 |
| Verify the SES sender and demo recipient addresses | Phase 4 |

---

## Session log

Newest first. One line per session: what was done, and roughly what it cost.

| Date | Work | AWS spend |
| --- | --- | --- |
| 2 Nov 2026 | Account check. Phase 1 built, tested and committed. | $0 |
