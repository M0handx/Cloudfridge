# CloudFridge

A cloud-based food expiry tracker, built on AWS. The graded deliverables are a report and a presentation, proven with screenshots of each phase.

| Document | Read it for |
| --- | --- |
| [docs/project_guide.md](docs/project_guide.md) | Design, architecture, deliverables and the roadmap of phases |
| [docs/status.md](docs/status.md) | Live progress board, AWS account facts, resource inventory |
| [docs/phase-1-application.md](docs/phase-1-application.md) | Phase 1 walkthrough: app, schema & test suite (**Done ✅**) |
| [docs/phase-2-foundation.md](docs/phase-2-foundation.md) | Phase 2 walkthrough: AWS networking, RDS & IAM (**Done ✅**) |
| [docs/phase-3-deployment.md](docs/phase-3-deployment.md) | Phase 3 walkthrough: releases, load balancer, Auto Scaling (**Next**, not started) |
| [docs/evidence/](docs/evidence/) | Screenshots for the report and presentation, named `p<phase>-<n>-<what>.png` |

**Status:** Phases 1 and 2 are done. Phase 3 (deployment and scaling on AWS) is next and not started.

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
| `scripts/` | Release packaging (Phase 3) |
| `load-test/` | k6 scripts (Phase 6) |
| `docs/` | Project guide, status, phase walkthroughs and evidence |
