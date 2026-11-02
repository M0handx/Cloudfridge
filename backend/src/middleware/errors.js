import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notFound = (message = 'Not found') => new AppError(404, 'NOT_FOUND', message);

// pg error codes meaning "the database is unreachable or restarting".
const isDbUnavailable = (err) =>
  ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'].includes(err.code) ||
  /^(08|57P)/.test(err.code || '') ||
  /timeout exceeded when trying to connect|Connection terminated/i.test(err.message || '');

export function apiNotFound(req, res, next) {
  next(notFound('Route not found'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    return res.status(400).json({ error: { code: 'INVALID_INPUT', message } });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Malformed JSON body' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'TOO_LARGE', message: 'Request body too large' } });
  }
  if (isDbUnavailable(err)) {
    console.error(JSON.stringify({ level: 'error', msg: 'database unavailable', err: err.message }));
    return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Service temporarily unavailable' } });
  }
  console.error(JSON.stringify({ level: 'error', msg: 'unhandled', err: err.message, stack: err.stack }));
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
}
