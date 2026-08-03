import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import type { Stats } from '@/lib/engine';

export interface ChartHandle {
  push: (t: number, s: Stats) => void;
  draw: () => void;
  clear: () => void;
}

interface Sample {
  t: number;
  p50: number;
  p99: number;
  err: number;
  tp: number;
}

const WINDOW_MS = 30_000;
const C = { line: '#212934', dim: '#6b7885', ok: '#3fb950', bad: '#f85149', accent: '#58a6ff' };

/** 시간에 따른 응답시간(p50/p99)과 에러율 그래프. y축은 로그 스케일. */
const Chart = forwardRef<ChartHandle, object>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const data = useRef<Sample[]>([]);

  const push = (t: number, s: Stats) => {
    data.current.push({ t, p50: s.p50, p99: s.p99, err: s.errorRate, tp: s.throughput });
    const cut = t - WINDOW_MS;
    while (data.current.length && data.current[0]!.t < cut) data.current.shift();
  };

  const clear = () => {
    data.current = [];
    draw();
  };

  const draw = () => {
    const cv = canvasRef.current;
    const parent = cv?.parentElement;
    if (!cv || !parent) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = parent.clientWidth,
      H = 108;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.height = `${H}px`;
    }
    const g = cv.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    const padL = 40,
      padR = 8,
      padT = 12,
      padB = 16;
    const plotW = W - padL - padR,
      plotH = H - padT - padB;

    // 로그 스케일: 5ms ~ 20s
    const LO = Math.log10(5),
      HI = Math.log10(20000);
    const yOf = (ms: number) => {
      const v = Math.log10(Math.max(5, ms));
      return padT + plotH * (1 - (v - LO) / (HI - LO));
    };

    // 가로 눈금
    g.font = '9.5px ui-monospace, monospace';
    g.textBaseline = 'middle';
    for (const [ms, label] of [
      [10, '10ms'],
      [100, '100ms'],
      [1000, '1초'],
      [10000, '10초'],
    ] as const) {
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

    const d = data.current;
    if (d.length < 2) {
      g.fillStyle = C.dim;
      g.textAlign = 'center';
      g.fillText('시작을 누르면 응답시간이 기록됩니다', W / 2, H / 2);
      return;
    }
    const t1 = d[d.length - 1]!.t,
      t0 = t1 - WINDOW_MS;
    const xOf = (t: number) => padL + plotW * Math.max(0, Math.min(1, (t - t0) / WINDOW_MS));

    // 에러율: 바닥에서 올라오는 붉은 영역
    g.beginPath();
    g.moveTo(xOf(d[0]!.t), padT + plotH);
    for (const s of d) g.lineTo(xOf(s.t), padT + plotH - plotH * 0.32 * Math.min(1, s.err));
    g.lineTo(xOf(t1), padT + plotH);
    g.closePath();
    g.fillStyle = 'rgba(248,81,73,.18)';
    g.fill();

    // p50 / p99 라인
    const lineOf = (key: 'p50' | 'p99', color: string, width: number, alpha: number) => {
      g.beginPath();
      let started = false;
      for (const s of d) {
        const v = s[key];
        if (v <= 0) continue;
        const x = xOf(s.t),
          y = yOf(v);
        if (!started) {
          g.moveTo(x, y);
          started = true;
        } else g.lineTo(x, y);
      }
      g.strokeStyle = color;
      g.lineWidth = width;
      g.globalAlpha = alpha;
      g.lineJoin = 'round';
      g.stroke();
      g.globalAlpha = 1;
    };
    lineOf('p50', C.accent, 1.2, 0.55);
    lineOf('p99', C.bad, 1.8, 1);

    // 범례
    const last = d[d.length - 1]!;
    g.textAlign = 'left';
    g.font = '600 10px ui-monospace, monospace';
    g.fillStyle = C.bad;
    g.fillText(`p99 ${fmt(last.p99)}`, padL + 4, padT + 5);
    g.fillStyle = C.accent;
    g.globalAlpha = 0.8;
    g.fillText(`p50 ${fmt(last.p50)}`, padL + 82, padT + 5);
    g.globalAlpha = 1;
    g.fillStyle = C.dim;
    g.textAlign = 'right';
    g.fillText('← 최근 30초', W - padR, H - 6);
  };

  useImperativeHandle(ref, () => ({ push, draw, clear }), []);
  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return <canvas ref={canvasRef} className="stage" role="img" aria-label="응답시간 추이 그래프" />;
});

function fmt(ms: number) {
  if (!ms) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}초` : `${Math.round(ms)}ms`;
}

Chart.displayName = 'Chart';
export default Chart;
