import { Sim, theory, DEFAULT_CONFIG } from '../src/lib/engine.ts';

function run(cfg: any, seconds = 30) {
  const s = new Sim(cfg, 42);
  const dt = 2;
  for (let t = 0; t < seconds * 1000; t += dt) s.step(dt);
  return s.stats();
}

let fails = 0;
const check = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
  if (!cond) fails++;
};

// 1) 여유 있는 풀: 에러 0, p99 ~ 처리시간 수준
const a = run({ arrivalRate: 100, serviceTime: 50, poolSize: 20, serviceDist: 'fixed' });
check('여유 풀 → 에러 없음', a.errorRate === 0, `err=${a.errorRate}`);
check(
  '여유 풀 → 처리량 ≈ 도착률',
  Math.abs(a.throughput - 100) < 12,
  `tp=${a.throughput.toFixed(1)}`,
);
check('여유 풀 → p99 낮음', a.p99 < 200, `p99=${a.p99.toFixed(0)}ms`);

// 2) 부족한 풀: 큐 폭발 + 타임아웃 에러
const b = run({
  arrivalRate: 200,
  serviceTime: 50,
  poolSize: 5,
  serviceDist: 'fixed',
  acquireTimeout: 1000,
});
check('부족한 풀 → 에러 발생', b.errorRate > 0.3, `err=${(b.errorRate * 100).toFixed(1)}%`);
check(
  '부족한 풀 → 처리량 상한 = pool/S',
  Math.abs(b.throughput - 100) < 15,
  `tp=${b.throughput.toFixed(1)} (이론 100)`,
);
check('부족한 풀 → 큐 참', b.queueLen > 50, `q=${b.queueLen}`);

// 3) 리트라이가 부하를 증폭시키는가
const noRetry = run({
  arrivalRate: 200,
  serviceTime: 50,
  poolSize: 5,
  serviceDist: 'fixed',
  retry: false,
});
const withRetry = run({
  arrivalRate: 200,
  serviceTime: 50,
  poolSize: 5,
  serviceDist: 'fixed',
  retry: true,
  maxAttempts: 3,
});
check(
  '리트라이 → 실효 도착률 증가',
  withRetry.effectiveArrival > noRetry.effectiveArrival * 1.2,
  `${noRetry.effectiveArrival.toFixed(0)} → ${withRetry.effectiveArrival.toFixed(0)} rps`,
);

// 4) 리틀의 법칙 계산
const t1 = theory({ ...DEFAULT_CONFIG, arrivalRate: 200, serviceTime: 50, poolSize: 10 });
check('리틀의 법칙 needed = λ×S', Math.abs(t1.needed - 10) < 1e-9, `needed=${t1.needed}`);
check('ρ=1.0 → over', t1.rho === 1 && t1.verdict === 'over', `rho=${t1.rho}`);
const t2 = theory({ ...DEFAULT_CONFIG, arrivalRate: 200, serviceTime: 50, poolSize: 25 });
check(
  '여유 → safe & 대기 유한',
  t2.verdict === 'safe' && isFinite(t2.expectedWait),
  `wait=${t2.expectedWait.toFixed(1)}ms`,
);

// 5) 풀 크기 실시간 변경 시 처리 중 요청 유실 없음
const s = new Sim({ arrivalRate: 300, serviceTime: 50, poolSize: 20 }, 7);
for (let t = 0; t < 5000; t += 2) s.step(2);
const before = s.stats().totalOk;
s.setConfig({ poolSize: 4 });
for (let t = 0; t < 3000; t += 2) s.step(2);
check('풀 축소 후에도 진행됨', s.stats().totalOk > before, `${before} → ${s.stats().totalOk}`);
check('슬롯 수 == poolSize', s.servers.length === 4, `${s.servers.length}`);

// 6) 결정론 (같은 시드 = 같은 결과)
const r1 = run({ arrivalRate: 150, serviceTime: 40, poolSize: 8 }, 10);
const r2 = run({ arrivalRate: 150, serviceTime: 40, poolSize: 8 }, 10);
check(
  '시드 고정 → 재현 가능',
  r1.totalOk === r2.totalOk && r1.totalErr === r2.totalErr,
  `${r1.totalOk}/${r1.totalErr}`,
);

// 7) 성능: 60초 시뮬이 충분히 빠른가
const t0 = Date.now();
run({ arrivalRate: 2000, serviceTime: 50, poolSize: 30 }, 60);
const ms = Date.now() - t0;
check('고부하 60초 시뮬 < 3초', ms < 3000, `${ms}ms`);

console.log(fails === 0 ? '\n전체 통과' : `\n${fails}개 실패`);
process.exit(fails ? 1 : 0);
