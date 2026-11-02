import os from 'node:os';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 16) throw new Error('JWT_SECRET must be at least 16 characters');

const dbSsl = process.env.DB_SSL || (nodeEnv === 'production' ? 'verify' : 'off');
if (!['off', 'verify'].includes(dbSsl)) throw new Error('DB_SSL must be "off" or "verify"');

export const config = {
  nodeEnv,
  port: Number(process.env.PORT || 3000),
  databaseUrl: required('DATABASE_URL'),
  dbSsl,
  jwtSecret,
  jwtExpiresIn: '24h',
  // One worker per vCPU, so a t3.micro can actually reach the CPU scaling target.
  workers: Number(process.env.WORKERS || os.availableParallelism()),
  poolMax: 5,
};
