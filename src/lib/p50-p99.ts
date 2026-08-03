/**
 * p50과 p99 랩용 순수 계산.
 * 같은 평균·다른 꼬리를 표본으로 만들고, UI는 결과만 그린다.
 */

/** 모니터에 자주 걸리는 “괜찮은 평균” 목표 (ms) */
export const TARGET_MEAN_MS = 100;

/** 챌린지 통과 기준 */
export const P50_P99_CHALLENGE = {
  seed: 5050,
  sampleCount: 10_000,
  meanLimitMs: 100,
  p99LimitMs: 400,
  /** 느린 요청 비율 상한 (%). 자원(여기선 꼬리 비중)만 늘리는 식의 해법을 막는다. */
  slowPctMax: 5,
  fastMsMin: 10,
  fastMsMax: 200,
  slowMsMin: 100,
  slowMsMax: 10_000,
} as const;

export type DistKind = 'tight' | 'heavy';

export interface LatencySummary {
  count: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

export interface MixtureConfig {
  /** 빠른 요청 응답시간 (ms) */
  fastMs: number;
  /** 느린 요청 응답시간 (ms) */
  slowMs: number;
  /** 느린 요청 비율 0~100 */
  slowPct: number;
}

export interface HistBin {
  /** bin 시작 (ms) */
  from: number;
  /** bin 끝 (ms, exclusive except last) */
  to: number;
  count: number;
}

/** 시드 고정 난수 (mulberry32) */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mixtureMean(cfg: MixtureConfig): number {
  const p = clamp(cfg.slowPct, 0, 100) / 100;
  return cfg.fastMs * (1 - p) + cfg.slowMs * p;
}

/**
 * 평균을 고정한 채 꼬리(slow)와 비율이 주어지면 빠른 쪽 값을 역산한다.
 * 불가능한 조합이면 null.
 */
export function fastForTargetMean(
  targetMean: number,
  slowMs: number,
  slowPct: number,
): number | null {
  const p = clamp(slowPct, 0, 100) / 100;
  if (p <= 0) return targetMean;
  if (p >= 1) return slowMs === targetMean ? targetMean : null;
  const fast = (targetMean - slowMs * p) / (1 - p);
  if (!Number.isFinite(fast) || fast <= 0) return null;
  return fast;
}

/** 정렬된 배열의 percentile. p는 0~1. */
export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.floor(clamp(p, 0, 1) * sorted.length));
  return sorted[i]!;
}

export function summarizeLatencies(samples: number[]): LatencySummary {
  if (!samples.length) {
    return { count: 0, mean: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    mean: sum / sorted.length,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
  };
}

/**
 * 이산 혼합 분포에서 표본 추출.
 * 느린 요청 개수를 round(n×p)로 고정한 뒤 시드로 섞어, 같은 시드·설정이면 percentile이 재현된다.
 */
export function sampleMixture(cfg: MixtureConfig, count: number, seed: number): number[] {
  const rng = makeRng(seed);
  const p = clamp(cfg.slowPct, 0, 100) / 100;
  const slowCount = Math.min(count, Math.max(0, Math.round(count * p)));
  const out = new Array<number>(count);
  for (let i = 0; i < count; i++) {
    out[i] = i < slowCount ? cfg.slowMs : cfg.fastMs;
  }
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

/** 랩 프리셋: 같은 평균, 다른 꼬리 */
export function presetMixture(kind: DistKind, targetMean = TARGET_MEAN_MS): MixtureConfig {
  if (kind === 'tight') {
    return { fastMs: targetMean, slowMs: targetMean, slowPct: 0 };
  }
  // 평균 100, 2%가 2100ms → 빠른 쪽 ≈ 59.18ms. 평균은 같고 p99만 폭발.
  const slowMs = targetMean * 21;
  const slowPct = 2;
  const fast = fastForTargetMean(targetMean, slowMs, slowPct);
  return {
    fastMs: fast ?? targetMean * 0.59,
    slowMs,
    slowPct,
  };
}

export function histogram(samples: number[], edges: number[]): HistBin[] {
  if (edges.length < 2) return [];
  const bins: HistBin[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    bins.push({ from: edges[i]!, to: edges[i + 1]!, count: 0 });
  }
  for (const v of samples) {
    let placed = false;
    for (let i = 0; i < bins.length; i++) {
      const b = bins[i]!;
      const last = i === bins.length - 1;
      if (v >= b.from && (last ? v <= b.to : v < b.to)) {
        b.count++;
        placed = true;
        break;
      }
    }
    if (!placed) {
      if (v < bins[0]!.from) bins[0]!.count++;
      else bins[bins.length - 1]!.count++;
    }
  }
  return bins;
}

/** 로그에 가까운 고정 bin 경계 (ms). UI와 test가 공유한다. */
export const DEFAULT_HIST_EDGES = [
  0, 25, 50, 75, 100, 150, 200, 400, 800, 1600, 3200, 6400,
] as const;

export function challengePass(
  summary: Pick<LatencySummary, 'mean' | 'p99'>,
  cfg: MixtureConfig,
): boolean {
  const { meanLimitMs, p99LimitMs, slowPctMax, fastMsMin, fastMsMax, slowMsMin, slowMsMax } =
    P50_P99_CHALLENGE;
  if (cfg.slowPct < 0 || cfg.slowPct > slowPctMax) return false;
  if (cfg.fastMs < fastMsMin || cfg.fastMs > fastMsMax) return false;
  if (cfg.slowMs < slowMsMin || cfg.slowMs > slowMsMax) return false;
  return summary.mean <= meanLimitMs + 1e-6 && summary.p99 < p99LimitMs + 1e-6;
}

/** 순진한 해법: 평균만 맞추고 1% 꼬리를 극단적으로 키움 */
export const NAIVE_MIXTURE: MixtureConfig = {
  fastMs: 50,
  slowMs: 5050,
  slowPct: 1,
};

/** 의도한 해법: 평균은 맞추되 꼬리 높이를 자름 (90×0.95 + 290×0.05 = 100) */
export const INTENDED_MIXTURE: MixtureConfig = {
  fastMs: 90,
  slowMs: 290,
  slowPct: 5,
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
