import express from 'express';
import helmet from 'helmet';
import { apiNotFound, errorHandler } from './middleware/errors.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { itemsRouter } from './routes/items.js';
import { statsRouter } from './routes/stats.js';

function requestLog(req, res, next) {
  const started = Date.now();
  res.on('finish', () => {
    // Health checks would otherwise fill the log.
    if (req.originalUrl === '/api/health') return;
    console.log(JSON.stringify({
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      ms: Date.now() - started,
    }));
  });
  next();
}

export function createApp({ log = true } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));
  if (log) app.use(requestLog);

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/items', itemsRouter);
  app.use('/api/stats', statsRouter);

  app.use('/api', apiNotFound);
  app.use(apiNotFound);
  app.use(errorHandler);
  return app;
}
