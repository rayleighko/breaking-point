import { useRef, useState } from 'react';

import { DEFAULT_CONFIG, Sim, type Stats } from '@/lib/engine';
import '@/styles/sim.css';

import Chart, { type ChartHandle } from './Chart';
import { Slider, Toggle } from './Controls';
import Stage, { type StageHandle } from './Stage';
import { useSimLoop } from './useSimLoop';

/**
 * 챌린지: 이벤트 오픈 트래픽 스파이크를 버텨라.
 *
 * 제약이 핵심이다 — 커넥션을 20개까지밖에 못 늘린다(DB가 못 버팀).
 * 그래서 "풀 늘리기"만으로는 절대 통과할 수 없고,
 * 처리 시간(S)을 줄여야 한다는 걸 몸으로 알게 된다.
 *   필요 커넥션 = 도착률 × 처리시간  →  S를 반으로 줄이면 필요 커넥션도 반이 된다.
 */

const RUN_MS = 45_000;
const BASE = 80,
  PEAK = 400;

/** 시각별 도착률: 평상시 → 이벤트 오픈 스파이크 → 진정 */
function rateAt(t: number): number {
  const s = t / 1000;
  if (s < 10) return BASE;
  if (s < 12) return BASE + (PEAK - BASE) * ((s - 10) / 2);
  if (s < 30) return PEAK;
  if (s < 33) return PEAK - (PEAK - BASE) * ((s - 30) / 3);
  return BASE;
}

const QUERY_OPTIONS = [
  { key: 'none', label: '그대로 둔다', ms: 50, note: '지금 상태' },
  { key: 'index', label: '인덱스를 추가한다', ms: 20, note: '풀스캔 → 인덱스 스캔' },
  { key: 'cache', label: '자주 읽는 건 캐시에 둔다', ms: 8, note: '대부분 DB까지 안 감' },
] as const;

const GOALS = [
  { key: 'err', label: '에러율 1% 미만', fmt: (v: number) => `${(v * 100).toFixed(2)}%` },
  {
    key: 'p99',
    label: '응답시간 p99 500ms 미만',
    fmt: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}초` : `${Math.round(v)}ms`),
  },
  { key: 'pool', label: '커넥션 20개 이하 사용', fmt: (v: number) => `${v}개` },
] as const;

interface Result {
  err: number;
  p99: number;
  pool: number;
  pass: boolean;
}

export default function Challenge() {
  const [pool, setPool] = useState(10);
  const [query, setQuery] = useState<(typeof QUERY_OPTIONS)[number]['key']>('none');
  const [timeout_, setTimeout_] = useState(2000);
  const [retry, setRetry] = useState(false);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [live, setLive] = useState<{ err: number; p99: number }>({ err: 0, p99: 0 });
  const [result, setResult] = useState<Result | null>(null);

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
        },
        2024,
      ),
  );
  const stageRef = useRef<StageHandle>(null);
  const chartRef = useRef<ChartHandle>(null);
  const worstP99 = useRef(0);

  const serviceTime = QUERY_OPTIONS.find((q) => q.key === query)!.ms;

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
        acquireTimeout: timeout_,
        retry,
        maxAttempts: 3,
      },
      2024,
    );
    setSim(nextSim);
    chartRef.current?.clear();
    setRunning(true);
  };

  const onSample = (t: number, s: Stats) => {
    setProgress(t / RUN_MS);
    // 초반 워밍업 구간은 제외하고 최악값을 본다
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
    setResult({ err, p99, pool, pass: err < 0.01 && p99 < 500 && pool <= 20 });
  };

  useSimLoop({
    sim,
    running,
    speed: 8,
    rateAt,
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
    err: goalValues.err! < 0.01,
    p99: goalValues.p99! < 500,
    pool: pool <= 20,
  };

  return (
    <div className="chal bleed">
      <div className="chal-head">
        <h4>🎯 챌린지 — 이벤트 오픈을 버텨라</h4>
        <p>
          평소 {BASE}/초로 잔잔하던 트래픽이, 이벤트가 열리는 순간 <b>{PEAK}/초</b>로 5배 뜁니다.{' '}
          45초 동안 서비스를 지켜내세요. 단, <b>DB가 감당 못 해서 커넥션은 20개까지만</b> 늘릴 수
          있습니다.
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
          unit="최대 20"
          min={1}
          max={30}
          value={pool}
          onChange={setPool}
          disabled={running}
          format={(v) => `${v}개`}
          hint={
            pool > 20
              ? '⚠️ 20개를 넘으면 DB가 못 버팁니다 (실격)'
              : '동시에 DB를 쓸 수 있는 요청 수'
          }
        />
        <Slider
          label="포기까지 기다리는 시간"
          unit="acquire timeout"
          min={200}
          max={5000}
          step={100}
          value={timeout_}
          onChange={setTimeout_}
          disabled={running}
          format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}초` : `${v}ms`)}
          hint="길게 잡으면 에러는 줄지만 p99가 나빠집니다. 트레이드오프."
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
                  name="q"
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
        <Toggle label="🔁 실패하면 재시도한다" checked={retry} onChange={setRetry} />
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
              : '▶ 45초 시뮬레이션 실행'}
        </button>
      </div>

      {result && (
        <div className="chal-result" data-s={result.pass ? 'pass' : 'fail'}>
          {result.pass ? (
            <>
              <b>🎉 통과!</b> 스파이크 구간에서 필요했던 커넥션은{' '}
              <b>{((PEAK * serviceTime) / 1000).toFixed(1)}개</b> (= 400/초 ×{' '}
              {(serviceTime / 1000).toFixed(3)}초)였고, {pool}개로 여유 있게 받아냈습니다.
              <br />
              여기서 챙길 것: <b>처리 시간을 절반으로 줄이면 필요한 커넥션도 절반이 됩니다.</b> 같은
              하드웨어로 두 배를 받는다는 뜻이에요. 파드나 커넥션을 늘리는 것보다 훨씬 싸게
              먹힙니다.
            </>
          ) : (
            <>
              <b>❌ 실패</b> — {hint(result, serviceTime, retry, pool)}
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

function hint(r: Result, serviceTime: number, retry: boolean, pool: number): string {
  if (pool > 20) return '커넥션을 20개 넘게 썼습니다. DB가 먼저 죽습니다. 다른 방법을 찾아야 해요.';
  if (retry && r.err > 0.01)
    return '재시도를 켜니 실패한 요청이 되돌아와서 부하를 더 키웠습니다. 이미 버거운 서버에 재시도는 기름을 붓는 일입니다.';
  const needed = (PEAK * serviceTime) / 1000;
  if (needed > pool)
    return (
      `스파이크 때 필요한 커넥션은 400/초 × ${(serviceTime / 1000).toFixed(3)}초 = ${needed.toFixed(1)}개인데, ${pool}개뿐이었습니다. ` +
      `커넥션은 20개가 상한이니 — 늘릴 수 없다면, 남은 방법은 하나입니다. 한 명당 걸리는 시간을 줄이세요.`
    );
  if (r.p99 >= 500)
    return `에러는 막았지만 p99가 ${Math.round(r.p99)}ms까지 올라갔습니다. 이용률이 100%에 가까우면 대기시간이 급격히 튑니다. 여유를 더 확보하세요.`;
  return '조건을 다시 확인해 보세요.';
}
