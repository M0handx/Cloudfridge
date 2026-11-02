# CloudFridge

A cloud-based food expiry tracker, built on AWS. The full design and plan are in [docs/project_guide.md](docs/project_guide.md).

**Status:** Phase 1 is complete, so the app runs locally. AWS deployment starts in Phase 2.

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
| `docs/` | Project guide and AWS account check |
