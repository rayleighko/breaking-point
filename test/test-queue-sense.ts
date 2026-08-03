import { DEFAULT_CONFIG, Sim, theory } from '../src/lib/engine.ts';
import {
  QUEUE_SENSE_CHALLENGE,
  arrivalForUtilization,
  challengePass,
  configForUtilization,
  queueSenseChallengeRateAt,
  waitAtUtilization,
  waitCurvePoints,
} from '../src/lib/queue-sense.ts';

let fails = 0;
const check = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ` ${extra}` : ''}`);
  if (!cond) fails++;
};

const pool = 5;
const serviceTime = 50;

// 1) 이용률 → 도착률 역산
const a70 = arrivalForUtilization(0.7, pool, serviceTime);
const a95 = arrivalForUtilization(0.95, pool, serviceTime);
check('70% 도착률 = 70', Math.abs(a70 - 70) < 1e-9, `λ=${a70}`);
check('95% 도착률 = 95', Math.abs(a95 - 95) < 1e-9, `λ=${a95}`);

// 2) 70% vs 95% 대기시간 무릎
const w70 = waitAtUtilization(0.7, pool, serviceTime);
const w95 = waitAtUtilization(0.95, pool, serviceTime);
check('70% 대기 유한', Number.isFinite(w70) && w70 > 0, `w=${w70.toFixed(2)}ms`);
check('95% 대기 유한', Number.isFinite(w95) && w95 > 0, `w=${w95.toFixed(2)}ms`);
check('95% 대기가 70%보다 8배 이상', w95 / w70 >= 8, `ratio=${(w95 / w70).toFixed(1)}`);

// 3) 곡선 단조성
const curve = waitCurvePoints({ poolSize: pool, serviceTimeMs: serviceTime, step: 0.02 });
let mono = true;
for (let i = 1; i < curve.length; i++) {
  if (curve[i]!.waitMs + 1e-9 < curve[i - 1]!.waitMs) mono = false;
}
check('대기 곡선 단조 증가', mono && curve.length > 10, `n=${curve.length}`);

// 4) theory verdict 경계
const safe = theory(configForUtilization(0.7, pool, serviceTime));
const tight = theory(configForUtilization(0.85, pool, serviceTime));
check('ρ=0.7 → safe', safe.verdict === 'safe', safe.verdict);
check('ρ=0.85 → tight', tight.verdict === 'tight', tight.verdict);

// 5) 챌린지: 순진한 해법 실패, 의도한 해법 통과
const { runMs, baseRps, seed, poolMax, p99LimitMs } = QUEUE_SENSE_CHALLENGE;

function play(poolSize: number, svc: number) {
  const sim = new Sim(
    {
      ...DEFAULT_CONFIG,
      arrivalRate: baseRps,
      serviceTime: svc,
      serviceDist: 'exponential',
      poolSize,
      acquireTimeout: 2000,
      retry: false,
    },
    seed,
  );
  let worst = 0;
  for (let t = 0; t < runMs; t += 2) {
    sim.step(2, queueSenseChallengeRateAt(sim.now));
    if (t % 100 === 0 && t > 3000) worst = Math.max(worst, sim.stats().p99);
  }
  const s = sim.stats();
  const tot = s.totalOk + s.totalErr;
  const err = tot ? s.totalErr / tot : 0;
  return {
    err,
    p99: worst,
    pool: poolSize,
    pass: challengePass({ err, p99: worst, pool: poolSize }),
  };
}

const naive = play(poolMax, 50);
const intended = play(poolMax, 35);
check(
  '순진한 해법(풀 최대·50ms) 실패',
  !naive.pass && naive.p99 >= p99LimitMs,
  `p99=${Math.round(naive.p99)}ms`,
);
check(
  '의도한 해법(풀 최대·35ms) 통과',
  intended.pass,
  `p99=${Math.round(intended.p99)}ms err=${(intended.err * 100).toFixed(2)}%`,
);
check('풀 초과는 실격', !challengePass({ err: 0, p99: 100, pool: poolMax + 1 }));

console.log(fails === 0 ? '\n전체 통과' : `\n${fails}개 실패`);
process.exit(fails ? 1 : 0);
