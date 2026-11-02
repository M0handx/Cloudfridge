# AWS account check

Completed on 2 November 2026.

| # | Check | Answer | Effect on the plan |
| --- | --- | --- | --- |
| 1 | Which regions can you use? | `eu-west-1` (Ireland) | All resources go in `eu-west-1` |
| 2 | Can you create IAM roles? | Yes | We create our own roles |
| 3 | Can you create IAM users? | Yes | SES SMTP credentials will work |
| 4 | Does SES work? | Yes, the console opens | Use the SES email path |
| 5 | Can you create SES SMTP credentials? | Yes | SES SMTP credentials confirmed working |
| 6 | Can you create VPC endpoints? | Yes | The email endpoint is possible |
| 7 | Does Session Manager work? | Likely, the page opens | Confirmed in Phase 3 on the first server |
| 8 | Billing | Free Plan, ~$140 credits remaining, expires in ~6 months | Sufficient budget; strict cost-control measures needed (see below) |
| 9 | Does the lab shut down between sessions? | No | The 08:00 alert schedule will run normally |

## Decisions

- **Region:** `eu-west-1`
- **IAM:** create our own roles
- **Email path:** SES, with **Email address** identities. The SES page asking for a domain is the other identity type, and we don't need a domain.

## Free Plan & Cost Minimization Strategy

- Credits are ~$140, valid for 6 months (until May 2027).
- To preserve maximum credits:
  - Keep RDS and EC2 ASGs stopped/set to 0 instances between work sessions.
  - Delete Application Load Balancers and VPC Endpoints during extended breaks (they incur hourly charges even when idle).
  - Use `t3.micro` for all compute and database instances.

## Still to confirm

| Item | How |
| --- | --- |
| `t3.micro` launches | Phase 2, step 1 |