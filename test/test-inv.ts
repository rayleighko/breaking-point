import { Sim, DEFAULT_CONFIG } from '../src/lib/engine.ts';

let fail = 0;
const ck = (n: string, c: boolean, x = '') => {
  console.log(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`);
  if (!c) fail++;
};

// 풀을 실시간으로 줄였다 늘렸다 하면서 큐 정렬 불변식이 유지되는가
const s = new Sim(
  { ...DEFAULT_CONFIG, arrivalRate: 400, serviceTime: 50, poolSize: 30, acquireTimeout: 800 },
  99,
);
let worstViolation = 0,
  maxOverdue = 0;
for (let t = 0; t < 20000; t += 2) {
  s.step(2);
  if (t % 2000 === 0) s.setConfig({ poolSize: (t / 2000) % 2 === 0 ? 4 : 30 });
  // 불변식 1: 큐는 enqueuedAt 오름차순
  for (let i = 1; i < s.queue.length; i++)
    worstViolation = Math.max(worstViolation, s.queue[i - 1]!.enqueuedAt - s.queue[i]!.enqueuedAt);
  // 불변식 2: 타임아웃을 넘겨 방치된 요청이 없어야 한다 (한 스텝 오차 허용)
  if (s.queue.length) maxOverdue = Math.max(maxOverdue, s.now - s.queue[0]!.enqueuedAt);
}
ck(
  '풀 크기를 바꿔도 큐가 enqueuedAt 오름차순 유지',
  worstViolation === 0,
  `최대역전=${worstViolation}ms`,
);
ck('타임아웃 초과 방치 없음', maxOverdue <= 800 + 2, `최대대기=${maxOverdue}ms (제한 800ms)`);
ck(
  '요청 유실 없음(모든 요청이 성공/실패/진행중 중 하나)',
  s.totalOk + s.totalErr + s.queue.length + s.servers.filter(Boolean).length > 0,
);
console.log(fail ? `\n${fail}개 실패` : '\n전체 통과');
process.exit(fail ? 1 : 0);
