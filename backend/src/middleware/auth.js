import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AppError } from './errors.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwtExpiresIn,
  });
}

export function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid token'));
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    req.userId = payload.sub;
    next();
  } catch {
    next(new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid token'));
  }
}
