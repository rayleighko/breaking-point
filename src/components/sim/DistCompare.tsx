import { useEffect, useRef } from 'react';

import { DEFAULT_HIST_EDGES, histogram, type HistBin, type LatencySummary } from '@/lib/p50-p99';

interface Props {
  samples: number[];
  summary: LatencySummary;
  title: string;
  accent?: 'accent' | 'bad';
}

/** 응답시간 분포 히스토그램. 계산은 p50-p99 모듈에 위임한다. */
export default function DistCompare({ samples, summary, title, accent = 'accent' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ samples, summary, title, accent });

  const draw = () => {
    const cv = canvasRef.current;
    const parent = cv?.parentElement;
    if (!cv || !parent) return;
    const { samples: vals, summary: sum, accent: tone } = stateRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = parent.clientWidth;
    const H = 180;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.height = `${H}px`;
    }
    const g = cv.getContext('2d');
    if (!g) return;
    const C = palette(cv);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    const padL = 8,
      padR = 8,
      padT = 10,
      padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const bins: HistBin[] = histogram(vals, [...DEFAULT_HIST_EDGES]);
    const maxCount = Math.max(1, ...bins.map((b) => b.count));
    const barW = plotW / bins.length;
    const fill = tone === 'bad' ? C.bad : C.accent;

    for (let i = 0; i < bins.length; i++) {
      const b = bins[i]!;
      const h = (b.count / maxCount) * plotH;
      const x = padL + i * barW;
      const y = padT + plotH - h;
      g.fillStyle = fill;
      g.globalAlpha = 0.75;
      g.fillRect(x + 1, y, Math.max(1, barW - 2), h);
      g.globalAlpha = 1;
    }

    // p50 / p99 마커
    const mark = (ms: number, color: string, label: string) => {
      const idx = binIndex(ms, bins);
      const x = padL + (idx + 0.5) * barW;
      g.strokeStyle = color;
      g.lineWidth = 1.5;
      g.setLineDash([3, 3]);
      g.beginPath();
      g.moveTo(x + 0.5, padT);
      g.lineTo(x + 0.5, padT + plotH);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = color;
      g.font = '9.5px ui-monospace, monospace';
      g.textAlign = 'center';
      g.fillText(label, x, H - 8);
    };
    if (sum.count) {
      mark(sum.p50, C.dim, 'p50');
      mark(sum.p99, C.bad, 'p99');
    }

    g.fillStyle = C.dim;
    g.font = '9.5px ui-monospace, monospace';
    g.textAlign = 'left';
    g.fillText('빠름', padL, H - 8);
    g.textAlign = 'right';
    g.fillText('느림', W - padR, H - 8);
  };

  useEffect(() => {
    stateRef.current = { samples, summary, title, accent };
    draw();
  }, [samples, summary, title, accent]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    window.addEventListener('themechange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('themechange', onResize);
    };
  }, []);

  const label = `${title}. 평균 ${fmtMs(summary.mean)}, p50 ${fmtMs(summary.p50)}, p99 ${fmtMs(summary.p99)}`;

  return <canvas ref={canvasRef} className="stage" role="img" aria-label={label} />;
}

function binIndex(ms: number, bins: HistBin[]): number {
  for (let i = 0; i < bins.length; i++) {
    const b = bins[i]!;
    const last = i === bins.length - 1;
    if (ms >= b.from && (last ? ms <= b.to : ms < b.to)) return i;
  }
  return ms < bins[0]!.from ? 0 : bins.length - 1;
}

function palette(element: HTMLElement) {
  const style = getComputedStyle(element);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    dim: token('--fg-dim'),
    accent: token('--accent'),
    bad: token('--bad'),
  };
}

function fmtMs(ms: number) {
  if (!ms && ms !== 0) return '—';
  return ms >= 1000
    ? `${(ms / 1000).toFixed(1)}초`
    : `${ms < 10 ? ms.toFixed(1) : Math.round(ms)}ms`;
}
