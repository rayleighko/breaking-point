import { useEffect, useRef } from 'react';

import { waitCurvePoints, type WaitCurvePoint } from '@/lib/queue-sense';

interface Props {
  poolSize: number;
  serviceTimeMs: number;
  /** 현재 이용률 0~1 */
  rho: number;
  /** 현재 이론 대기시간 (ms). Infinity면 표시만 생략 */
  waitMs: number;
  markers?: Array<{ rho: number; label: string }>;
}

const DEFAULT_MARKERS = [
  { rho: 0.7, label: '70%' },
  { rho: 0.95, label: '95%' },
];

/** 이용률(ρ) → 이론 대기시간 곡선. 계산은 queue-sense/theory에 위임한다. */
export default function WaitCurve({
  poolSize,
  serviceTimeMs,
  rho,
  waitMs,
  markers = DEFAULT_MARKERS,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<WaitCurvePoint[]>([]);
  const stateRef = useRef({ rho, waitMs, markers });

  const draw = () => {
    const cv = canvasRef.current;
    const parent = cv?.parentElement;
    if (!cv || !parent) return;
    const { rho: curRho, waitMs: curWait, markers: curMarkers } = stateRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = parent.clientWidth;
    const H = 200;
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

    const padL = 44,
      padR = 14,
      padT = 18,
      padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const points = pointsRef.current;
    if (points.length < 2) return;

    const maxWait = Math.max(
      200,
      ...points.map((p) => p.waitMs),
      Number.isFinite(curWait) ? curWait : 0,
    );
    const LO = Math.log10(0.2);
    const HI = Math.log10(maxWait * 1.15);
    const xOf = (r: number) => padL + plotW * ((r - 0.1) / (0.98 - 0.1));
    const yOf = (ms: number) => {
      const v = Math.log10(Math.max(0.2, ms));
      return padT + plotH * (1 - (v - LO) / (HI - LO));
    };

    g.font = '9.5px ui-monospace, monospace';
    g.textBaseline = 'middle';
    for (const [ms, label] of [
      [1, '1ms'],
      [10, '10ms'],
      [100, '100ms'],
      [1000, '1초'],
    ] as const) {
      if (ms > maxWait * 1.2) continue;
      const y = yOf(ms);
      g.strokeStyle = C.line;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(padL, y + 0.5);
      g.lineTo(W - padR, y + 0.5);
      g.stroke();
      g.fillStyle = C.dim;
      g.textAlign = 'right';
      g.fillText(label, padL - 6, y);
    }

    for (const r of [0.5, 0.7, 0.9]) {
      const x = xOf(r);
      g.strokeStyle = C.line;
      g.beginPath();
      g.moveTo(x + 0.5, padT);
      g.lineTo(x + 0.5, padT + plotH);
      g.stroke();
    }

    const x70 = xOf(0.7);
    g.fillStyle = C.warnBg;
    g.fillRect(x70, padT, W - padR - x70, plotH);

    g.beginPath();
    points.forEach((p, i) => {
      const x = xOf(p.rho);
      const y = yOf(p.waitMs);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.strokeStyle = C.accent;
    g.lineWidth = 2.2;
    g.lineJoin = 'round';
    g.stroke();

    for (const m of curMarkers) {
      const pt = points.reduce((best, p) =>
        Math.abs(p.rho - m.rho) < Math.abs(best.rho - m.rho) ? p : best,
      );
      const x = xOf(pt.rho);
      const y = yOf(pt.waitMs);
      g.fillStyle = m.rho >= 0.9 ? C.bad : C.warn;
      g.beginPath();
      g.arc(x, y, 4, 0, Math.PI * 2);
      g.fill();
      g.textAlign = 'center';
      g.font = '600 10px ui-sans-serif, system-ui, sans-serif';
      g.fillText(m.label, x, y - 10);
    }

    if (curRho >= 0.1 && curRho <= 0.98 && Number.isFinite(curWait)) {
      const x = xOf(curRho);
      const y = yOf(curWait);
      g.strokeStyle = C.fg;
      g.lineWidth = 1;
      g.setLineDash([3, 3]);
      g.beginPath();
      g.moveTo(x, padT);
      g.lineTo(x, padT + plotH);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = C.fg;
      g.beginPath();
      g.arc(x, y, 5.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = C.card;
      g.beginPath();
      g.arc(x, y, 2.5, 0, Math.PI * 2);
      g.fill();
    }

    g.fillStyle = C.dim;
    g.font = '10px ui-sans-serif, system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.fillText('이용률 →', padL + plotW / 2, H - 8);
    g.textAlign = 'left';
    g.fillText('대기시간 (로그)', padL, padT - 6);
  };

  useEffect(() => {
    pointsRef.current = waitCurvePoints({ poolSize, serviceTimeMs });
    draw();
  }, [poolSize, serviceTimeMs]);

  useEffect(() => {
    stateRef.current = { rho, waitMs, markers };
    draw();
  }, [rho, waitMs, markers]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    window.addEventListener('themechange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('themechange', onResize);
    };
  }, []);

  const label = Number.isFinite(waitMs)
    ? `이용률 ${(rho * 100).toFixed(0)}%에서 이론 대기시간 ${fmtMs(waitMs)}`
    : `이용률 ${(rho * 100).toFixed(0)}% — 대기시간이 발산합니다`;

  return <canvas ref={canvasRef} className="stage" role="img" aria-label={label} />;
}

function palette(element: HTMLElement) {
  const style = getComputedStyle(element);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    line: token('--line-soft'),
    dim: token('--fg-dim'),
    accent: token('--accent'),
    warn: token('--warn'),
    warnBg: token('--warn-bg'),
    bad: token('--bad'),
    fg: token('--fg'),
    card: token('--bg-card'),
  };
}

function fmtMs(ms: number) {
  if (!ms) return '—';
  return ms >= 1000
    ? `${(ms / 1000).toFixed(1)}초`
    : `${ms < 10 ? ms.toFixed(1) : Math.round(ms)}ms`;
}
