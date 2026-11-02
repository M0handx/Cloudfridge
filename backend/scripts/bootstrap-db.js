// Creates the limited app user. Run once per database, with the admin URL.
//
//   DATABASE_URL=<admin url> APP_DB_PASSWORD=<password> node scripts/bootstrap-db.js
import fs from 'node:fs';
import pg from 'pg';

const APP_USER = 'cloudfridge_app';
const { DATABASE_URL, APP_DB_PASSWORD, DB_SSL } = process.env;

if (!DATABASE_URL || !APP_DB_PASSWORD) {
  console.error('DATABASE_URL (admin) and APP_DB_PASSWORD are required');
  process.exit(1);
}

const ssl =
  DB_SSL === 'off'
    ? false
    : { ca: fs.readFileSync(new URL('../deploy/rds-ca-bundle.pem', import.meta.url), 'utf8'), rejectUnauthorized: true };

const client = new pg.Client({ connectionString: DATABASE_URL, ssl });
await client.connect();

try {
  const { rows: existing } = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [APP_USER]);
  const action = existing.length ? 'ALTER ROLE %I WITH LOGIN PASSWORD %L' : 'CREATE ROLE %I LOGIN PASSWORD %L';
  const { rows } = await client.query('SELECT format($1, $2::text, $3::text) AS sql', [action, APP_USER, APP_DB_PASSWORD]);
  await client.query(rows[0].sql);

  const { rows: dbRows } = await client.query('SELECT current_database() AS name');
  const db = client.escapeIdentifier(dbRows[0].name);

  // Read and write rows, but never change the schema.
  await client.query(`GRANT CONNECT ON DATABASE ${db} TO ${APP_USER}`);
  await client.query(`REVOKE CREATE ON SCHEMA public FROM ${APP_USER}`);
  await client.query(`GRANT USAGE ON SCHEMA public TO ${APP_USER}`);
  await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_USER}`);
  await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_USER}`);

  console.log(`${existing.length ? 'Updated' : 'Created'} ${APP_USER}`);
} finally {
  await client.end();
}
