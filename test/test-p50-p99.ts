import {
  DEFAULT_HIST_EDGES,
  INTENDED_MIXTURE,
  NAIVE_MIXTURE,
  P50_P99_CHALLENGE,
  TARGET_MEAN_MS,
  challengePass,
  fastForTargetMean,
  histogram,
  mixtureMean,
  percentile,
  presetMixture,
  sampleMixture,
  summarizeLatencies,
} from '../src/lib/p50-p99.ts';

let fails = 0;
const check = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ` ${extra}` : ''}`);
  if (!cond) fails++;
};

// 1) percentile 계약 (engine과 같은 floor 방식)
check('빈 배열 percentile = 0', percentile([], 0.99) === 0);
check(
  '10개 표본 p50',
  percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.5) === 6,
  `got=${percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.5)}`,
);

// 2) 혼합 평균
const naiveMean = mixtureMean(NAIVE_MIXTURE);
check('순진한 혼합 평균 = 100', Math.abs(naiveMean - 100) < 1e-9, `mean=${naiveMean}`);

const intendedMean = mixtureMean(INTENDED_MIXTURE);
check(
  '의도한 혼합 평균 = 100',
  Math.abs(intendedMean - 100) < 1e-9,
  `mean=${intendedMean}`,
);

// 3) 같은 평균, 다른 꼬리 프리셋
const tight = presetMixture('tight');
const heavy = presetMixture('heavy');
check('tight 평균 = 목표', Math.abs(mixtureMean(tight) - TARGET_MEAN_MS) < 1e-9);
check('heavy 평균 = 목표', Math.abs(mixtureMean(heavy) - TARGET_MEAN_MS) < 1e-6);

const tightSum = summarizeLatencies(
  sampleMixture(tight, P50_P99_CHALLENGE.sampleCount, P50_P99_CHALLENGE.seed),
);
const heavySum = summarizeLatencies(
  sampleMixture(heavy, P50_P99_CHALLENGE.sampleCount, P50_P99_CHALLENGE.seed + 1),
);
check(
  'tight: 평균≈p50≈p99',
  Math.abs(tightSum.mean - tightSum.p50) < 1 && Math.abs(tightSum.p50 - tightSum.p99) < 1,
  `mean=${tightSum.mean} p50=${tightSum.p50} p99=${tightSum.p99}`,
);
check(
  'heavy: 평균은 비슷한데 p99는 훨씬 큼',
  Math.abs(heavySum.mean - TARGET_MEAN_MS) < 5 && heavySum.p99 >= TARGET_MEAN_MS * 10,
  `mean=${heavySum.mean.toFixed(1)} p99=${heavySum.p99}`,
);
check(
  '두 분포 평균 차이 < 5ms',
  Math.abs(tightSum.mean - heavySum.mean) < 5,
  `Δ=${Math.abs(tightSum.mean - heavySum.mean).toFixed(2)}`,
);

// 4) 평균 고정 역산
const fast = fastForTargetMean(100, 2100, 2);
check('역산 fast ≈ 59.18', fast != null && Math.abs(fast - 59.183673) < 1e-3, `fast=${fast}`);
check('불가능한 꼬리는 null', fastForTargetMean(100, 10_000, 5) == null);

// 5) 재현성
const a = sampleMixture(heavy, 200, 42);
const b = sampleMixture(heavy, 200, 42);
check(
  '같은 시드 → 같은 표본',
  a.length === b.length && a.every((v, i) => v === b[i]),
);

// 6) histogram
const bins = histogram([10, 60, 90, 500, 2000], [...DEFAULT_HIST_EDGES]);
const total = bins.reduce((n, bin) => n + bin.count, 0);
check('histogram 합 = 표본 수', total === 5, `total=${total}`);

// 7) 챌린지: 순진한 해법 실패, 의도한 해법 통과
const { sampleCount, seed, meanLimitMs, p99LimitMs } = P50_P99_CHALLENGE;
const naiveSum = summarizeLatencies(sampleMixture(NAIVE_MIXTURE, sampleCount, seed));
const intendedSum = summarizeLatencies(sampleMixture(INTENDED_MIXTURE, sampleCount, seed + 7));

check(
  '순진한 해법 평균은 통과선 안',
  naiveSum.mean <= meanLimitMs + 1,
  `mean=${naiveSum.mean.toFixed(2)}`,
);
check(
  '순진한 해법 p99는 실패',
  !challengePass(naiveSum, NAIVE_MIXTURE) && naiveSum.p99 > p99LimitMs,
  `p99=${naiveSum.p99}`,
);
check(
  '의도한 해법 통과',
  challengePass(intendedSum, INTENDED_MIXTURE),
  `mean=${intendedSum.mean.toFixed(2)} p99=${intendedSum.p99}`,
);
check(
  'slowPct 상한 초과는 실격',
  !challengePass({ mean: 50, p99: 100 }, { ...INTENDED_MIXTURE, slowPct: 6 }),
);

console.log(fails === 0 ? '\n전체 통과' : `\n${fails}개 실패`);
process.exit(fails ? 1 : 0);
