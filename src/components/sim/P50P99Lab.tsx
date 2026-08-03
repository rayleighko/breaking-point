import { useEffect, useMemo, useRef, useState } from 'react';

import {
  TARGET_MEAN_MS,
  fastForTargetMean,
  presetMixture,
  sampleMixture,
  summarizeLatencies,
  type MixtureConfig,
} from '@/lib/p50-p99';
import '@/styles/sim.css';

import DistCompare from './DistCompare';
import { Slider } from './Controls';

import type { ReactNode } from 'react';

interface Preset {
  name: string;
  desc: string;
  /** 꼬리 비율 % (0이면 고른 분포) */
  slowPct: number;
  /** 느린 요청 ms. 0이면 tight */
  slowMs: number;
}

const PRESETS: Preset[] = [
  { name: '고른 응답', desc: '평균≈p50≈p99', slowPct: 0, slowMs: TARGET_MEAN_MS },
  { name: '살짝 꼬리', desc: '평균은 비슷, p99만 조금 김', slowPct: 1, slowMs: 500 },
  { name: '같은 평균·긴 꼬리', desc: '대시보드는 멀쩡해 보임', slowPct: 2, slowMs: 2100 },
  { name: '악성 꼬리', desc: '1%가 전체를 망침', slowPct: 1, slowMs: 5050 },
];

const SAMPLE_N = 4000;
const BASE_SEED = 99;

export default function P50P99Lab() {
  const [slowPct, setSlowPct] = useState(2);
  const [slowMs, setSlowMs] = useState(2100);
  const [stream, setStream] = useState(0);
  const [running, setRunning] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  const leftCfg = useMemo(() => presetMixture('tight'), []);
  const rightCfg = useMemo((): MixtureConfig => {
    if (slowPct <= 0) return presetMixture('tight');
    const fast = fastForTargetMean(TARGET_MEAN_MS, slowMs, slowPct);
    if (fast == null || fast < 5) {
      // 평균을 못 맞추면 가능한 최대 꼬리로 클램프한 느낌을 주기보다 안전한 폴백
      return presetMixture('heavy');
    }
    return { fastMs: fast, slowMs, slowPct };
  }, [slowMs, slowPct]);

  const leftSamples = useMemo(
    () => sampleMixture(leftCfg, SAMPLE_N, BASE_SEED + stream),
    [leftCfg, stream],
  );
  const rightSamples = useMemo(
    () => sampleMixture(rightCfg, SAMPLE_N, BASE_SEED + 1000 + stream),
    [rightCfg, stream],
  );
  const leftSum = useMemo(() => summarizeLatencies(leftSamples), [leftSamples]);
  const rightSum = useMemo(() => summarizeLatencies(rightSamples), [rightSamples]);

  const meanGap = Math.abs(leftSum.mean - rightSum.mean);
  const p99Gap = rightSum.p99 - leftSum.p99;
  const health =
    rightSum.p99 > TARGET_MEAN_MS * 8
      ? 'over'
      : rightSum.p99 > TARGET_MEAN_MS * 3
        ? 'tight'
        : 'safe';

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.dataset.hydrated = 'true';
    return () => {
      delete root.dataset.hydrated;
    };
  }, []);

  // 첫 화면부터 표본이 천천히 갱신되며 “움직인다”
  useEffect(() => {
    if (!running) return;
    const el = rootRef.current;
    let onScreen = true;
    let pageVisible = document.visibilityState === 'visible';
    let id = 0;

    const tick = () => {
      if (onScreen && pageVisible) setStream((s) => (s + 1) % 10_000);
      id = window.setTimeout(tick, 900);
    };
    id = window.setTimeout(tick, 900);

    const io =
      el && typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver((es) => {
            onScreen = es[0]?.isIntersecting ?? true;
          })
        : null;
    if (el && io) io.observe(el);
    const onVis = () => {
      pageVisible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearTimeout(id);
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [running]);

  const applyPreset = (p: Preset) => {
    setSlowPct(p.slowPct);
    setSlowMs(p.slowMs);
    setStream((s) => s + 1);
    setRunning(true);
  };

  const impossible = slowPct > 0 && fastForTargetMean(TARGET_MEAN_MS, slowMs, slowPct) == null;

  return (
    <div className="sim bleed" data-health={health} ref={rootRef}>
      <div className="sim-head">
        <div className="sim-title">같은 평균, 다른 꼬리</div>
        <div className="sim-actions">
          <button
            className="btn"
            data-variant={running ? undefined : 'primary'}
            onClick={() => setRunning((r) => !r)}
          >
            {running ? '일시정지' : '다시 흐르기'}
          </button>
        </div>
      </div>

      <div className="verdict" data-k={health}>
        <span className="verdict-icon" aria-hidden="true">
          {health === 'safe' ? '✓' : health === 'tight' ? '!' : '×'}
        </span>
        <div>
          {impossible ? (
            <>
              그 꼬리 높이로는 평균 <b>{TARGET_MEAN_MS}ms</b>를 맞출 수 없습니다. 느린 요청을
              줄이거나 비율을 낮춰 보세요.
            </>
          ) : (
            <>
              두 분포의 평균 차이는 <b>{meanGap.toFixed(1)}ms</b>뿐입니다. 그런데 p99 차이는{' '}
              <b>{fmtMs(Math.max(0, p99Gap))}</b>입니다. 평균만 보면 둘 다 “괜찮아요”.
            </>
          )}
        </div>
      </div>

      <div className="presets" role="group" aria-label="상황 프리셋">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            className="preset"
            aria-pressed={slowPct === p.slowPct && slowMs === p.slowMs}
            onClick={() => applyPreset(p)}
          >
            <b>{p.name}</b>
            <span>{p.desc}</span>
          </button>
        ))}
      </div>

      <div className="dist-grid">
        <DistPanel
          title="왼쪽 · 고른 분포"
          subtitle={`거의 모든 요청이 ${TARGET_MEAN_MS}ms`}
          cfg={leftCfg}
          samples={leftSamples}
          summary={leftSum}
          accent="accent"
        />
        <DistPanel
          title="오른쪽 · 꼬리 있는 분포"
          subtitle={
            impossible
              ? '평균을 맞출 수 없는 설정'
              : `빠른 ${fmtMs(rightCfg.fastMs)} · 느린 ${fmtMs(rightCfg.slowMs)} (${rightCfg.slowPct}%)`
          }
          cfg={rightCfg}
          samples={rightSamples}
          summary={rightSum}
          accent="bad"
        />
      </div>

      <div className="controls">
        <Slider
          label="느린 요청 비율"
          unit="꼬리 비중"
          hint="비율을 바꿔도 평균은 100ms로 맞춥니다"
          min={0}
          max={5}
          step={0.5}
          value={slowPct}
          onChange={setSlowPct}
          format={(v) => `${v}%`}
        />
        <Slider
          label="느린 요청 시간"
          unit="꼬리 높이"
          hint="높을수록 p99만 먼저 나빠집니다"
          min={100}
          max={6000}
          step={50}
          value={slowMs}
          onChange={setSlowMs}
          format={(v) => fmtMs(v)}
        />
      </div>
    </div>
  );
}

function DistPanel({
  title,
  subtitle,
  cfg,
  samples,
  summary,
  accent,
}: {
  title: string;
  subtitle: string;
  cfg: MixtureConfig;
  samples: number[];
  summary: ReturnType<typeof summarizeLatencies>;
  accent: 'accent' | 'bad';
}) {
  return (
    <section className="dist-panel">
      <header className="dist-panel-head">
        <h4>{title}</h4>
        <p>{subtitle}</p>
      </header>
      <DistCompare samples={samples} summary={summary} title={title} accent={accent} />
      <div className="metrics">
        <Metric label="평균" value={fmtMs(summary.mean)} />
        <Metric label="p50" value={fmtMs(summary.p50)} kind="ok" />
        <Metric
          label="p99"
          value={fmtMs(summary.p99)}
          kind={summary.p99 > 800 ? 'bad' : summary.p99 > 300 ? 'warn' : 'ok'}
        />
        <Metric label="표본" value={`${summary.count}`} />
      </div>
      <p className="dist-panel-note">
        구성: 빠름 <b>{fmtMs(cfg.fastMs)}</b> / 느림 <b>{fmtMs(cfg.slowMs)}</b> (
        {cfg.slowPct.toFixed(1)}%)
      </p>
    </section>
  );
}

function Metric({
  label,
  value,
  kind,
}: {
  label: string;
  value: ReactNode;
  kind?: 'ok' | 'warn' | 'bad';
}) {
  return (
    <div className="metric" data-k={kind}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

function fmtMs(ms: number) {
  if (!Number.isFinite(ms)) return '—';
  return ms >= 1000
    ? `${(ms / 1000).toFixed(1)}초`
    : `${ms < 10 ? ms.toFixed(1) : Math.round(ms)}ms`;
}
