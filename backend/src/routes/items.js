import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { notFound } from '../middleware/errors.js';
import { validateBody } from '../middleware/validate.js';
import { createItemSchema, updateItemSchema } from '../schemas/index.js';

const COLUMNS = 'id, name, category, expiry_date, status, has_photo';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toItem = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  expiryDate: row.expiry_date,
  status: row.status,
  hasPhoto: row.has_photo,
});

export const itemsRouter = Router();
itemsRouter.use(requireAuth);

// A malformed id can't match any item, so it is a plain 404 rather than a database error.
itemsRouter.param('id', (req, res, next, id) => (UUID.test(id) ? next() : next(notFound('Item not found'))));

itemsRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${COLUMNS} FROM items
       WHERE user_id = $1 AND status = 'active'
       ORDER BY expiry_date, created_at`,
      [req.userId],
    );
    res.json(rows.map(toItem));
  } catch (err) {
    next(err);
  }
});

itemsRouter.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT ${COLUMNS} FROM items WHERE id = $1 AND user_id = $2`, [
      req.params.id,
      req.userId,
    ]);
    if (!rows[0]) throw notFound('Item not found');
    res.json(toItem(rows[0]));
  } catch (err) {
    next(err);
  }
});

itemsRouter.post('/', validateBody(createItemSchema), async (req, res, next) => {
  try {
    const { name, expiryDate, category = null } = req.body;
    const { rows } = await query(
      `INSERT INTO items (user_id, name, category, expiry_date)
       VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
      [req.userId, name, category, expiryDate],
    );
    res.status(201).json(toItem(rows[0]));
  } catch (err) {
    next(err);
  }
});

itemsRouter.patch('/:id', validateBody(updateItemSchema), async (req, res, next) => {
  try {
    const { name, expiryDate, category, status } = req.body;
    const sets = [];
    const params = [req.params.id, req.userId];
    const set = (column, value) => {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    };

    if (name !== undefined) set('name', name);
    if (category !== undefined) set('category', category);
    if (status !== undefined) set('status', status);
    if (expiryDate !== undefined) {
      set('expiry_date', expiryDate);
      // A new date can trigger a new alert. Saving the same date changes nothing.
      sets.push(`alert_sent_at = CASE WHEN expiry_date IS DISTINCT FROM $${params.length}::date
                                      THEN NULL ELSE alert_sent_at END`);
    }

    const { rows } = await query(
      `UPDATE items SET ${sets.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING ${COLUMNS}`,
      params,
    );
    if (!rows[0]) throw notFound('Item not found');
    res.json(toItem(rows[0]));
  } catch (err) {
    next(err);
  }
});

itemsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM items WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.userId,
    ]);
    if (!rowCount) throw notFound('Item not found');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
