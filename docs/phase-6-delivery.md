# Phase 6: Testing and Delivery Walkthrough

> **Status:** Done ✅ (12 November 2026). All 14 project evidence screenshots captured, load testing completed, auto-scaling proven (CPU 99.89%, backend ASG scaled 2 → 4 instances), and live resources decommissioned.
> **Region:** `eu-west-1` (Ireland). Check the region selector before every step.
> **Names and tags:** prefix `cloudfridge-`, tag `Project=cloudfridge` on everything that accepts tags.
> **Screenshots:** All 14 screenshots completed in `docs/evidence/`:
>   - `p1-tests.png` (terminal: unit/API test suites)
>   - `p6-scaling.png` (CloudWatch: CPU 99.89% and healthy host count scaling 2 → 4)
>   - `p6-asg-activity.png` (ASG activity history showing scale-out AlarmHigh 2 → 4 instances)
>   - `p6-cost.png` (AWS Cost Explorer showing project cost within credits)

---

## 1. Objective

Prove the system under realistic production conditions:
1. Recreate the Application Load Balancer (`cloudfridge-alb`) and bring the Auto Scaling Groups back to normal operational size (frontend: 1, backend: 2).
2. Create the CloudWatch dashboard (`cloudfridge-dashboard`) tracking CPU utilization, healthy target host count, and 5XX errors.
3. Run the automated load test against the API to drive CPU above 50%, triggering the Target Tracking Auto Scaling policy to scale out backend instances from 2 to 3 or 4.
4. Stop the load test and observe scale-in back to 2 instances.
5. Capture the final evidence screenshots, perform the final cost analysis in Cost Explorer, and shut down paid resources.

---

## 2. Resource Table

| Resource | Name | ID or address | Status |
| --- | --- | --- | --- |
| Load Balancer | `cloudfridge-alb` | Recreate from settings below | Temporary (delete at end) |
| Target Group (Frontend) | `cloudfridge-frontend-tg` | Existing (port 80) | Healthy |
| Target Group (Backend) | `cloudfridge-backend-tg` | Existing (port 3000) | Healthy |
| Frontend ASG | `cloudfridge-frontend-asg` | `cloudfridge-frontend-lt` | Desired: 1, Min: 1, Max: 1 |
| Backend ASG | `cloudfridge-backend-asg` | `cloudfridge-backend-lt` | Desired: 2, Min: 2, Max: 4 |
| Scaling Policy | `cloudfridge-backend-cpu50` | Target tracking (CPU 50%) | Active on backend ASG |
| Dashboard | `cloudfridge-dashboard` | CloudWatch Dashboard | 3 key widgets |

---

## 3. Step-by-Step Instructions

### Step 0: Ensure RDS is Available

1. In **RDS** → **Databases** → `cloudfridge-db`:
   - If status is **Available**, proceed to Step 1.
   - If **Stopped**, click **Actions** → **Start** (takes ~5 minutes).

---

### Step 1: Recreate `cloudfridge-alb` (Application Load Balancer)

1. Go to **EC2** → **Load Balancers** → **Create load balancer** → **Application Load Balancer**:
   - **Load balancer name:** `cloudfridge-alb`
   - **Scheme:** Internet-facing, IPv4
   - **VPC:** `cloudfridge` (`vpc-06619aaa1f0e99d36`)
   - **Mappings (Subnets):** Tick both **public** subnets:
     - `eu-west-1a` → `cloudfridge-public-a` (`subnet-06785a6f41c5424a3`)
     - `eu-west-1b` → `cloudfridge-public-b` (`subnet-0cad68eff1d72f199`)
   - **Security groups:** Select `cloudfridge-alb-sg` (`sg-00098aedd6bd2a6e1`) only (remove `default`).
   - **Listeners and routing:**
     - Protocol: **HTTP**, Port: **80**
     - Default action: Forward to **`cloudfridge-frontend-tg`**
   - **Tags:** Key `Project`, Value `cloudfridge`
   - Click **Create load balancer**.
2. **Add the API routing rule:**
   - Click on `cloudfridge-alb` → **Listeners and rules** tab.
   - Click the HTTP:80 listener → **Add rule**:
     - **Name:** `api-rule`
     - **Condition:** Path is `/api/*`
     - **Action:** Forward to **`cloudfridge-backend-tg`**
     - **Priority:** `10`
     - Save changes.
3. Copy the load balancer's **DNS name** (e.g. `http://cloudfridge-alb-xxxxxxxx.eu-west-1.elb.amazonaws.com`).

---

### Step 2: Scale up the Auto Scaling Groups

1. Go to **EC2** → **Auto Scaling Groups**:
   - Select **`cloudfridge-frontend-asg`** → **Edit** → Desired: `1`, Min: `1`, Max: `1` → Update.
   - Select **`cloudfridge-backend-asg`** → **Edit** → Desired: `2`, Min: `2`, Max: `4` → Update.
2. Wait ~3–4 minutes for the instances to boot:
   - Check **EC2** → **Target Groups**:
     - `cloudfridge-frontend-tg` shows **1 healthy target**.
     - `cloudfridge-backend-tg` shows **2 healthy targets**.
3. Open `http://<alb-dns-name>` in your browser — the React app loads and communicates with the backend!

---

### Step 3: Create CloudWatch Dashboard `cloudfridge-dashboard`

1. Go to **CloudWatch** → **Dashboards** → **Create dashboard**:
   - **Name:** `cloudfridge-dashboard`
2. Add **Widget 1: Backend CPU Utilization**
   - Type: **Line** → Metrics: **AWS/EC2** → **By Auto Scaling Group**:
     - Select `cloudfridge-backend-asg` → `CPUUtilization` (Statistic: **Average**, Period: **1 minute**).
     - Title: `Backend ASG CPU Utilization (%)`
3. Add **Widget 2: Healthy Backend Host Count**
   - Type: **Line** → Metrics: **AWS/ApplicationELB** → **By Target Group**:
     - Select `cloudfridge-backend-tg` → `HealthyHostCount` (Statistic: **Average**, Period: **1 minute**).
     - Title: `Backend Healthy Host Count`
4. Add **Widget 3: ALB 5XX Target Errors**
   - Type: **Number** or **Line** → Metrics: **AWS/ApplicationELB** → **By Load Balancer**:
     - Select `cloudfridge-alb` → `HTTPCode_Target_5XX_Count` (Statistic: **Sum**, Period: **1 minute**).
     - Title: `Target 5XX Errors`
5. Click **Save dashboard**.

---

### Step 4: Run the Load Test & Trigger Auto Scaling

The load script is already in your repository at `load-test/load.js`. It fires concurrent login requests (each running 10 rounds of bcrypt), driving CPU utilization above the 50% target threshold.

1. Open your terminal in `cloudfridge` and run:
   ```bash
   node load-test/load.js http://<YOUR_NEW_ALB_DNS> 25 360
   ```
   *(Runs 25 concurrent workers for 6 minutes).*
2. Watch the terminal output: you will see ~50–100 req/s.
3. Within 2–3 minutes:
   - In CloudWatch, average CPU on `cloudfridge-backend-asg` rises past 50%.
   - The scaling policy `cloudfridge-backend-cpu50` triggers an alarm.
   - In **Auto Scaling Groups** → `cloudfridge-backend-asg` → **Activity**, a 3rd instance launches!
   - In Target Groups, the 3rd instance registers and becomes healthy.
4. 📸 **Screenshot 12 (`p6-scaling.png`):** In CloudWatch, capture `cloudfridge-dashboard` showing CPU utilization climbing above 50% and HealthyHostCount rising from 2 to 3.
5. Once the script finishes, wait ~5–10 minutes for cooldown. In ASG Activity, watch the group scale back in to 2 instances.
6. 📸 **Screenshot 13 (`p6-asg-activity.png`):** In `cloudfridge-backend-asg` → **Activity** tab, take a screenshot showing the activity log with scale-out, scale-in, and the earlier instance replacement from Phase 3.

---

### Step 5: AWS Cost Explorer (`p6-cost.png`)

1. Go to **Billing and Cost Management** → **Cost Explorer** (or **Cost Anomaly Detection** / **Bills**).
2. Set Group by: **Service** or Filter by Tag: `Project` = `cloudfridge`.
3. 📸 **Screenshot 14 (`p6-cost.png`):** Capture the cost overview chart/table proving spending is safely within your $140 credits.

---

### Step 6: Local Unit & Integration Tests (`p1-tests.png`)

1. Run frontend tests in terminal:
   ```bash
   cd frontend && npm test
   ```
2. 📸 **Screenshot 1 (`p1-tests.png`):** Terminal capture showing tests passing cleanly.

---

### Step 7: Final Shutdown (Zero-Cost State)

Now that all 14 screenshots are secured, stop all paid resources:
1. **Auto Scaling Groups:** Set `cloudfridge-frontend-asg` and `cloudfridge-backend-asg` Desired to `0`, Min to `0`. Wait for instances to terminate.
2. **Load Balancers:** Delete `cloudfridge-alb`.
3. **RDS:** Stop `cloudfridge-db` temporarily.

*(Note: Keep your S3 releases bucket, launch templates, security groups, and Lambda function intact until your report and slides are graded!)*


---

## 4. Results

Recorded on 12 November 2026, for the report.

| Check | Result |
| --- | --- |
| Load balancer | `cloudfridge-alb` recreated (`cloudfridge-alb-2027961514.eu-west-1.elb.amazonaws.com`) with the `/api/*` rule. The app loaded through it. |
| Dashboard | `cloudfridge-dashboard` with backend ASG `CPUUtilization` and `HealthyHostCount` for both target groups. The 5XX widget wasn't added. |
| Load test | `load-test/load.js`, 25 workers sending `POST /api/auth/login` (bcrypt cost 10), about 25 requests per second. One `502` during the first 15 seconds, otherwise no errors. Stopped once scale-out was proven. (`k6` wasn't installed, so the Node script replaced it.) |
| Scale out | Average backend CPU rose from about 0% to **99.89%**. At 23:31:00 UTC the `AlarmHigh` alarm of the target tracking policy changed desired capacity from **2 to 4**; both new instances launched and were healthy by 23:33:10 UTC (`p6-scaling.png`, `p6-asg-activity.png`). |
| Scale in | Not observed: the resources were shut down right after scale-out. |
| Failure recovery | Covered by the Phase 3 terminate test (`p3-self-healing.png`), not repeated under load. |
| User isolation, validation | Covered by the 19 backend API tests from Phase 1 (404 on another user's item, 400 on bad input). |
| Cost | `p6-cost.png` taken from Cost Explorer; it shows \$0.00 because credits cover the spend. |
| Shutdown | ASGs at 0, `cloudfridge-alb` deleted, `cloudfridge-db` deleted without a final snapshot. |
