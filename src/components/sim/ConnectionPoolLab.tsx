import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_CONFIG, Sim, theory, type SimConfig, type Stats } from '@/lib/engine';
import { useLabSession } from '@/stores/lab-session';
import '@/styles/sim.css';

import Chart, { type ChartHandle } from './Chart';
import { Slider, Toggle } from './Controls';
import Stage, { type StageHandle } from './Stage';
import { useSimLoop } from './useSimLoop';

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
  cfg: Partial<SimConfig>;
}

const PRESETS: Preset[] = [
  {
    name: '평화로운 아침',
    desc: '창구가 넉넉함',
    cfg: {
      arrivalRate: 100,
      poolSize: 20,
      serviceTime: 50,
      retry: false,
      serviceDist: 'exponential',
    },
  },
  {
    name: '아슬아슬',
    desc: '딱 맞게 설계함',
    cfg: {
      arrivalRate: 200,
      poolSize: 10,
      serviceTime: 50,
      retry: false,
      serviceDist: 'exponential',
    },
  },
  {
    name: '커넥션 고갈',
    desc: '트래픽이 1.5배 늘었을 때',
    cfg: {
      arrivalRate: 300,
      poolSize: 10,
      serviceTime: 50,
      retry: false,
      serviceDist: 'exponential',
    },
  },
  {
    name: '느려진 쿼리 하나',
    desc: '트래픽은 그대로인데 쿼리만 느려짐',
    cfg: {
      arrivalRate: 150,
      poolSize: 10,
      serviceTime: 200,
      retry: false,
      serviceDist: 'exponential',
    },
  },
  {
    name: '재시도 폭풍',
    desc: '실패한 요청이 다시 몰려옴',
    cfg: {
      arrivalRate: 250,
      poolSize: 10,
      serviceTime: 50,
      retry: true,
      maxAttempts: 3,
      serviceDist: 'exponential',
    },
  },
];

export default function ConnectionPoolLab({ initial }: { initial?: Partial<SimConfig> }) {
  const [cfg, setCfg] = useState<SimConfig>({ ...DEFAULT_CONFIG, ...PRESETS[0]!.cfg, ...initial });
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [stats, setStats] = useState<Stats>(EMPTY);
  const publishLab = useLabSession((state) => state.publish);
  const connectLab = useLabSession((state) => state.connect);
  const clearLab = useLabSession((state) => state.clear);

  const [sim] = useState(() => new Sim(cfg));
  const stageRef = useRef<StageHandle>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartHandle>(null);

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
    stageRef.current?.draw(); // 일시정지 중에도 창구 개수 변경이 바로 보이도록
  }, [cfg, sim]);

  // 화면 밖이거나 background tab이면 계산과 Canvas rendering을 멈춘다.
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

  const th = useMemo(() => theory(cfg), [cfg]);
  const maxThroughput = (cfg.poolSize / cfg.serviceTime) * 1000;

  const reset = useCallback(() => {
    sim.reset();
    stageRef.current?.reset(); // Sim 객체는 그대로라 좌표 캐시를 따로 비워야 한다
    chartRef.current?.clear();
    setStats(EMPTY);
  }, [sim]);
  const apply = (p: Preset) => {
    setCfg((c) => ({ ...c, ...p.cfg }));
    reset();
    setRunning(true);
  };
  const patch = useCallback((v: Partial<SimConfig>) => setCfg((c) => ({ ...c, ...v })), []);

  const health = th.verdict;

  useEffect(
    () =>
      connectLab({
        patch,
        setRunning,
        reset,
        focus: () => rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      }),
    [connectLab, patch, reset],
  );

  useEffect(() => {
    publishLab({
      labId: 'connection-pool',
      title: '커넥션 풀 실험실',
      config: cfg,
      stats,
      running,
      visible: onScreen && pageVisible,
      health,
      needed: th.needed,
      utilization: th.rho,
      maxThroughput,
      updatedAt: Date.now(),
    });
  }, [cfg, health, maxThroughput, onScreen, pageVisible, publishLab, running, stats, th]);

  useEffect(() => () => clearLab('connection-pool'), [clearLab]);

  return (
    <div className="sim bleed" data-health={health} ref={rootRef}>
      <div className="sim-head">
        <div className="sim-title">커넥션 풀 실험실</div>
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

      <Verdict th={th} stats={stats} cfg={cfg} maxThroughput={maxThroughput} />

      <Stage ref={stageRef} sim={sim} />

      <div className="metrics">
        <Metric label="처리량" value={fmtNum(stats.throughput)} unit="/초" />
        <Metric
          label="에러율"
          value={(stats.errorRate * 100).toFixed(1)}
          unit="%"
          kind={stats.errorRate > 0.05 ? 'bad' : stats.errorRate > 0.005 ? 'warn' : 'ok'}
        />
        <Metric label="응답시간 p50" value={fmtMs(stats.p50)} />
        <Metric
          label="응답시간 p99"
          value={fmtMs(stats.p99)}
          kind={stats.p99 > 1000 ? 'bad' : stats.p99 > 300 ? 'warn' : 'ok'}
        />
        <Metric
          label="대기줄"
          value={stats.queueLen.toLocaleString()}
          unit="명"
          kind={stats.queueLen > 200 ? 'bad' : stats.queueLen > 20 ? 'warn' : 'ok'}
        />
        <Metric
          label="실제 유입"
          value={fmtNum(stats.effectiveArrival)}
          unit="/초"
          kind={stats.effectiveArrival > cfg.arrivalRate * 1.15 ? 'bad' : undefined}
        />
      </div>

      <Chart ref={chartRef} />

      <div className="math">
        <div>
          <span className="tag">필요한 창구 수</span> = 도착 {cfg.arrivalRate}/초 × 처리{' '}
          {(cfg.serviceTime / 1000).toFixed(3)}초 ={' '}
          <span className="hl">{th.needed.toFixed(1)}개</span>
        </div>
        <div>
          <span className="tag">지금 있는 창구</span> = <span className="hl">{cfg.poolSize}개</span>
          {'  →  '}이용률{' '}
          <span
            className="hl"
            style={{
              color:
                health === 'over' ? 'var(--bad)' : health === 'tight' ? 'var(--warn)' : 'var(--ok)',
            }}
          >
            {(th.rho * 100).toFixed(0)}%
          </span>
          {health === 'over' && ' ← 100%를 넘으면 줄이 무한히 길어집니다'}
        </div>
        <div>
          <span className="tag">이 설정의 처리량 한계</span> = 창구 {cfg.poolSize}개 ÷{' '}
          {(cfg.serviceTime / 1000).toFixed(3)}초 ={' '}
          <span className="hl">{Math.round(maxThroughput)}/초</span> (아무리 기다려도 이보다 많이는
          못 나감)
        </div>
      </div>

      <div className="presets">
        {PRESETS.map((p) => (
          <button key={p.name} className="preset" onClick={() => apply(p)}>
            <b>{p.name}</b>
            {p.desc}
          </button>
        ))}
      </div>

      <div className="controls">
        <Slider
          label="손님이 오는 속도"
          unit="도착률 · RPS"
          min={10}
          max={600}
          step={10}
          value={cfg.arrivalRate}
          onChange={(v) => patch({ arrivalRate: v })}
          format={(v) => `${v}/초`}
          hint="1초에 몇 개의 요청이 들어오는지."
        />
        <Slider
          label="창구 개수"
          unit="커넥션 풀 크기"
          min={1}
          max={50}
          value={cfg.poolSize}
          onChange={(v) => patch({ poolSize: v })}
          format={(v) => `${v}개`}
          hint="동시에 DB를 쓸 수 있는 요청의 최대 개수. 늘리면 DB가 부담을 집니다."
        />
        <Slider
          label="한 명 처리하는 시간"
          unit="쿼리 실행 시간"
          min={5}
          max={400}
          step={5}
          value={cfg.serviceTime}
          onChange={(v) => patch({ serviceTime: v })}
          format={(v) => `${v}ms`}
          hint="인덱스가 빠지면 이 값이 10배가 됩니다. 그때 무슨 일이 일어나는지 보세요."
        />
        <Slider
          label="포기까지 기다리는 시간"
          unit="acquire timeout"
          min={200}
          max={6000}
          step={100}
          value={cfg.acquireTimeout}
          onChange={(v) => patch({ acquireTimeout: v })}
          format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}초` : `${v}ms`)}
          hint="이 시간을 넘게 기다리면 에러를 내고 나갑니다."
        />
      </div>

      <div className="toggles">
        <Toggle
          label="🔁 실패하면 다시 시도한다 (재시도)"
          checked={cfg.retry}
          onChange={(v) => patch({ retry: v })}
          hint="클라이언트 재시도. 이미 버거운 서버에 부하를 더 얹습니다."
        />
        <Toggle
          label="🎲 처리 시간이 들쭉날쭉하다 (현실 모드)"
          checked={cfg.serviceDist === 'exponential'}
          onChange={(v) => patch({ serviceDist: v ? 'exponential' : 'fixed' })}
          hint="실제 쿼리는 항상 같은 시간이 걸리지 않습니다. 가끔 아주 느린 쿼리가 섞입니다."
        />
      </div>
    </div>
  );
}

/* ── 상황을 사람 말로 설명하는 배너 ───────────────────────── */
function Verdict({
  th,
  stats,
  cfg,
  maxThroughput,
}: {
  th: ReturnType<typeof theory>;
  stats: Stats;
  cfg: SimConfig;
  maxThroughput: number;
}) {
  let icon: string;
  let text: ReactNode;

  if (th.verdict === 'safe') {
    icon = '✅';
    text = (
      <>
        창구가 넉넉합니다. 필요한 건 <b>{th.needed.toFixed(1)}개</b>인데 <b>{cfg.poolSize}개</b>가
        있어서 대부분의 손님이 <b>기다리지 않고</b> 바로 처리됩니다.
      </>
    );
  } else if (th.verdict === 'tight') {
    icon = '⚠️';
    text = (
      <>
        아슬아슬합니다. 창구가 <b>{(th.rho * 100).toFixed(0)}%</b> 차 있어요. 지금은 버티지만,
        트래픽이 조금만 늘거나 쿼리가 조금만 느려지면 바로 줄이 길어집니다.{' '}
        <b>여유가 없다는 건 이미 위험하다는 뜻</b>입니다.
      </>
    );
  } else {
    icon = '🔥';
    text = (
      <>
        감당 불가입니다. 들어오는 속도(<b>{cfg.arrivalRate}/초</b>)가 처리 한계(
        <b>{Math.round(maxThroughput)}/초</b>)보다 빠릅니다. 줄은 <b>영원히 길어지고</b>, 기다리다
        지친 요청은 타임아웃 에러가 됩니다.
        {cfg.retry && ' 재시도까지 켜져 있어서 실패한 요청이 되돌아와 부하를 더 키우는 중입니다.'}
      </>
    );
  }

  return (
    <div className="verdict" data-k={th.verdict} role="status" aria-live="polite">
      <span className="verdict-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        {text}
        {stats.errorRate > 0.01 && (
          <>
            {' '}
            지금 <b>{(stats.errorRate * 100).toFixed(0)}%</b>의 요청이 실패하고 있고, 느린 쪽 1%는{' '}
            <b>{fmtMs(stats.p99)}</b>씩 기다리는 중입니다.
          </>
        )}
      </div>
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

function fmtNum(n: number) {
  return n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(1);
}
function fmtMs(ms: number) {
  if (!ms) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}초` : `${Math.round(ms)}ms`;
}
