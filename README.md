# CloudFridge

A cloud-based food expiry tracker, built on AWS. The graded deliverables are a report and a presentation, proven with screenshots of each phase.

| Document | Read it for |
| --- | --- |
| [docs/project_guide.md](docs/project_guide.md) | Design, architecture, report & presentation outlines ([Section 11](docs/project_guide.md#11-implementation-phases)), and the 14-screenshot map |
| [docs/status.md](docs/status.md) | Live progress board, AWS account facts, resource inventory, and session log |
| [docs/phase-1-application.md](docs/phase-1-application.md) | Phase 1 walkthrough: local app, schema & test suite (**Done ✅**) |
| [docs/phase-2-foundation.md](docs/phase-2-foundation.md) | Phase 2 walkthrough: AWS networking, security groups, RDS & IAM (**Done ✅**) |
| [docs/phase-3-deployment.md](docs/phase-3-deployment.md) | Phase 3 walkthrough: S3 releases, ALB, EC2 Auto Scaling & self-healing (**Done ✅**) |
| [docs/phase-4-alerts.md](docs/phase-4-alerts.md) | Phase 4 walkthrough: VPC Lambda, SES SMTP endpoint & EventBridge daily schedule (**Done ✅**) |
| [docs/phase-6-delivery.md](docs/phase-6-delivery.md) | Phase 6 walkthrough: CloudWatch dashboard, load test (`2 → 4` scale-out), and final teardown (**Done ✅**) |
| [docs/evidence/](docs/evidence/) | All 14 required screenshots (plus extras) for the report and presentation |

**Status:** All engineering, AWS deployment, and load-testing phases (Phases 1, 2, 3, 4, and 6) are **complete** and all 14 evidence screenshots are saved in [`docs/evidence/`](docs/evidence/). All paid AWS resources have been decommissioned (`$0.00/hr`). Only the **written report** and **presentation slides** remain — see [Section 11 of `docs/project_guide.md`](docs/project_guide.md#11-implementation-phases) for the page-by-page report structure and slide-by-slide mapping.

## Run it locally

You need Node.js 22 or later and PostgreSQL 15 or later.

### 1. Create the databases

With local PostgreSQL:
```bash
psql -U postgres -c "CREATE ROLE cf_dev LOGIN CREATEDB PASSWORD 'cf_dev'"
psql -U postgres -c "CREATE DATABASE cloudfridge_dev OWNER cf_dev"
psql -U postgres -c "CREATE DATABASE cloudfridge_test OWNER cf_dev"
```

Or using Docker:
```bash
docker run -d --name cloudfridge-pg -e POSTGRES_PASSWORD=postgres -p 127.0.0.1:5432:5432 postgres:16-alpine
docker exec -i cloudfridge-pg psql -U postgres <<EOF
CREATE ROLE cf_dev LOGIN CREATEDB PASSWORD 'cf_dev';
CREATE DATABASE cloudfridge_dev OWNER cf_dev;
CREATE DATABASE cloudfridge_test OWNER cf_dev;
EOF
```

### 2. Start the backend

```bash
cd backend
npm install
cp .env.example .env     # on Windows: copy .env.example .env
npm run migrate:dev
npm run dev
```

The API runs at http://localhost:3000. Check it at http://localhost:3000/api/health.

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite passes `/api` requests to the backend.

## Run the tests

```bash
cd backend && npm test     # API tests, using cloudfridge_test
cd frontend && npm test    # Urgency rules
```

## Layout

| Folder | Holds |
| --- | --- |
| `frontend/` | React app |
| `backend/` | Express API, migrations, database setup script |
| `lambda/send-alerts/` | Daily alert job (Phase 4) |
| `infra/user-data/` | Server startup scripts (Phase 3) |
| `scripts/` | Release packaging (`backend`, `frontend`, `lambda`) |
| `load-test/` | Concurrent bcrypt login load generator (`load.js`, Phase 6) |
| `docs/` | Project guide, status, phase walkthroughs (`1`, `2`, `3`, `4`, `6`) and evidence screenshots |
