import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Sim, theory, type Stats } from '@/lib/engine';
import {
  QUEUE_SENSE_POOL,
  QUEUE_SENSE_SERVICE_MS,
  arrivalForUtilization,
  configForUtilization,
  waitAtUtilization,
} from '@/lib/queue-sense';
import { useLabSession } from '@/stores/lab-session';
import '@/styles/sim.css';

import Chart, { type ChartHandle } from './Chart';
import { Slider } from './Controls';
import Stage, { type StageHandle } from './Stage';
import { useSimLoop } from './useSimLoop';
import WaitCurve from './WaitCurve';

import type { ReactNode } from 'react';

const EMPTY: Stats = {
  throughput: 0,
  errorRate: 0,
  p50: 0,
  p95: 0,
  p99: 0,
  queueLen: 0,
  busy: 0,
  effectiveArrival: 0,
  totalOk: 0,
  totalErr: 0,
};

interface Preset {
  name: string;
  desc: string;
  rho: number;
}

const PRESETS: Preset[] = [
  { name: '여유 50%', desc: '줄이 거의 안 생김', rho: 0.5 },
  { name: '권장 70%', desc: '현업이 자주 잡는 여유', rho: 0.7 },
  { name: '아슬아슬 85%', desc: '지금은 버티지만 흔들림에 약함', rho: 0.85 },
  { name: '위험 95%', desc: '대기가 수직으로 튐', rho: 0.95 },
];

export default function QueueSenseLab() {
  const [rhoPct, setRhoPct] = useState(70);
  const [poolSize, setPoolSize] = useState(QUEUE_SENSE_POOL);
  const [serviceTime, setServiceTime] = useState(QUEUE_SENSE_SERVICE_MS);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [stats, setStats] = useState<Stats>(EMPTY);
  const publishLab = useLabSession((state) => state.publish);
  const connectLab = useLabSession((state) => state.connect);
  const clearLab = useLabSession((state) => state.clear);

  const rho = rhoPct / 100;
  const cfg = useMemo(
    () => configForUtilization(rho, poolSize, serviceTime),
    [rho, poolSize, serviceTime],
  );
  const [sim] = useState(() => new Sim(cfg));
  const stageRef = useRef<StageHandle>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartHandle>(null);

  const th = useMemo(() => theory(cfg), [cfg]);
  const wait70 = waitAtUtilization(0.7, poolSize, serviceTime);
  const wait95 = waitAtUtilization(0.95, poolSize, serviceTime);
  const waitRatio =
    Number.isFinite(wait70) && Number.isFinite(wait95) && wait70 > 0 ? wait95 / wait70 : Infinity;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.dataset.hydrated = 'true';
    return () => {
      delete root.dataset.hydrated;
    };
  }, []);

  useEffect(() => {
    sim.setConfig(cfg);
    stageRef.current?.draw();
  }, [cfg, sim]);

  const [onScreen, setOnScreen] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((es) => setOnScreen(es[0]?.isIntersecting ?? true));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState === 'visible');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useSimLoop({
    sim,
    running: running && onScreen && pageVisible,
    speed,
    onFrame: () => stageRef.current?.draw(),
    onSample: (t, s) => {
      setStats(s);
      chartRef.current?.push(t, s);
      chartRef.current?.draw();
    },
  });

  const reset = useCallback(() => {
    sim.reset();
    stageRef.current?.reset();
    chartRef.current?.clear();
    setStats(EMPTY);
  }, [sim]);

  const applyRho = (next: number) => {
    setRhoPct(Math.round(next * 100));
    reset();
    setRunning(true);
  };

  const patchArrival = useCallback(
    (partial: { arrivalRate?: number; poolSize?: number; serviceTime?: number }) => {
      if (partial.poolSize != null) setPoolSize(partial.poolSize);
      if (partial.serviceTime != null) setServiceTime(partial.serviceTime);
      if (partial.arrivalRate != null) {
        const p = partial.poolSize ?? poolSize;
        const s = partial.serviceTime ?? serviceTime;
        const nextRho = (partial.arrivalRate * s) / 1000 / p;
        setRhoPct(Math.round(Math.min(0.98, Math.max(0.1, nextRho)) * 100));
      }
    },
    [poolSize, serviceTime],
  );

  useEffect(
    () =>
      connectLab({
        patch: patchArrival,
        setRunning,
        reset,
        focus: () => rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      }),
    [connectLab, patchArrival, reset],
  );

  useEffect(() => {
    publishLab({
      labId: 'queue-sense',
      title: 'Queue의 감각 실험실',
      config: cfg,
      stats,
      running,
      visible: onScreen && pageVisible,
      health: th.verdict,
      needed: th.needed,
      utilization: th.rho,
      maxThroughput: (poolSize / serviceTime) * 1000,
      updatedAt: Date.now(),
    });
  }, [cfg, onScreen, pageVisible, poolSize, publishLab, running, serviceTime, stats, th]);

  useEffect(() => () => clearLab('queue-sense'), [clearLab]);

  return (
    <div className="sim bleed" data-health={th.verdict} ref={rootRef}>
      <div className="sim-head">
        <div className="sim-title">Queue의 감각 실험실</div>
        <div className="sim-actions">
          <button
            className="btn"
            data-variant={running ? undefined : 'primary'}
            onClick={() => setRunning((r) => !r)}
          >
            {running ? '⏸ 일시정지' : '▶ 시작'}
          </button>
          <button className="btn" onClick={reset}>
            ↺ 초기화
          </button>
          {[1, 4].map((s) => (
            <button key={s} className="btn" aria-pressed={speed === s} onClick={() => setSpeed(s)}>
              {s}배속
            </button>
          ))}
        </div>
      </div>

      <Verdict
        rho={rho}
        waitMs={th.expectedWait}
        wait70={wait70}
        wait95={wait95}
        ratio={waitRatio}
      />

      <WaitCurve
        poolSize={poolSize}
        serviceTimeMs={serviceTime}
        rho={rho}
        waitMs={th.expectedWait}
      />

      <Stage ref={stageRef} sim={sim} />

      <div className="metrics">
        <Metric label="이용률" value={`${rhoPct}`} unit="%" kind={metricKind(th.verdict)} />
        <Metric
          label="이론 대기"
          value={fmtWait(th.expectedWait)}
          kind={th.expectedWait > 100 ? 'bad' : th.expectedWait > 20 ? 'warn' : 'ok'}
        />
        <Metric
          label="실측 p99"
          value={fmtMs(stats.p99)}
          kind={stats.p99 > 800 ? 'bad' : stats.p99 > 300 ? 'warn' : 'ok'}
        />
        <Metric
          label="대기줄"
          value={stats.queueLen.toLocaleString()}
          unit="명"
          kind={stats.queueLen > 30 ? 'bad' : stats.queueLen > 5 ? 'warn' : 'ok'}
        />
        <Metric label="도착률" value={`${Math.round(cfg.arrivalRate)}`} unit="/초" />
        <Metric
          label="70%→95%"
          value={Number.isFinite(waitRatio) ? `${waitRatio.toFixed(0)}` : '∞'}
          unit="배"
          kind={waitRatio > 10 ? 'bad' : 'warn'}
        />
      </div>

      <Chart ref={chartRef} />

      <div className="math">
        <div>
          <span className="tag">이용률 ρ</span> = 도착 {Math.round(cfg.arrivalRate)}/초 × 처리{' '}
          {(serviceTime / 1000).toFixed(3)}초 ÷ 창구 {poolSize}개 ={' '}
          <span className="hl">{(th.rho * 100).toFixed(0)}%</span>
        </div>
        <div>
          <span className="tag">같은 창구에서</span> 70% 대기는{' '}
          <span className="hl">{fmtWait(wait70)}</span>, 95% 대기는{' '}
          <span className="hl">{fmtWait(wait95)}</span>
          {Number.isFinite(waitRatio) && (
            <>
              {' '}
              → <span className="hl">{waitRatio.toFixed(1)}배</span>
            </>
          )}
        </div>
        <div>
          <span className="tag">도착률 역산</span> = 이용률 × 창구 ÷ 처리시간 ={' '}
          <span className="hl">
            {Math.round(arrivalForUtilization(rho, poolSize, serviceTime))}/초
          </span>
        </div>
      </div>

      <div className="presets">
        {PRESETS.map((p) => (
          <button key={p.name} className="preset" onClick={() => applyRho(p.rho)}>
            <b>{p.name}</b>
            {p.desc}
          </button>
        ))}
      </div>

      <div className="controls">
        <Slider
          label="이용률"
          unit="창구가 차 있는 비율 · ρ"
          min={40}
          max={98}
          step={1}
          value={rhoPct}
          onChange={(v) => {
            setRhoPct(v);
          }}
          format={(v) => `${v}%`}
          hint="이 슬라이더만 움직여 보세요. 70%와 95%에서 대기시간이 얼마나 달라지는지 곡선으로 보입니다."
        />
        <Slider
          label="창구 개수"
          unit="커넥션 풀 크기"
          min={1}
          max={20}
          value={poolSize}
          onChange={setPoolSize}
          format={(v) => `${v}개`}
          hint="창구가 늘면 같은 이용률에서도 절대 대기는 줄어듭니다. 곡선 모양(무릎)은 그대로입니다."
        />
        <Slider
          label="한 명 처리하는 시간"
          unit="쿼리 실행 시간"
          min={10}
          max={200}
          step={5}
          value={serviceTime}
          onChange={setServiceTime}
          format={(v) => `${v}ms`}
          hint="처리 시간이 늘면 같은 이용률을 유지하려면 도착률을 낮춰야 합니다."
        />
      </div>
    </div>
  );
}

function Verdict({
  rho,
  waitMs,
  wait70,
  wait95,
  ratio,
}: {
  rho: number;
  waitMs: number;
  wait70: number;
  wait95: number;
  ratio: number;
}) {
  let icon: string;
  let kind: 'safe' | 'tight' | 'over';
  let text: ReactNode;

  if (rho >= 1 || !Number.isFinite(waitMs)) {
    icon = '🔥';
    kind = 'over';
    text = (
      <>
        이용률이 <b>100%</b>에 닿았습니다. 줄은 시간이 갈수록 길어지고, 대기시간에 상한이 없습니다.
      </>
    );
  } else if (rho >= 0.9) {
    icon = '🔥';
    kind = 'over';
    text = (
      <>
        이용률 <b>{(rho * 100).toFixed(0)}%</b>입니다. 이론 대기시간은 <b>{fmtWait(waitMs)}</b>
        이고, 70%일 때(<b>{fmtWait(wait70)}</b>)보다{' '}
        <b>{Number.isFinite(ratio) ? `${ratio.toFixed(0)}배` : '훨씬'}</b> 깁니다. 자원은 거의 다
        쓰는데 체감은 훨씬 나쁩니다.
      </>
    );
  } else if (rho > 0.7) {
    icon = '⚠️';
    kind = 'tight';
    text = (
      <>
        이용률 <b>{(rho * 100).toFixed(0)}%</b> — 아직 버티지만 무릎 구간에 들어왔습니다. 95%에서는
        대기가 <b>{fmtWait(wait95)}</b>까지 뜁니다. 작은 트래픽 증가가 큰 지연으로 바뀌는
        구간이에요.
      </>
    );
  } else {
    icon = '✅';
    kind = 'safe';
    text = (
      <>
        이용률 <b>{(rho * 100).toFixed(0)}%</b>입니다. 이론 대기는 <b>{fmtWait(waitMs)}</b>로
        짧습니다. 현업에서 70%를 목표로 잡는 이유가 이 여유입니다 — 남는 30%가 스파이크를
        흡수합니다.
      </>
    );
  }

  return (
    <div className="verdict" data-k={kind} role="status" aria-live="polite">
      <span className="verdict-icon" aria-hidden="true">
        {icon}
      </span>
      <div>{text}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  kind,
}: {
  label: string;
  value: string;
  unit?: string;
  kind?: 'ok' | 'warn' | 'bad';
}) {
  return (
    <div className="metric" data-k={kind}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {value}
        {unit && <small>{unit}</small>}
      </div>
    </div>
  );
}

function metricKind(v: 'safe' | 'tight' | 'over'): 'ok' | 'warn' | 'bad' {
  if (v === 'over') return 'bad';
  if (v === 'tight') return 'warn';
  return 'ok';
}

function fmtMs(ms: number) {
  if (!ms) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}초` : `${Math.round(ms)}ms`;
}

function fmtWait(ms: number) {
  if (!Number.isFinite(ms)) return '∞';
  if (ms < 10) return `${ms.toFixed(1)}ms`;
  return fmtMs(ms);
}
