import { Sim, DEFAULT_CONFIG } from '../src/lib/engine.ts';

const RUN = 45000,
  BASE = 80,
  PEAK = 400;
function rateAt(t: number) {
  const s = t / 1000;
  if (s < 10) return BASE;
  if (s < 12) return BASE + (PEAK - BASE) * ((s - 10) / 2);
  if (s < 30) return PEAK;
  if (s < 33) return PEAK - (PEAK - BASE) * ((s - 30) / 3);
  return BASE;
}

function play(pool: number, serviceTime: number, retry: boolean, to = 2000) {
  const sim = new Sim(
    {
      ...DEFAULT_CONFIG,
      arrivalRate: BASE,
      serviceTime,
      serviceDist: 'exponential',
      poolSize: pool,
      acquireTimeout: to,
      retry,
      maxAttempts: 3,
    },
    2024,
  );
  let worst = 0;
  for (let t = 0; t < RUN; t += 2) {
    sim.step(2, rateAt(sim.now));
    if (t % 100 === 0 && t > 3000) worst = Math.max(worst, sim.stats().p99);
  }
  const s = sim.stats();
  const tot = s.totalOk + s.totalErr;
  const err = tot ? s.totalErr / tot : 0;
  return { err, p99: worst, pass: err < 0.01 && worst < 500 && pool <= 20 };
}
const rows = [
  ['풀 10 + 손 안 댐(50ms)', play(10, 50, false)],
  ['풀 20 + 손 안 댐(50ms)  ρ=1.0', play(20, 50, false)],
  ['풀 20 + 재시도 켬', play(20, 50, true)],
  ['풀 20 + 인덱스(20ms) ρ=0.4', play(20, 20, false)],
  ['풀 12 + 인덱스(20ms) ρ=0.67', play(12, 20, false)],
  ['풀 10 + 캐시(8ms)    ρ=0.32', play(10, 8, false)],
  ['풀 5  + 캐시(8ms)    ρ=0.64', play(5, 8, false)],
] as const;
for (const [n, r] of rows)
  console.log(
    `${r.pass ? '통과' : '실패'}  ${n.padEnd(30)} err=${(r.err * 100).toFixed(2).padStart(6)}%  worstP99=${Math.round(r.p99).toString().padStart(5)}ms`,
  );
