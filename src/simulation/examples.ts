import type { QueueingScenario } from './schema';

export const SPIKE_EXAMPLE: QueueingScenario = {
  schemaVersion: 1,
  engine: 'queueing.v1',
  title: '이벤트 트래픽과 DB connection pool',
  durationMs: 30_000,
  seed: 2024,
  traffic: {
    phases: [
      { atMs: 0, arrivalRate: 80 },
      { atMs: 8_000, arrivalRate: 400 },
      { atMs: 22_000, arrivalRate: 80 },
    ],
  },
  service: { meanMs: 50, distribution: 'exponential' },
  capacity: { workers: 10, queueLimit: 3_000 },
  policies: { acquireTimeoutMs: 2_000, retry: { enabled: false, maxAttempts: 3, backoffMs: 200 } },
};
