import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../schemas/index.js';

const BCRYPT_COST = 10;

// Compared when the email is unknown, so both login failures take similar time.
const DUMMY_HASH = bcrypt.hashSync('cloudfridge-dummy-password', BCRYPT_COST);

export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const hash = await bcrypt.hash(password, BCRYPT_COST);
    const { rows } = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hash],
    );
    const user = rows[0];
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (err.code === '23505') return next(new AppError(409, 'EMAIL_TAKEN', 'Email is already registered'));
    next(err);
  }
});

authRouter.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows } = await query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
    const user = rows[0];
    const matches = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !matches) {
      // One generic message, so nobody can test which emails are registered.
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Wrong email or password');
    }
    res.json({ token: signToken(user), user: { id: user.id, email: user.email } });
  } catch (err) {
    next(err);
  }
});
