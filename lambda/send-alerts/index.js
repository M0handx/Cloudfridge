import fs from 'node:fs';
import pg from 'pg';
import { sendAlert } from './sendAlert.js';

// Keep DATE columns as 'YYYY-MM-DD' strings.
pg.types.setTypeParser(1082, (value) => value);

const ca = fs.readFileSync(new URL('./rds-ca.pem', import.meta.url), 'utf8');

const ALERT_QUERY = `
  SELECT u.id AS user_id, u.email, i.id, i.name, i.expiry_date,
         (now() AT TIME ZONE 'Europe/Budapest')::date AS today
  FROM items i
  JOIN users u ON u.id = i.user_id
  WHERE i.status = 'active'
    AND i.alert_sent_at IS NULL
    AND i.expiry_date BETWEEN (now() AT TIME ZONE 'Europe/Budapest')::date
                          AND (now() AT TIME ZONE 'Europe/Budapest')::date + 2
  ORDER BY u.id, i.expiry_date, i.name;
`;

// Optional helper for Phase 4 testing when EC2 and the load balancer are stopped:
// invoke from the Lambda console with:
//   { "seedTestEmail": "your-verified@email.com" }
// or to simulate changing an item's expiry date (making it eligible again):
//   { "bumpDateForEmail": "your-verified@email.com" }
async function handleTestAction(client, event) {
  if (event?.seedTestEmail) {
    const email = String(event.seedTestEmail).trim().toLowerCase();
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [email]
    );
    const userId = userRes.rows[0].id;
    await client.query('DELETE FROM items WHERE user_id = $1', [userId]);
    await client.query(
      `INSERT INTO items (user_id, name, category, expiry_date, status, alert_sent_at)
       VALUES
         ($1, 'Milk', 'Dairy', (now() AT TIME ZONE 'Europe/Budapest')::date + 1, 'active', NULL),
         ($1, 'Spinach', 'Vegetables', (now() AT TIME ZONE 'Europe/Budapest')::date + 2, 'active', NULL),
         ($1, 'Apples', 'Fruit', (now() AT TIME ZONE 'Europe/Budapest')::date + 5, 'active', NULL)`,
      [userId]
    );
    console.log(JSON.stringify({ level: 'info', msg: 'seeded test items', email }));
    return { seeded: true, email };
  }

  if (event?.bumpDateForEmail) {
    const email = String(event.bumpDateForEmail).trim().toLowerCase();
    const res = await client.query(
      `UPDATE items i
       SET expiry_date = (now() AT TIME ZONE 'Europe/Budapest')::date + 1,
           alert_sent_at = NULL
       FROM users u
       WHERE i.user_id = u.id AND u.email = $1 AND i.name = 'Milk'
       RETURNING i.id, i.name, i.expiry_date`,
      [email]
    );
    console.log(JSON.stringify({ level: 'info', msg: 'updated item date and cleared alert_sent_at', updated: res.rowCount }));
    return { updated: res.rowCount };
  }

  return null;
}

export async function handler(event = {}) {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    ssl: { ca, rejectUnauthorized: true },
  });

  await client.connect();
  try {
    const testResult = await handleTestAction(client, event);
    if (testResult) {
      return { statusCode: 200, ...testResult };
    }

    const { rows } = await client.query(ALERT_QUERY);
    const byUser = new Map();
    let todayIso = null;

    for (const row of rows) {
      todayIso = row.today;
      if (!byUser.has(row.user_id)) {
        byUser.set(row.user_id, { id: row.user_id, email: row.email, items: [] });
      }
      byUser.get(row.user_id).items.push({
        id: row.id,
        name: row.name,
        expiry_date: row.expiry_date,
      });
    }

    let emailsSent = 0;
    let itemsMarked = 0;
    let errors = 0;

    for (const user of byUser.values()) {
      try {
        await sendAlert(user, user.items, todayIso);
        const ids = user.items.map((item) => item.id);
        await client.query(
          'UPDATE items SET alert_sent_at = now() WHERE id = ANY($1::uuid[])',
          [ids]
        );
        emailsSent += 1;
        itemsMarked += ids.length;
        console.log(JSON.stringify({ level: 'info', msg: 'alert sent', userId: user.id, items: ids.length }));
      } catch (err) {
        errors += 1;
        console.error(JSON.stringify({ level: 'error', msg: 'alert failed', userId: user.id, err: err.message }));
      }
    }

    return {
      statusCode: 200,
      usersChecked: byUser.size,
      emailsSent,
      itemsMarked,
      errors,
    };
  } finally {
    await client.end();
  }
}

