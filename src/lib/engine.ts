/**
 * Queue(대기열) 시뮬레이터.
 *
 * 현실 대응:
 *   손님(요청)  → 은행 창구(DB 커넥션)에서 처리 → 나감
 *   창구 수     = 커넥션 풀 크기 (poolSize)
 *   처리 시간   = 쿼리 실행 시간 (serviceTime)
 *   대기줄      = 커넥션 대기 큐
 *   못 참고 감  = acquire timeout (에러)
 *   다시 옴     = 클라이언트 재시도 (retry) → 부하 증폭
 *
 * 고정 스텝(dt) 방식이라 코드가 단순하고, 시드 고정으로 결과가 재현된다.
 */

export type ServiceDist = 'fixed' | 'exponential';

export interface SimConfig {
  /** 초당 도착 요청 수 (RPS) */
  arrivalRate: number;
  /** 평균 처리 시간 (ms) */
  serviceTime: number;
  /** 처리 시간 분포. fixed = 항상 같음, exponential = 들쭉날쭉(현실적) */
  serviceDist: ServiceDist;
  /** 커넥션 풀 크기 */
  poolSize: number;
  /** 커넥션 획득 대기 제한 (ms). 넘으면 에러 */
  acquireTimeout: number;
  /** 실패 시 재시도 여부 */
  retry: boolean;
  /** 최대 시도 횟수 (retry=true 일 때) */
  maxAttempts: number;
  /** 재시도 백오프 (ms) */
  retryBackoff: number;
  /** 대기열 최대 길이. 넘으면 즉시 거절 */
  queueLimit: number;
}

export const DEFAULT_CONFIG: SimConfig = {
  arrivalRate: 100,
  serviceTime: 50,
  serviceDist: 'exponential',
  poolSize: 10,
  acquireTimeout: 2000,
  retry: false,
  maxAttempts: 3,
  retryBackoff: 200,
  queueLimit: 3000,
};

export interface Req {
  id: number;
  attempt: number;
  /** 사용자가 처음 요청한 시각 (체감 지연의 시작점) */
  bornAt: number;
  /** 이번 시도로 대기열에 들어간 시각 */
  enqueuedAt: number;
  startedAt: number | null;
  slot: number;
  /** 이 시도의 처리 종료 예정 시각 */
  doneAt: number;
}

export interface ExitEvent {
  id: number;
  at: number;
  ok: boolean;
  /** 타임아웃/거절 후 재시도로 다시 들어갈 예정인지 */
  willRetry: boolean;
  slot: number;
  fromQueue: boolean;
}

export interface Stats {
  /** 최근 창(window) 기준 초당 처리 완료 수 */
  throughput: number;
  /** 최근 창 기준 에러율 0~1 */
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
  queueLen: number;
  busy: number;
  /** 재시도 포함 실제 도착 RPS */
  effectiveArrival: number;
  totalOk: number;
  totalErr: number;
}

const WINDOW = 5000; // 지표 집계 창 (ms)

/** 시드 고정 난수 (mulberry32) — 같은 설정이면 같은 결과 */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Sim {
  cfg: SimConfig;
  now = 0;

  queue: Req[] = [];
  servers: (Req | null)[] = [];
  /** 최근 퇴장 이벤트 (애니메이션용, 짧게 유지) */
  exits: ExitEvent[] = [];

  private rng: () => number;
  private nextId = 1;
  private pendingRetries: { at: number; bornAt: number; attempt: number; id: number }[] = [];

  private lat: { t: number; v: number }[] = [];
  private oks: number[] = [];
  private errs: number[] = [];
  private arrivals: number[] = [];

  totalOk = 0;
  totalErr = 0;

  constructor(cfg: Partial<SimConfig> = {}, seed = 12345) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
    this.rng = makeRng(seed);
    this.resizePool(this.cfg.poolSize);
  }

  /** 설정 변경. 풀 크기 변경은 즉시 반영(창구를 늘리거나 줄인다). */
  setConfig(patch: Partial<SimConfig>) {
    const nextPool = patch.poolSize ?? this.cfg.poolSize;
    this.cfg = { ...this.cfg, ...patch };
    if (nextPool !== this.servers.length) this.resizePool(nextPool);
  }

  reset(seed = 12345) {
    this.now = 0;
    this.queue = [];
    this.exits = [];
    this.pendingRetries = [];
    this.lat = [];
    this.oks = [];
    this.errs = [];
    this.arrivals = [];
    this.totalOk = 0;
    this.totalErr = 0;
    this.nextId = 1;
    this.rng = makeRng(seed);
    this.servers = new Array(this.cfg.poolSize).fill(null);
  }

  private resizePool(n: number) {
    const old = this.servers;
    const next: (Req | null)[] = new Array(n).fill(null);
    // 처리 중이던 요청은 최대한 유지 (창구를 줄이면 넘치는 건 큐로 되돌린다)
    const overflow: Req[] = [];
    let k = 0;
    for (const r of old) {
      if (!r) continue;
      if (k < n) {
        r.slot = k;
        next[k] = r;
        k++;
      } else {
        r.startedAt = null;
        r.slot = -1;
        overflow.push(r);
      }
    }
    // 큐는 enqueuedAt 오름차순이어야 타임아웃 스윕(queue[0]만 검사)이 성립한다.
    // 되돌린 요청들은 원래 enqueuedAt 을 유지한 채 통째로 앞에 붙인다.
    if (overflow.length) {
      // 창구 슬롯 순서 != 도착 순서이므로 정렬해서 붙여야 불변식이 깨지지 않는다
      overflow.sort((a, b) => a.enqueuedAt - b.enqueuedAt);
      this.queue = overflow.concat(this.queue);
    }
    this.servers = next;
  }

  /** 처리 시간 표본 추출 */
  private sampleService(): number {
    const m = this.cfg.serviceTime;
    if (this.cfg.serviceDist === 'fixed') return m;
    // 지수분포: 평균 m, 가끔 아주 느린 쿼리가 나온다
    const u = Math.max(1e-9, this.rng());
    return Math.min(m * 8, -Math.log(u) * m);
  }

  /** 포아송 도착 수 (Knuth) */
  private samplePoisson(mean: number): number {
    if (mean <= 0) return 0;
    if (mean > 30) {
      // 정규 근사 (성능)
      const u1 = Math.max(1e-9, this.rng()),
        u2 = this.rng();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return Math.max(0, Math.round(mean + z * Math.sqrt(mean)));
    }
    const L = Math.exp(-mean);
    let k = 0,
      p = 1;
    do {
      k++;
      p *= this.rng();
    } while (p > L);
    return k - 1;
  }

  private admit(bornAt: number, attempt: number, id: number) {
    this.arrivals.push(this.now);
    if (this.queue.length >= this.cfg.queueLimit) {
      this.fail(id, bornAt, attempt, true);
      return;
    }
    this.queue.push({
      id,
      attempt,
      bornAt,
      enqueuedAt: this.now,
      startedAt: null,
      slot: -1,
      doneAt: 0,
    });
  }

  private fail(id: number, bornAt: number, attempt: number, fromQueue: boolean) {
    const canRetry = this.cfg.retry && attempt < this.cfg.maxAttempts;
    if (canRetry) {
      this.pendingRetries.push({
        at: this.now + this.cfg.retryBackoff,
        bornAt,
        attempt: attempt + 1,
        id,
      });
    } else {
      this.totalErr++;
      this.errs.push(this.now);
      this.lat.push({ t: this.now, v: this.now - bornAt });
    }
    this.exits.push({ id, at: this.now, ok: false, willRetry: canRetry, slot: -1, fromQueue });
  }

  /**
   * dt(ms) 만큼 시간을 진행시킨다.
   * @param rateOverride 시점별 도착률을 바꾸고 싶을 때 (트래픽 스파이크 시나리오)
   */
  step(dt: number, rateOverride?: number) {
    const t0 = this.now;
    this.now += dt;
    const rate = rateOverride ?? this.cfg.arrivalRate;

    // 1) 재시도 도착
    if (this.pendingRetries.length) {
      const due = this.pendingRetries.filter((r) => r.at <= this.now);
      if (due.length) {
        this.pendingRetries = this.pendingRetries.filter((r) => r.at > this.now);
        for (const r of due) this.admit(r.bornAt, r.attempt, r.id);
      }
    }

    // 2) 신규 도착 (포아송). 포아송은 가법적이라 스텝을 쪼개도 분포가 유지된다.
    const n = this.samplePoisson((rate * dt) / 1000);
    for (let i = 0; i < n; i++) this.admit(this.now, 1, this.nextId++);

    // 3) 처리 완료
    for (let s = 0; s < this.servers.length; s++) {
      const r = this.servers[s];
      if (r && r.doneAt <= this.now) {
        this.servers[s] = null;
        this.totalOk++;
        this.oks.push(this.now);
        this.lat.push({ t: this.now, v: this.now - r.bornAt });
        this.exits.push({
          id: r.id,
          at: this.now,
          ok: true,
          willRetry: false,
          slot: s,
          fromQueue: false,
        });
      }
    }

    // 4) 빈 창구에 대기열 배정 (FIFO). 타임아웃보다 먼저 — 방금 자리가 났으면 살려준다.
    for (let s = 0; s < this.servers.length && this.queue.length; s++) {
      if (this.servers[s]) continue;
      const r = this.queue.shift()!;
      r.startedAt = this.now;
      r.slot = s;
      r.doneAt = this.now + this.sampleService();
      this.servers[s] = r;
    }

    // 5) 남은 대기열 중 오래 기다린 것부터 타임아웃 (큐는 enqueuedAt 오름차순)
    const to = this.cfg.acquireTimeout;
    while (this.queue.length && this.now - this.queue[0]!.enqueuedAt >= to) {
      const r = this.queue.shift()!;
      this.fail(r.id, r.bornAt, r.attempt, true);
    }

    // 6) 오래된 기록 정리
    const cut = this.now - WINDOW;
    this.lat = pruneObj(this.lat, cut);
    this.oks = prune(this.oks, cut);
    this.errs = prune(this.errs, cut);
    this.arrivals = prune(this.arrivals, cut);
    this.exits = this.exits.filter((e) => this.now - e.at < 700);

    return t0;
  }

  stats(): Stats {
    const win = Math.min(WINDOW, Math.max(1, this.now)) / 1000;
    const ok = this.oks.length;
    const er = this.errs.length;
    const vals = this.lat.map((x) => x.v).sort((a, b) => a - b);
    return {
      throughput: ok / win,
      errorRate: ok + er === 0 ? 0 : er / (ok + er),
      p50: pct(vals, 0.5),
      p95: pct(vals, 0.95),
      p99: pct(vals, 0.99),
      queueLen: this.queue.length,
      busy: this.servers.reduce((n, s) => n + (s ? 1 : 0), 0),
      effectiveArrival: this.arrivals.length / win,
      totalOk: this.totalOk,
      totalErr: this.totalErr,
    };
  }

  /** 최근 지연시간 샘플 (그래프용) */
  latencySamples() {
    return this.lat;
  }
}

function prune(arr: number[], cut: number) {
  let i = 0;
  while (i < arr.length && arr[i]! < cut) i++;
  return i ? arr.slice(i) : arr;
}
function pruneObj(arr: { t: number; v: number }[], cut: number) {
  let i = 0;
  while (i < arr.length && arr[i]!.t < cut) i++;
  return i ? arr.slice(i) : arr;
}
function pct(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[i]!;
}

/* ── 이론값 계산 (리틀의 법칙) ───────────────────────────── */

export interface Theory {
  /** 필요한 최소 커넥션 수 = 도착률 × 처리시간 */
  needed: number;
  /** 이용률 ρ = needed / poolSize */
  rho: number;
  /** M/M/c 근사 대기시간 (ms). ρ>=1 이면 무한대 */
  expectedWait: number;
  verdict: 'safe' | 'tight' | 'over';
}

export function theory(cfg: SimConfig): Theory {
  const needed = (cfg.arrivalRate * cfg.serviceTime) / 1000;
  const c = cfg.poolSize;
  const rho = needed / c;
  let expectedWait = Infinity;
  if (rho < 1) {
    // Erlang C 근사
    const a = needed;
    let sum = 0,
      term = 1;
    for (let k = 0; k < c; k++) {
      if (k > 0) term *= a / k;
      sum += term;
    }
    const last = term * (a / c);
    const pWait = last / (1 - rho) / (sum + last / (1 - rho));
    expectedWait = (pWait * cfg.serviceTime) / (c * (1 - rho));
  }
  return {
    needed,
    rho,
    expectedWait,
    verdict: rho >= 1 ? 'over' : rho > 0.7 ? 'tight' : 'safe',
  };
}
