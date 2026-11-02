import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const statsRouter = Router();
statsRouter.use(requireAuth);

statsRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT count(*) FILTER (WHERE status = 'used')::int   AS used,
              count(*) FILTER (WHERE status = 'wasted')::int AS wasted
       FROM items WHERE user_id = $1`,
      [req.userId],
    );
    const { used, wasted } = rows[0];
    const total = used + wasted;
    res.json({ used, wasted, wastePercent: total ? Math.round((wasted / total) * 100) : 0 });
  } catch (err) {
    next(err);
  }
});
