# Phase 4: Daily Alerts Walkthrough

> **Status:** Done ✅ (11 November 2026). `cloudfridge-email-endpoint` was deleted at the end of the session.
> **Region:** `eu-west-1` (Ireland). Check the region selector before every step.
> **Names and tags:** prefix `cloudfridge-`, tag `Project=cloudfridge` on everything that accepts tags.
> **Screenshots:** 2 required (`p4-lambda.png` and `p4-email`), plus extras saved (`p4-email-a.png`, `p4-email-b.png`, `p4-lambda-triggers.png`).
> **Time:** about 1 hour. Only RDS needed to be running (no EC2 instances or load balancer).

---

## 1. Objective

Deploy `cloudfridge-send-alerts`, a daily Lambda function inside the private subnets that queries RDS for active items expiring within 2 days, sends one summary email per user through SES over the `email-smtp` VPC interface endpoint, and marks those items with `alert_sent_at` so they are never alerted twice for the same expiry date.

---

## 2. Resource table

Fill this in as you go.

| Resource | Name | ID or address |
| --- | --- | --- |
| SES verified sender / recipient | Email identity | `mohandweb1@gmail.com` (verified) |
| SES SMTP user | `ses-smtp-user.20261111-233822` (IAM SMTP credentials) | `AKIA...` SMTP user |
| VPC interface endpoint | `cloudfridge-email-endpoint` (`com.amazonaws.eu-west-1.email-smtp`) | `vpce-0eaca2ea7795d0153` (**Deleted** at end of session; private DNS enabled) |
| Lambda package | `release/lambda/send-alerts.zip` | Built locally with `scripts/package.sh lambda` |
| Lambda function | `cloudfridge-send-alerts` | `arn:aws:lambda:eu-west-1:308413201206:function:cloudfridge-send-alerts` |
| EventBridge rule | `Cloudfridge-daily-alerts` (`cron(0 7 * * ? *)`, 08:00 CET) | `arn:aws:events:eu-west-1:308413201206:rule/Cloudfridge-daily-alerts` (ENABLED) |

---

## 3. Steps

### Step 0: Start RDS

1. **RDS** → **Databases** → `cloudfridge-db` → **Actions** → **Start**.
2. Wait ~5 minutes for it to become **Available** while doing steps 1 and 2.

### Step 1: Verify SES Email & Get SMTP Credentials

1. **Amazon SES** → **Identities** → **Create identity**:
   - **Identity type:** **Email address**
   - Enter your email address → **Create identity**.
   - Open your inbox and click the verification link from AWS. Refresh the SES page until status says **Verified**.
   - *(Since SES is in the sandbox, both sender and recipient must be verified. Using the same verified email for both sender and test user is the simplest option.)*
2. **SES** → **SMTP settings** → **Choose credential method: IAM SMTP credentials** *(not Mail Manager SMTP, which is a separate inbound service)* → **Create SMTP credentials**:
   - Leave the default IAM username (`ses-smtp-user-...`) → **Create user**.
   - **Copy or download the SMTP username (`AKIA...`) and SMTP password right away** (you'll paste them into Lambda in step 3).

### Step 2: Create the `email-smtp` VPC Endpoint

Because the Lambda sits in the private subnets with no internet route, it reaches SES through a VPC endpoint.

1. **VPC** → **Endpoints** → **Create endpoint**:
   - **Name tag:** `cloudfridge-email-endpoint`
   - **Service category:** AWS services
   - **Services:** search `email-smtp` and select `com.amazonaws.eu-west-1.email-smtp` (Type: **Interface**)
   - **VPC:** `cloudfridge` (`vpc-06619aaa1f0e99d36`)
   - **Subnets:** tick both **private** subnets:
     - `eu-west-1a` → `cloudfridge-private-a` (`subnet-0007863ece7ced3c4`)
     - `eu-west-1b` → `cloudfridge-private-b` (`subnet-0c50d44265cad5a04`)
   - **Security groups:** tick `cloudfridge-email-endpoint-sg` only (untick `default`)
   - **Additional settings:** make sure **Enable DNS name** (Private DNS) is **ticked**
   - **Tags:** `Project` = `cloudfridge`
   - Click **Create endpoint** and wait until status is **Available** (~1–2 minutes).

### Step 3: Create & Configure the Lambda Function

The zip file is already built on your laptop at `release/lambda/send-alerts.zip`.

1. First, grab the database URL:
   - **Systems Manager** → **Parameter Store** → `/cloudfridge/db/app-url` → **Show** → copy the value (confirm it has `was0jts` in the hostname).
2. **Lambda** → **Functions** → **Create function** → **Author from scratch**:
   - **Function name:** `cloudfridge-send-alerts`
   - **Runtime:** `Node.js 22.x`
   - **Permissions:** Change default execution role → **Use an existing role** → `cloudfridge-lambda-role`
   - **Advanced settings:**
     - Tick **Enable VPC**
     - **VPC:** `cloudfridge` (`vpc-06619aaa1f0e99d36`)
     - **Subnets:** `cloudfridge-private-a` and `cloudfridge-private-b`
     - **Security groups:** `cloudfridge-lambda-sg` (`sg-0f811b646a2579f27`)
   - Click **Create function** (takes ~1 minute while it sets up VPC access).
3. **Code** tab → **Upload from** → **.zip file** → select `release/lambda/send-alerts.zip` → **Save**.
4. **Configuration** tab:
   - **General configuration** → **Edit**:
     - **Memory:** `256` MB
     - **Timeout:** `1` min `0` sec
     - Save.
   - **Concurrency** → **Edit**:
     - Select **Reserve concurrency** = `1` → Save. *(If AWS says your account must keep 100 or 10 unreserved concurrency, leave it at **Use unreserved account concurrency** and note that in the table above).*
   - **Environment variables** → **Edit** → add these 6 variables:
     | Key | Value |
     | --- | --- |
     | `DATABASE_URL` | *(paste `/cloudfridge/db/app-url` value)* |
     | `SMTP_HOST` | `email-smtp.eu-west-1.amazonaws.com` |
     | `SMTP_PORT` | `587` |
     | `SMTP_USER` | *(paste SES SMTP username)* |
     | `SMTP_PASS` | *(paste SES SMTP password)* |
     | `SMTP_FROM` | *(your verified email address)* |
   - **Tags** → **Manage tags** → Add `Project` = `cloudfridge`.

### Step 4: Test the Alert Logic (4 checks)

Because EC2 and the load balancer are turned off to save credits, `index.js` includes a built-in test helper so you can seed test items and test all 4 criteria directly from the **Test** tab in the Lambda console.

1. **Seed test items** (1 expiring tomorrow, 1 expiring in 2 days, 1 expiring in 5 days):
   - Open the **Test** tab → **Create new event** → Name `seed`, JSON:
     ```json
     { "seedTestEmail": "YOUR_VERIFIED_EMAIL@example.com" }
     ```
   - Click **Test**. Output shows `"statusCode": 200` and logs `"seeded test items"`.
2. **Run 1 — Send alerts:**
   - Change the test event JSON to `{}` and click **Test**.
   - **Expected result:** `{"statusCode": 200, "usersChecked": 1, "emailsSent": 1, "itemsMarked": 2, "errors": 0}`.
   - Check your email inbox! You should receive one email with subject `CloudFridge: 2 items expiring soon` listing **Milk** (tomorrow) and **Spinach** (in 2 days), and **not** Apples (in 5 days).
   - 📸 `p4-email.png`: take a screenshot of the alert email in your inbox.
3. **Run 2 — No duplicate alerts:**
   - Click **Test** again with `{}`.
   - **Expected result:** `{"statusCode": 200, "usersChecked": 0, "emailsSent": 0, "itemsMarked": 0, "errors": 0}` because `alert_sent_at` is now set.
4. **Run 3 — Changing an item's date makes it eligible again:**
   - Test with:
     ```json
     { "bumpDateForEmail": "YOUR_VERIFIED_EMAIL@example.com" }
     ```
     (This updates Milk's `expiry_date` and sets `alert_sent_at = NULL`, just like `PATCH /api/items/:id` does in the backend.)
   - Now test with `{}` again → **Expected result:** `"emailsSent": 1, "itemsMarked": 1` (sends an email for Milk).

### Step 5: Add the Daily Schedule & Take Screenshot

1. At the top of the Lambda page, click **+ Add trigger**:
   - Select **EventBridge (CloudWatch Events)**
   - **Create a new rule**
   - **Rule name:** `Cloudfridge-daily-alerts`
   - **Rule type:** **Schedule expression**
   - **Schedule expression:** `cron(0 7 * * ? *)` (08:00 CET / `Europe/Budapest` winter time)
2. 📸 `p4-lambda.png`: On the `cloudfridge-send-alerts` page, take a screenshot showing the **Function overview** diagram (with the EventBridge trigger attached) and the **Configuration → VPC** details below it (plus an extra `p4-lambda-triggers.png` showing the enabled rule). Save the screenshots in `docs/evidence/`.

### Step 6: End the Session (Stop Paid Resources)

1. **VPC** → **Endpoints** → select `cloudfridge-email-endpoint` → **Actions** → **Delete VPC endpoints** (endpoints charge by the hour per AZ even when idle).
2. **RDS** → **Databases** → `cloudfridge-db` → **Actions** → **Stop temporarily** (or keep running only if immediately continuing to the next phase, then stop when done).

---

## 4. Done when

- [x] SES sender / recipient verified and IAM SMTP credentials created.
- [x] `cloudfridge-email-endpoint` created in private subnets with private DNS on.
- [x] `cloudfridge-send-alerts` deployed in private subnets with `cloudfridge-lambda-sg`.
- [x] Run 1 sends 1 email with the 2 qualifying items (and skips the 5-day item).
- [x] Run 2 immediately after sends 0 emails (`alert_sent_at` prevents duplicates).
- [x] Updating an item's expiry date clears `alert_sent_at` and makes it eligible again.
- [x] Daily schedule `Cloudfridge-daily-alerts` configured (`cron(0 7 * * ? *)`, `ENABLED`).
- [x] Screenshots `p4-lambda.png` (plus `p4-lambda-triggers.png`) and `p4-email-a.png` / `p4-email-b.png` saved in `docs/evidence/`.
- [x] `cloudfridge-email-endpoint` deleted (RDS stopped when session ends).

---

## 5. Results

Recorded on 11 November 2026, for the report.

| Check | Result |
| --- | --- |
| SES verification & credentials | Verified `mohandweb1@gmail.com` in `eu-west-1` and created IAM SMTP credentials (`ses-smtp-user.20261111-233822`). *(Note for report: AWS SES now defaults the SMTP settings screen to "Mail Manager SMTP" for inbound ingress; outbound SMTP requires selecting **IAM SMTP credentials**.)* |
| VPC endpoint | Created `cloudfridge-email-endpoint` (`vpce-0eaca2ea7795d0153`) in `cloudfridge-private-a` and `cloudfridge-private-b` with Private DNS enabled. Fixed an initial `Connection timeout` caused by `cloudfridge-email-endpoint-sg` having inbound port `0` instead of `587`. Deleted at the end of the session to avoid hourly charges. |
| Lambda deployment | Built `release/lambda/send-alerts.zip` with `scripts/package.sh lambda` (`pg`, `nodemailer`, `rds-ca.pem`) and deployed `cloudfridge-send-alerts` (`Node.js 22.x`, 256 MB, 60 s timeout, `cloudfridge-lambda-role`, `cloudfridge-lambda-sg`). |
| Alert query & email delivery | Seeded 3 test items (Milk +1d, Spinach +2d, Apples +5d). Run 1 returned `emailsSent: 1, itemsMarked: 2`, delivering one summary email listing Milk and Spinach and excluding Apples (`p4-email-a.png`, `p4-email-b.png`). |
| Duplicate prevention & re-alerting | Run 2 immediately returned `usersChecked: 0, emailsSent: 0` (`alert_sent_at` set). Updating Milk's expiry date cleared `alert_sent_at`, and the next run returned `emailsSent: 1, itemsMarked: 1`. |
| Daily schedule | Added EventBridge trigger `Cloudfridge-daily-alerts` (`ENABLED`, `cron(0 7 * * ? *)` UTC = 08:00 CET) (`p4-lambda.png`, `p4-lambda-triggers.png`). |

