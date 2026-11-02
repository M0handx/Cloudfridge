import fs from 'node:fs';
import pg from 'pg';
import { config } from './config.js';

// Keep DATE columns as 'YYYY-MM-DD' strings. The default conversion to a
// JavaScript Date is read as local midnight and can shift the day.
pg.types.setTypeParser(1082, (value) => value);

function sslOptions() {
  if (config.dbSsl === 'off') return false;
  const caPath = new URL('../deploy/rds-ca-bundle.pem', import.meta.url);
  return { ca: fs.readFileSync(caPath, 'utf8'), rejectUnauthorized: true };
}

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: config.poolMax,
  connectionTimeoutMillis: 5000,
  ssl: sslOptions(),
});

// A dropped idle connection must not crash the process.
pool.on('error', (err) => console.error(JSON.stringify({ level: 'error', msg: 'pool error', err: err.message })));

export const query = (text, params) => pool.query(text, params);
