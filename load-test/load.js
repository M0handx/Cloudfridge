#!/usr/bin/env node
/**
 * CloudFridge Load Test Script
 *
 * Sends concurrent requests to POST /api/auth/login.
 * Because login runs 10 rounds of bcrypt on every attempt, it is heavily
 * CPU-bound and reliably triggers the 50% CPU CloudWatch alarm and Auto Scaling.
 *
 * Usage:
 *   node load-test/load.js <ALB_URL> [CONCURRENCY] [DURATION_SECONDS]
 *
 * Example:
 *   node load-test/load.js http://cloudfridge-alb-12345.eu-west-1.elb.amazonaws.com 25 300
 */

let rawUrl = process.argv[2] || '';
if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
  rawUrl = `http://${rawUrl}`;
}
const targetUrl = rawUrl;
const concurrency = parseInt(process.argv[3] || '25', 10);
const durationSeconds = parseInt(process.argv[4] || '300', 10);

if (!targetUrl) {
  console.error('Usage: node load-test/load.js <ALB_URL> [CONCURRENCY] [DURATION_SECONDS]');
  console.error('Example: node load-test/load.js http://cloudfridge-alb-123456789.eu-west-1.elb.amazonaws.com 25 300');
  process.exit(1);
}

const loginEndpoint = `${targetUrl.replace(/\/+$/, '')}/api/auth/login`;
console.log(`Starting load test against: ${loginEndpoint}`);
console.log(`Concurrency: ${concurrency} workers | Duration: ${durationSeconds} seconds (~${Math.round(durationSeconds / 60)} mins)`);
console.log(`Target tracking policy will scale out backend ASG when CPU > 50%.\n`);

let totalRequests = 0;
let totalErrors = 0;
let running = true;

const startTime = Date.now();
const endTime = startTime + durationSeconds * 1000;

async function worker() {
  const payload = JSON.stringify({
    email: 'loadtest@cloudfridge.internal',
    password: 'Password123!',
  });

  while (running && Date.now() < endTime) {
    try {
      const res = await fetch(loginEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: AbortSignal.timeout(10000),
      });
      // 401 is expected (wrong credentials), but proves bcrypt ran on the backend
      if (res.status === 401 || res.ok) {
        totalRequests++;
      } else {
        if (totalErrors === 0) console.error(`[Load Test] Warning: unexpected HTTP status ${res.status}`);
        totalErrors++;
      }
    } catch (err) {
      if (totalErrors === 0) console.error(`[Load Test] Connection error: ${err.message}`);
      totalErrors++;
    }
  }
}

// Progress reporter every 5 seconds
const interval = setInterval(() => {
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const remaining = Math.max(0, durationSeconds - elapsed);
  const rps = (totalRequests / Math.max(1, elapsed)).toFixed(1);
  console.log(`[${elapsed}s / ${durationSeconds}s remaining: ${remaining}s] Requests: ${totalRequests} (${rps} req/s) | Errors: ${totalErrors}`);
}, 5000);

// Launch concurrent workers
const workers = Array.from({ length: concurrency }, () => worker());

Promise.all(workers).then(() => {
  running = false;
  clearInterval(interval);
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n--- Load Test Finished ---');
  console.log(`Total duration: ${totalTime}s`);
  console.log(`Total requests: ${totalRequests}`);
  console.log(`Total errors:   ${totalErrors}`);
  console.log(`Average rate:   ${(totalRequests / totalTime).toFixed(1)} req/s`);
  console.log('Now check CloudWatch metrics (p6-scaling.png) and ASG Activity history (p6-asg-activity.png)!');
});

process.on('SIGINT', () => {
  console.log('\nStopping load test early...');
  running = false;
});

