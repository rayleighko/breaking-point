import type { ServiceDist, SimConfig } from '@/lib/engine';

export const SCHEMA_VERSION = 1 as const;

export interface TrafficPhase {
  atMs: number;
  arrivalRate: number;
}

export interface QueueingScenario {
  schemaVersion: typeof SCHEMA_VERSION;
  engine: 'queueing.v1';
  title: string;
  durationMs: number;
  seed: number;
  traffic: { phases: TrafficPhase[] };
  service: { meanMs: number; distribution: ServiceDist };
  capacity: { workers: number; queueLimit: number };
  policies: {
    acquireTimeoutMs: number;
    retry: { enabled: boolean; maxAttempts: number; backoffMs: number };
  };
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  scenario?: QueueingScenario;
}

export function validateScenario(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['JSON 최상위 값은 object여야 합니다.'] };
  const at = (key: string) => input[key];
  if (at('schemaVersion') !== SCHEMA_VERSION)
    errors.push(`schemaVersion은 ${SCHEMA_VERSION}이어야 합니다.`);
  if (at('engine') !== 'queueing.v1') errors.push('현재 지원하는 engine은 queueing.v1입니다.');
  if (typeof at('title') !== 'string' || !at('title')) errors.push('title을 입력해 주세요.');
  range(at('durationMs'), 1_000, 120_000, 'durationMs', errors);
  integer(at('seed'), 0, 4_294_967_295, 'seed', errors);

  const traffic = record(at('traffic'), 'traffic', errors);
  const phases = traffic && Array.isArray(traffic.phases) ? traffic.phases : null;
  if (!phases?.length) errors.push('traffic.phases에는 하나 이상의 phase가 필요합니다.');
  phases?.forEach((phase, index) => {
    const p = record(phase, `traffic.phases[${index}]`, errors);
    if (!p) return;
    integer(
      p.atMs,
      0,
      Number(at('durationMs')) || 120_000,
      `traffic.phases[${index}].atMs`,
      errors,
    );
    range(p.arrivalRate, 0, 10_000, `traffic.phases[${index}].arrivalRate`, errors);
    if (index === 0 && p.atMs !== 0) errors.push('첫 traffic phase의 atMs는 0이어야 합니다.');
    const previousAtMs =
      index > 0 && isRecord(phases[index - 1]) ? phases[index - 1].atMs : undefined;
    if (
      index > 0 &&
      typeof p.atMs === 'number' &&
      typeof previousAtMs === 'number' &&
      p.atMs <= previousAtMs
    ) {
      errors.push('traffic phase는 atMs 오름차순이어야 합니다.');
    }
  });

  const service = record(at('service'), 'service', errors);
  if (service) {
    range(service.meanMs, 1, 60_000, 'service.meanMs', errors);
    if (service.distribution !== 'fixed' && service.distribution !== 'exponential')
      errors.push('service.distribution은 fixed 또는 exponential이어야 합니다.');
  }
  const capacity = record(at('capacity'), 'capacity', errors);
  if (capacity) {
    integer(capacity.workers, 1, 1_000, 'capacity.workers', errors);
    integer(capacity.queueLimit, 1, 100_000, 'capacity.queueLimit', errors);
  }
  const policies = record(at('policies'), 'policies', errors);
  if (policies) {
    range(policies.acquireTimeoutMs, 1, 120_000, 'policies.acquireTimeoutMs', errors);
    const retry = record(policies.retry, 'policies.retry', errors);
    if (retry) {
      if (typeof retry.enabled !== 'boolean')
        errors.push('policies.retry.enabled는 boolean이어야 합니다.');
      integer(retry.maxAttempts, 1, 10, 'policies.retry.maxAttempts', errors);
      range(retry.backoffMs, 0, 60_000, 'policies.retry.backoffMs', errors);
    }
  }
  return errors.length
    ? { ok: false, errors }
    : { ok: true, errors, scenario: input as unknown as QueueingScenario };
}

export function toSimConfig(s: QueueingScenario): Partial<SimConfig> {
  return {
    arrivalRate: s.traffic.phases[0]!.arrivalRate,
    serviceTime: s.service.meanMs,
    serviceDist: s.service.distribution,
    poolSize: s.capacity.workers,
    queueLimit: s.capacity.queueLimit,
    acquireTimeout: s.policies.acquireTimeoutMs,
    retry: s.policies.retry.enabled,
    maxAttempts: s.policies.retry.maxAttempts,
    retryBackoff: s.policies.retry.backoffMs,
  };
}

export function rateAt(s: QueueingScenario, now: number): number {
  let rate = s.traffic.phases[0]!.arrivalRate;
  for (const phase of s.traffic.phases) {
    if (phase.atMs > now) break;
    rate = phase.arrivalRate;
  }
  return rate;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function record(v: unknown, name: string, errors: string[]) {
  if (!isRecord(v)) {
    errors.push(`${name}은 object여야 합니다.`);
    return null;
  }
  return v;
}
function range(v: unknown, min: number, max: number, name: string, errors: string[]) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max)
    errors.push(`${name}은 ${min}~${max} 범위의 숫자여야 합니다.`);
}
function integer(v: unknown, min: number, max: number, name: string, errors: string[]) {
  range(v, min, max, name, errors);
  if (typeof v === 'number' && !Number.isInteger(v)) errors.push(`${name}은 정수여야 합니다.`);
}
