import { useMemo, useState } from 'react';

import {
  INTENDED_MIXTURE,
  NAIVE_MIXTURE,
  P50_P99_CHALLENGE,
  challengePass,
  mixtureMean,
  sampleMixture,
  summarizeLatencies,
  type MixtureConfig,
} from '@/lib/p50-p99';
import '@/styles/sim.css';

import DistCompare from './DistCompare';
import { Slider } from './Controls';

const { meanLimitMs, p99LimitMs, slowPctMax, sampleCount, seed } = P50_P99_CHALLENGE;

interface Result {
  mean: number;
  p50: number;
  p99: number;
  pass: boolean;
}

export default function P50P99Challenge() {
  const [fastMs, setFastMs] = useState(NAIVE_MIXTURE.fastMs);
  const [slowMs, setSlowMs] = useState(NAIVE_MIXTURE.slowMs);
  const [slowPct, setSlowPct] = useState(NAIVE_MIXTURE.slowPct);
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);

  const cfg = useMemo<MixtureConfig>(
    () => ({ fastMs, slowMs, slowPct }),
    [fastMs, slowMs, slowPct],
  );
  const theoryMean = mixtureMean(cfg);

  const samples = useMemo(
    () => sampleMixture(cfg, sampleCount, seed + attempt),
    [attempt, cfg],
  );
  const summary = useMemo(() => summarizeLatencies(samples), [samples]);

  const run = () => {
    const nextAttempt = attempt + 1;
    const next = summarizeLatencies(sampleMixture(cfg, sampleCount, seed + nextAttempt));
    setAttempt(nextAttempt);
    setResult({
      mean: next.mean,
      p50: next.p50,
      p99: next.p99,
      pass: challengePass(next, cfg),
    });
  };

  const applyNaive = () => {
    setFastMs(NAIVE_MIXTURE.fastMs);
    setSlowMs(NAIVE_MIXTURE.slowMs);
    setSlowPct(NAIVE_MIXTURE.slowPct);
    setResult(null);
  };

  const applyHint = () => {
    setFastMs(INTENDED_MIXTURE.fastMs);
    setSlowMs(INTENDED_MIXTURE.slowMs);
    setSlowPct(INTENDED_MIXTURE.slowPct);
    setResult(null);
  };

  const goalValues = {
    mean: result ? result.mean : theoryMean,
    p99: result ? result.p99 : summary.p99,
    slow: slowPct,
  };
  const goalPass = {
    mean: goalValues.mean <= meanLimitMs,
    p99: goalValues.p99 < p99LimitMs,
    slow: slowPct <= slowPctMax,
  };

  return (
    <div className="chal bleed">
      <div className="chal-head">
        <h4>🎯 챌린지 — 평균은 지켜도 꼬리는 자르라</h4>
        <p>
          대시보드 평균은 <b>{meanLimitMs}ms 이하</b>로 유지해야 합니다. 동시에 사용자 체감인{' '}
          <b>p99는 {p99LimitMs}ms 미만</b>이어야 합니다. 느린 요청 비율은{' '}
          <b>{slowPctMax}%까지만</b> 허용됩니다. 평균만 맞추려고 1%를 극단적으로 늘리는 해법은
          일부러 실패하게 만들어 두었습니다.
        </p>
      </div>

      <div className="goals">
        {(
          [
            { key: 'mean' as const, label: `평균 ${meanLimitMs}ms 이하`, fmt: fmtMs },
            { key: 'p99' as const, label: `p99 ${p99LimitMs}ms 미만`, fmt: fmtMs },
            {
              key: 'slow' as const,
              label: `느린 요청 ${slowPctMax}% 이하`,
              fmt: (v: number) => `${v}%`,
            },
          ] as const
        ).map((g) => (
          <div
            className="goal"
            key={g.key}
            data-s={result ? (goalPass[g.key] ? 'pass' : 'fail') : undefined}
          >
            <span className="goal-dot" aria-hidden="true">
              {result ? (goalPass[g.key] ? '✓' : '✕') : '·'}
            </span>
            <span>{g.label}</span>
            <span className="goal-now">{g.fmt(goalValues[g.key])}</span>
          </div>
        ))}
      </div>

      <div className="controls">
        <Slider
          label="빠른 요청"
          unit="대부분의 응답"
          min={P50_P99_CHALLENGE.fastMsMin}
          max={P50_P99_CHALLENGE.fastMsMax}
          step={5}
          value={fastMs}
          onChange={(v) => {
            setFastMs(v);
            setResult(null);
          }}
          format={(v) => fmtMs(v)}
        />
        <Slider
          label="느린 요청"
          unit="꼬리 높이"
          min={P50_P99_CHALLENGE.slowMsMin}
          max={P50_P99_CHALLENGE.slowMsMax}
          step={50}
          value={slowMs}
          onChange={(v) => {
            setSlowMs(v);
            setResult(null);
          }}
          format={(v) => fmtMs(v)}
        />
        <Slider
          label="느린 요청 비율"
          unit="꼬리 비중"
          min={0}
          max={slowPctMax}
          step={0.5}
          value={slowPct}
          onChange={(v) => {
            setSlowPct(v);
            setResult(null);
          }}
          format={(v) => `${v}%`}
        />
      </div>

      <div className="dist-panel" style={{ borderTop: '1px solid var(--line-soft)' }}>
        <DistCompare
          samples={samples}
          summary={summary}
          title="현재 혼합 분포"
          accent={summary.p99 > p99LimitMs ? 'bad' : 'accent'}
        />
        <div className="metrics">
          <div className="metric">
            <div className="metric-label">이론 평균</div>
            <div className="metric-value">{fmtMs(theoryMean)}</div>
          </div>
          <div className="metric" data-k="ok">
            <div className="metric-label">표본 p50</div>
            <div className="metric-value">{fmtMs(summary.p50)}</div>
          </div>
          <div className="metric" data-k={summary.p99 > p99LimitMs ? 'bad' : 'ok'}>
            <div className="metric-label">표본 p99</div>
            <div className="metric-value">{fmtMs(summary.p99)}</div>
          </div>
        </div>
      </div>

      <div className="toggles">
        <button className="btn" onClick={applyNaive}>
          평균만 맞추기(순진)
        </button>
        <button className="btn" onClick={applyHint}>
          꼬리 자르기 힌트
        </button>
        <button className="btn" data-variant="primary" onClick={run} style={{ marginLeft: 'auto' }}>
          {result ? '↻ 다시 판정' : '판정하기'}
        </button>
      </div>

      {result && (
        <div className="verdict" data-k={result.pass ? 'safe' : 'over'}>
          <span className="verdict-icon" aria-hidden="true">
            {result.pass ? '✓' : '×'}
          </span>
          <div>{feedback(result)}</div>
        </div>
      )}
    </div>
  );
}

function feedback(r: Result): string {
  if (r.pass) {
    return `통과. 평균 ${fmtMs(r.mean)}을 지키면서 p99를 ${fmtMs(r.p99)}까지 내렸습니다. 사용자 체감은 평균이 아니라 느린 꼬리입니다.`;
  }
  if (r.mean > meanLimitMs) {
    return `평균이 ${fmtMs(r.mean)}로 한도를 넘었습니다. 빠른 요청을 조금 더 빠르게, 또는 느린 요청을 덜 느리게 만드세요.`;
  }
  if (r.p99 > p99LimitMs) {
    return `평균(${fmtMs(r.mean)})은 멀쩡한데 p99가 ${fmtMs(r.p99)}입니다. 1%만 극단적으로 느리면 대시보드는 괜찮고 사용자는 불평합니다. 꼬리 높이를 자르세요.`;
  }
  return '조건을 다시 확인해 주세요.';
}

function fmtMs(ms: number) {
  if (!Number.isFinite(ms)) return '—';
  return ms >= 1000
    ? `${(ms / 1000).toFixed(1)}초`
    : `${ms < 10 ? ms.toFixed(1) : Math.round(ms)}ms`;
}
