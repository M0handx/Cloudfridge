import { Router } from 'express';

export const healthRouter = Router();

// Deliberately does not touch the database. A brief database problem must not
// make the load balancer mark every server unhealthy and replace them all.
healthRouter.get('/', (req, res) => res.json({ status: 'ok' }));
