import { useRef, useState } from 'react';

import { DEFAULT_CONFIG, Sim, type Stats } from '@/lib/engine';
import { QUEUE_SENSE_CHALLENGE, challengePass, queueSenseChallengeRateAt } from '@/lib/queue-sense';
import '@/styles/sim.css';

import Chart, { type ChartHandle } from './Chart';
import { Slider } from './Controls';
import Stage, { type StageHandle } from './Stage';
import { useSimLoop } from './useSimLoop';

const {
  runMs: RUN_MS,
  baseRps: BASE,
  peakRps: PEAK,
  poolMax,
  p99LimitMs,
  seed,
} = QUEUE_SENSE_CHALLENGE;

const QUERY_OPTIONS = [
  { key: 'none', label: '그대로 둔다', ms: 50, note: '피크 이용률 ≈ 98%' },
  { key: 'tune', label: '느린 쿼리만 손본다', ms: 35, note: '피크 이용률 ≈ 69%' },
  { key: 'index', label: '인덱스를 추가한다', ms: 25, note: '피크 이용률 ≈ 49%' },
  { key: 'cache', label: '자주 읽는 건 캐시에 둔다', ms: 15, note: '피크 이용률 ≈ 29%' },
] as const;

const GOALS = [
  { key: 'err', label: '에러율 1% 미만', fmt: (v: number) => `${(v * 100).toFixed(2)}%` },
  {
    key: 'p99',
    label: `응답시간 p99 ${p99LimitMs}ms 미만`,
    fmt: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}초` : `${Math.round(v)}ms`),
  },
  {
    key: 'pool',
    label: `커넥션 ${poolMax}개 이하 사용`,
    fmt: (v: number) => `${v}개`,
  },
] as const;

interface Result {
  err: number;
  p99: number;
  pool: number;
  pass: boolean;
}

export default function QueueSenseChallenge() {
  const [pool, setPool] = useState(10);
  const [query, setQuery] = useState<(typeof QUERY_OPTIONS)[number]['key']>('none');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [live, setLive] = useState<{ err: number; p99: number }>({ err: 0, p99: 0 });
  const [result, setResult] = useState<Result | null>(null);

  const serviceTime = QUERY_OPTIONS.find((q) => q.key === query)!.ms;
  const peakRho = (PEAK * serviceTime) / 1000 / pool;

  const [sim, setSim] = useState(
    () =>
      new Sim(
        {
          ...DEFAULT_CONFIG,
          arrivalRate: BASE,
          serviceTime: 50,
          serviceDist: 'exponential',
          poolSize: 10,
          acquireTimeout: 2000,
          retry: false,
        },
        seed,
      ),
  );
  const stageRef = useRef<StageHandle>(null);
  const chartRef = useRef<ChartHandle>(null);
  const worstP99 = useRef(0);

  const start = () => {
    worstP99.current = 0;
    setResult(null);
    setProgress(0);
    setLive({ err: 0, p99: 0 });
    const nextSim = new Sim(
      {
        ...DEFAULT_CONFIG,
        arrivalRate: BASE,
        serviceTime,
        serviceDist: 'exponential',
        poolSize: pool,
        acquireTimeout: 2000,
        retry: false,
      },
      seed,
    );
    setSim(nextSim);
    chartRef.current?.clear();
    setRunning(true);
  };

  const onSample = (t: number, s: Stats) => {
    setProgress(t / RUN_MS);
    if (t > 3000) worstP99.current = Math.max(worstP99.current, s.p99);
    setLive({ err: errOf(s), p99: worstP99.current });
    chartRef.current?.push(t, s);
    chartRef.current?.draw();
  };

  const onDone = () => {
    setRunning(false);
    const s = sim.stats();
    const err = errOf(s);
    const p99 = worstP99.current;
    setResult({
      err,
      p99,
      pool,
      pass: challengePass({ err, p99, pool }),
    });
  };

  useSimLoop({
    sim,
    running,
    speed: 8,
    rateAt: queueSenseChallengeRateAt,
    stopAt: RUN_MS,
    onFrame: () => stageRef.current?.draw(),
    onSample,
    onDone,
  });

  const goalValues: Record<string, number> = {
    err: result ? result.err : live.err,
    p99: result ? result.p99 : live.p99,
    pool,
  };
  const goalPass: Record<string, boolean> = {
    err: goalValues.err! < QUEUE_SENSE_CHALLENGE.errorLimit,
    p99: goalValues.p99! < p99LimitMs,
    pool: pool <= poolMax,
  };

  return (
    <div className="chal bleed">
      <div className="chal-head">
        <h4>🎯 챌린지 — 피크에서도 70% 여유를 남겨라</h4>
        <p>
          평소 <b>{BASE}/초</b>이던 트래픽이 피크에 <b>{PEAK}/초</b>까지 올라갑니다. 40초를
          버티세요. 단, DB 예산 때문에 <b>커넥션은 {poolMax}개까지만</b> 쓸 수 있습니다. 창구를 꽉
          채워 돌리는 &quot;효율&quot;로는 통과할 수 없습니다.
        </p>
      </div>

      <div className="goals">
        {GOALS.map((g) => (
          <div
            className="goal"
            key={g.key}
            data-s={result ? (goalPass[g.key] ? 'pass' : 'fail') : undefined}
          >
            <span className="goal-dot" aria-hidden="true">
              {result ? (goalPass[g.key] ? '✓' : '✕') : '·'}
            </span>
            <span>{g.label}</span>
            <span className="goal-now">
              {g.key === 'pool' || result || running ? g.fmt(goalValues[g.key]!) : '—'}
            </span>
          </div>
        ))}
      </div>

      <div
        className="progress"
        role="progressbar"
        aria-label="시뮬레이션 진행률"
        aria-valuenow={Math.round(Math.min(1, progress) * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i style={{ width: `${Math.min(100, progress * 100)}%` }} />
      </div>

      <Stage ref={stageRef} sim={sim} />
      <Chart ref={chartRef} />

      <div className="controls">
        <Slider
          label="커넥션 풀 크기"
          unit={`최대 ${poolMax}`}
          min={1}
          max={14}
          value={pool}
          onChange={setPool}
          disabled={running}
          format={(v) => `${v}개`}
          hint={
            pool > poolMax
              ? `⚠️ ${poolMax}개를 넘으면 DB 예산 초과로 실격입니다`
              : `피크 이용률 약 ${(Math.min(1.5, peakRho) * 100).toFixed(0)}%`
          }
        />
        <fieldset className="ctrl" style={{ border: 0, padding: 0, margin: 0, minInlineSize: 0 }}>
          <legend className="ctrl-top" style={{ width: '100%', padding: 0 }}>
            <span className="ctrl-label">
              쿼리를 손본다 <span>처리 시간</span>
            </span>
            <span className="ctrl-val">{serviceTime}ms</span>
          </legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {QUERY_OPTIONS.map((q) => (
              <label
                key={q.key}
                className="toggle"
                data-on={query === q.key}
                style={{ justifyContent: 'flex-start' }}
              >
                <input
                  type="radio"
                  name="queue-sense-q"
                  checked={query === q.key}
                  disabled={running}
                  onChange={() => setQuery(q.key)}
                />
                {q.label}{' '}
                <span className="dim" style={{ fontSize: '.78em' }}>
                  {q.ms}ms · {q.note}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="toggles">
        <button
          className="btn"
          data-variant="primary"
          onClick={start}
          disabled={running}
          style={{ marginLeft: 'auto' }}
        >
          {running
            ? `실행 중… ${Math.round(progress * 100)}%`
            : result
              ? '↻ 다시 도전'
              : '▶ 40초 시뮬레이션 실행'}
        </button>
      </div>

      {result && (
        <div className="chal-result" data-s={result.pass ? 'pass' : 'fail'}>
          {result.pass ? (
            <>
              <b>🎉 통과!</b> 피크 이용률은 약 <b>{(peakRho * 100).toFixed(0)}%</b>였습니다. 처리
              시간을 <b>{serviceTime}ms</b>로 낮춰 70% 근처 여유를 확보한 덕분이에요.
              <br />
              여기서 챙길 것: <b>창구를 꽉 채우는 설계는 효율이 아니라 위험입니다.</b> 같은
              하드웨어라도 대기시간은 이용률이 높아질수록 급격히 튑니다.
            </>
          ) : (
            <>
              <b>❌ 실패</b> — {hint(result, serviceTime, peakRho)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function errOf(s: Stats) {
  const total = s.totalOk + s.totalErr;
  return total ? s.totalErr / total : 0;
}

function hint(r: Result, serviceTime: number, peakRho: number): string {
  if (r.pool > poolMax)
    return `커넥션을 ${poolMax}개 넘게 썼습니다. DB 예산을 넘기면 다른 서비스까지 같이 흔들립니다.`;
  if (peakRho >= 0.9)
    return (
      `피크 이용률이 약 ${(peakRho * 100).toFixed(0)}%입니다. 풀을 ${poolMax}개까지 올려도 ` +
      `${PEAK}/초 × ${(serviceTime / 1000).toFixed(3)}초 = ${((PEAK * serviceTime) / 1000).toFixed(1)}개가 필요해 여유가 없습니다. ` +
      `처리 시간을 줄여 이용률을 70% 아래로 내려보세요.`
    );
  if (r.p99 >= p99LimitMs)
    return `에러는 막았지만 p99가 ${Math.round(r.p99)}ms까지 올라갔습니다. 이용률 ${(peakRho * 100).toFixed(0)}%는 아직 무릎 구간입니다. 70% 근처까지 더 낮추세요.`;
  return '조건을 다시 확인해 보세요.';
}
