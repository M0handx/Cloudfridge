import cluster from 'node:cluster';
import { config } from './config.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

function runPrimary() {
  let shuttingDown = false;
  console.log(JSON.stringify({ msg: 'starting', workers: config.workers, port: config.port }));

  for (let i = 0; i < config.workers; i += 1) cluster.fork();

  cluster.on('exit', (worker, code) => {
    if (shuttingDown) {
      if (Object.keys(cluster.workers).length === 0) process.exit(0);
      return;
    }
    console.error(JSON.stringify({ level: 'error', msg: 'worker died, restarting', pid: worker.process.pid, code }));
    // Short delay, so a worker that fails at startup can't spin the CPU.
    setTimeout(() => cluster.fork(), 1000);
  });

  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const worker of Object.values(cluster.workers)) worker.process.kill('SIGTERM');
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

async function runWorker() {
  const [{ createApp }, { pool }] = await Promise.all([import('./app.js'), import('./db.js')]);
  const server = createApp().listen(config.port);

  const shutdown = () => {
    // Stop taking requests, finish current ones, then exit.
    server.close(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', () => {}); // The primary coordinates Ctrl-C through SIGTERM.
}

if (cluster.isPrimary) runPrimary();
else runWorker();
