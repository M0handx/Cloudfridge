import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createApp } from '../src/app.js';
import { pool } from '../src/db.js';

let server;
let base;

async function call(method, path, { token, body, raw } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined || raw !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function newUser(email = 'a@example.com') {
  const res = await call('POST', '/api/auth/register', { body: { email, password: 'password123' } });
  assert.equal(res.status, 201);
  return res.body;
}

const addItem = async (token, fields = {}) => {
  const res = await call('POST', '/api/items', {
    token,
    body: { name: 'Milk', expiryDate: '2030-01-15', ...fields },
  });
  assert.equal(res.status, 201);
  return res.body;
};

before(async () => {
  server = createApp({ log: false }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => pool.query('TRUNCATE users CASCADE'));

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('health responds without a token', async () => {
  const res = await call('GET', '/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('unknown API route returns the standard error format', async () => {
  const res = await call('GET', '/api/nope');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('register returns a token and stores the email in lowercase', async () => {
  const res = await newUser('MiXeD@Example.com');
  assert.ok(res.token);
  assert.equal(res.user.email, 'mixed@example.com');
  assert.equal(res.user.password_hash, undefined);
});

test('register rejects a duplicate email regardless of case', async () => {
  await newUser('a@example.com');
  const res = await call('POST', '/api/auth/register', { body: { email: 'A@example.com', password: 'password123' } });
  assert.equal(res.status, 409);
});

test('register rejects a bad email and a short password', async () => {
  const bad = await call('POST', '/api/auth/register', { body: { email: 'nope', password: 'password123' } });
  assert.equal(bad.status, 400);
  const short = await call('POST', '/api/auth/register', { body: { email: 'a@example.com', password: 'short' } });
  assert.equal(short.status, 400);
});

test('malformed JSON returns 400', async () => {
  const res = await call('POST', '/api/auth/login', { raw: '{oops' });
  assert.equal(res.status, 400);
});

test('login succeeds, and failures share one generic message', async () => {
  await newUser();
  const ok = await call('POST', '/api/auth/login', { body: { email: 'a@example.com', password: 'password123' } });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);

  const wrong = await call('POST', '/api/auth/login', { body: { email: 'a@example.com', password: 'wrong-password' } });
  const unknown = await call('POST', '/api/auth/login', { body: { email: 'b@example.com', password: 'password123' } });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(wrong.body, unknown.body);
});

test('item endpoints require a valid token', async () => {
  assert.equal((await call('GET', '/api/items')).status, 401);
  assert.equal((await call('GET', '/api/stats')).status, 401);
  assert.equal((await call('GET', '/api/items', { token: 'not-a-jwt' })).status, 401);
});

test('an item needs only a name and expiry date', async () => {
  const { token } = await newUser();
  const item = await addItem(token);
  assert.equal(item.name, 'Milk');
  assert.equal(item.category, null);
  assert.equal(item.status, 'active');
  assert.equal(item.hasPhoto, false);
});

test('expiry date comes back exactly as sent', async () => {
  const { token } = await newUser();
  const item = await addItem(token, { expiryDate: '2030-03-31' });
  assert.equal(item.expiryDate, '2030-03-31');
  const list = await call('GET', '/api/items', { token });
  assert.equal(list.body[0].expiryDate, '2030-03-31');
});

test('invalid item input is rejected', async () => {
  const { token } = await newUser();
  const cases = [
    { expiryDate: '2030-01-15' },
    { name: '', expiryDate: '2030-01-15' },
    { name: '   ', expiryDate: '2030-01-15' },
    { name: 'x'.repeat(101), expiryDate: '2030-01-15' },
    { name: 'Milk' },
    { name: 'Milk', expiryDate: '15/01/2030' },
    { name: 'Milk', expiryDate: '2030-02-30' },
    { name: 'Milk', expiryDate: '2030-01-15', category: 'Nope' },
  ];
  for (const body of cases) {
    const res = await call('POST', '/api/items', { token, body });
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.error.code, 'INVALID_INPUT');
  }
});

test('list shows active items, soonest expiry first', async () => {
  const { token } = await newUser();
  await addItem(token, { name: 'Later', expiryDate: '2030-06-01' });
  await addItem(token, { name: 'Sooner', expiryDate: '2030-01-01' });
  const gone = await addItem(token, { name: 'Gone', expiryDate: '2029-01-01' });
  await call('PATCH', `/api/items/${gone.id}`, { token, body: { status: 'used' } });

  const res = await call('GET', '/api/items', { token });
  assert.deepEqual(res.body.map((i) => i.name), ['Sooner', 'Later']);
});

test('patch edits fields and can clear the category', async () => {
  const { token } = await newUser();
  const item = await addItem(token, { category: 'Dairy' });
  const res = await call('PATCH', `/api/items/${item.id}`, {
    token,
    body: { name: 'Oat milk', category: null, expiryDate: '2030-02-02' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'Oat milk');
  assert.equal(res.body.category, null);
  assert.equal(res.body.expiryDate, '2030-02-02');
});

test('patch with no fields is rejected', async () => {
  const { token } = await newUser();
  const item = await addItem(token);
  assert.equal((await call('PATCH', `/api/items/${item.id}`, { token, body: {} })).status, 400);
});

test('changing the expiry date clears alert_sent_at, and other edits keep it', async () => {
  const { token } = await newUser();
  const item = await addItem(token);
  const alertState = async () =>
    (await pool.query('SELECT alert_sent_at FROM items WHERE id = $1', [item.id])).rows[0].alert_sent_at;
  const markAlerted = () => pool.query('UPDATE items SET alert_sent_at = now() WHERE id = $1', [item.id]);

  await markAlerted();
  await call('PATCH', `/api/items/${item.id}`, { token, body: { name: 'Renamed' } });
  assert.notEqual(await alertState(), null, 'renaming keeps the alert state');

  await call('PATCH', `/api/items/${item.id}`, { token, body: { expiryDate: item.expiryDate } });
  assert.notEqual(await alertState(), null, 'saving the same date keeps the alert state');

  await call('PATCH', `/api/items/${item.id}`, { token, body: { expiryDate: '2031-01-01' } });
  assert.equal(await alertState(), null, 'a new date clears the alert state');
});

test('a user cannot see or change another user\'s item', async () => {
  const alice = await newUser('alice@example.com');
  const bob = await newUser('bob@example.com');
  const item = await addItem(alice.token);

  assert.deepEqual((await call('GET', '/api/items', { token: bob.token })).body, []);
  assert.equal((await call('GET', `/api/items/${item.id}`, { token: bob.token })).status, 404);
  assert.equal((await call('PATCH', `/api/items/${item.id}`, { token: bob.token, body: { name: 'Mine' } })).status, 404);
  assert.equal((await call('DELETE', `/api/items/${item.id}`, { token: bob.token })).status, 404);

  const stillThere = await call('GET', `/api/items/${item.id}`, { token: alice.token });
  assert.equal(stillThere.body.name, 'Milk');
});

test('a malformed item id returns 404, not a server error', async () => {
  const { token } = await newUser();
  assert.equal((await call('GET', '/api/items/not-a-uuid', { token })).status, 404);
});

test('delete removes an item and it does not count in the statistics', async () => {
  const { token } = await newUser();
  const item = await addItem(token);
  assert.equal((await call('DELETE', `/api/items/${item.id}`, { token })).status, 204);
  assert.equal((await call('GET', `/api/items/${item.id}`, { token })).status, 404);
  assert.deepEqual((await call('GET', '/api/stats', { token })).body, { used: 0, wasted: 0, wastePercent: 0 });
});

test('statistics count used and wasted items for this user only', async () => {
  const alice = await newUser('alice@example.com');
  const bob = await newUser('bob@example.com');
  for (const status of ['used', 'used', 'used', 'wasted']) {
    const item = await addItem(alice.token);
    await call('PATCH', `/api/items/${item.id}`, { token: alice.token, body: { status } });
  }
  await addItem(alice.token); // active items don't count

  assert.deepEqual((await call('GET', '/api/stats', { token: alice.token })).body, {
    used: 3,
    wasted: 1,
    wastePercent: 25,
  });
  assert.deepEqual((await call('GET', '/api/stats', { token: bob.token })).body, {
    used: 0,
    wasted: 0,
    wastePercent: 0,
  });
});
