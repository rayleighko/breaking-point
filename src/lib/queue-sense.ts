/**
 * Queue의 감각 랩용 순수 계산.
 * UI는 이 함수의 결과만 그리고, 이용률→대기시간 규칙을 component 안에 두지 않는다.
 */

import { DEFAULT_CONFIG, theory, type SimConfig } from './engine.ts';

export const QUEUE_SENSE_POOL = 5;
export const QUEUE_SENSE_SERVICE_MS = 50;

/** 챌린지 traffic profile (ms 기준 timeline) */
export const QUEUE_SENSE_CHALLENGE = {
  seed: 2025,
  runMs: 40_000,
  baseRps: 140,
  peakRps: 196,
  poolMax: 10,
  p99LimitMs: 250,
  errorLimit: 0.01,
} as const;

export function arrivalForUtilization(
  rho: number,
  poolSize: number,
  serviceTimeMs: number,
): number {
  return (Math.max(0, rho) * poolSize * 1000) / serviceTimeMs;
}

export function configForUtilization(
  rho: number,
  poolSize = QUEUE_SENSE_POOL,
  serviceTimeMs = QUEUE_SENSE_SERVICE_MS,
): SimConfig {
  return {
    ...DEFAULT_CONFIG,
    arrivalRate: arrivalForUtilization(rho, poolSize, serviceTimeMs),
    serviceTime: serviceTimeMs,
    poolSize,
    serviceDist: 'exponential',
    retry: false,
    acquireTimeout: 3000,
  };
}

export interface WaitCurvePoint {
  rho: number;
  waitMs: number;
}

/** ρ 구간의 이론 대기시간 곡선. ρ≥1 은 제외한다. */
export function waitCurvePoints(opts: {
  poolSize: number;
  serviceTimeMs: number;
  from?: number;
  to?: number;
  step?: number;
}): WaitCurvePoint[] {
  const from = opts.from ?? 0.1;
  const to = opts.to ?? 0.98;
  const step = opts.step ?? 0.01;
  const points: WaitCurvePoint[] = [];
  for (let rho = from; rho <= to + 1e-9; rho += step) {
    const cfg = configForUtilization(rho, opts.poolSize, opts.serviceTimeMs);
    const wait = theory(cfg).expectedWait;
    if (!Number.isFinite(wait)) break;
    points.push({ rho, waitMs: wait });
  }
  return points;
}

export function waitAtUtilization(rho: number, poolSize: number, serviceTimeMs: number): number {
  return theory(configForUtilization(rho, poolSize, serviceTimeMs)).expectedWait;
}

/** 챌린지 시각별 도착률 */
export function queueSenseChallengeRateAt(tMs: number): number {
  const { baseRps, peakRps } = QUEUE_SENSE_CHALLENGE;
  const s = tMs / 1000;
  if (s < 8) return baseRps;
  if (s < 10) return baseRps + (peakRps - baseRps) * ((s - 8) / 2);
  if (s < 25) return peakRps;
  if (s < 27) return peakRps - (peakRps - baseRps) * ((s - 25) / 2);
  return baseRps;
}

export function challengePass(result: { err: number; p99: number; pool: number }): boolean {
  const { errorLimit, p99LimitMs, poolMax } = QUEUE_SENSE_CHALLENGE;
  return result.err < errorLimit && result.p99 < p99LimitMs && result.pool <= poolMax;
}
