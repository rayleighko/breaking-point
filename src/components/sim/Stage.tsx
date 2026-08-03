import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import type { Sim } from '@/lib/engine';

export interface StageHandle {
  draw: () => void;
  reset: () => void;
}

interface Props {
  sim: Sim;
}

interface P {
  x: number;
  y: number;
}

/**
 * 은행 창구 비유 시각화.
 *   왼쪽에서 요청(손님)이 들어와 → 대기줄에 서고 → 빈 창구에서 처리되고 → 오른쪽으로 나간다.
 *   창구가 부족하면 줄이 길어지고, 오래 기다린 손님은 빨갛게 이탈한다.
 */
const Stage = forwardRef<StageHandle, Props>(({ sim }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pos = useRef<Map<number, P>>(new Map());
  const reduce = useRef<boolean | null>(null);

  const draw = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const parent = cv.parentElement;
    if (!parent) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = parent.clientWidth;
    const H = W < 560 ? 260 : 300;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.height = `${H}px`;
    }
    const g = cv.getContext('2d');
    if (!g) return;
    const C = canvasPalette(cv);
    if (reduce.current === null) {
      reduce.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    /* ── 레이아웃 ── */
    const compact = W < 560;
    const padT = 26,
      padB = 18;
    const gateX = compact ? 22 : 34;
    const qRight = W * (compact ? 0.44 : 0.42);
    const qLeft = gateX + 22;
    const srvX = W * (compact ? 0.52 : 0.5);
    const srvRight = W * (compact ? 0.86 : 0.84);
    const exitX = W - 16;
    const midY = (padT + (H - padB)) / 2;

    // stats() 는 백분위 정렬을 하므로 매 프레임 호출하지 않는다. 필요한 값만 직접 센다.
    const N = sim.servers.length;
    const qLen = sim.queue.length;
    let busy = 0;
    for (const sv of sim.servers) if (sv) busy++;

    /* ── 구역 라벨 ── */
    g.font = '600 10.5px ui-monospace, monospace';
    g.textBaseline = 'top';
    g.fillStyle = C.dim;
    g.textAlign = 'left';
    g.fillText('도착', gateX - 12, 8);
    g.fillText(`대기줄  ${qLen.toLocaleString()}`, qLeft, 8);
    g.fillText(`커넥션 ${busy}/${N}`, srvX, 8);
    g.textAlign = 'right';
    g.fillText('완료 / 실패', exitX, 8);
    g.textAlign = 'left';

    /* ── 창구(서버) 그리드 ── */
    const shown = Math.min(N, 48);
    const rows = Math.min(shown, compact ? 8 : 12);
    const cols = Math.max(1, Math.ceil(shown / rows));
    const gapX = 4,
      gapY = 3;
    const areaW = srvRight - srvX,
      areaH = H - padT - padB;
    const boxW = Math.max(14, Math.min(80, areaW / cols - gapX));
    const boxH = Math.max(7, Math.min(20, areaH / rows - gapY));
    const gridH = rows * (boxH + gapY) - gapY;
    const gridTop = padT + (areaH - gridH) / 2;

    const slotPos = (s: number): P => {
      const i = Math.min(s, shown - 1);
      const c = Math.floor(i / rows),
        r = i % rows;
      return {
        x: srvX + c * (boxW + gapX) + boxW / 2,
        y: gridTop + r * (boxH + gapY) + boxH / 2,
      };
    };

    for (let s = 0; s < shown; s++) {
      const p = slotPos(s);
      const x = p.x - boxW / 2,
        y = p.y - boxH / 2;
      const r = sim.servers[s];
      g.fillStyle = C.bgSoft;
      roundRect(g, x, y, boxW, boxH, 3);
      g.fill();
      if (r) {
        const dur = Math.max(1, r.doneAt - (r.startedAt ?? sim.now));
        const prog = Math.max(0, Math.min(1, (sim.now - (r.startedAt ?? sim.now)) / dur));
        g.fillStyle = C.accent;
        g.globalAlpha = 0.85;
        roundRect(g, x, y, Math.max(2, boxW * prog), boxH, 3);
        g.fill();
        g.globalAlpha = 1;
      }
      g.strokeStyle = r ? C.accent : C.lineSoft;
      g.globalAlpha = r ? 0.5 : 1;
      g.lineWidth = 1;
      roundRect(g, x + 0.5, y + 0.5, boxW - 1, boxH - 1, 3);
      g.stroke();
      g.globalAlpha = 1;
    }
    if (N > shown) {
      g.fillStyle = C.dim;
      g.font = '10px ui-monospace, monospace';
      g.fillText(`+${N - shown}`, srvX, gridTop + gridH + 5);
    }

    /* ── 대기줄 위치 계산 ── */
    const dotR = compact ? 3.2 : 3.8;
    const stepX = dotR * 2 + 3.4;
    const perRow = Math.max(6, Math.floor((qRight - qLeft) / stepX));
    const qRows = 3;
    const visQ = Math.min(sim.queue.length, perRow * qRows);
    const rowGap = 13;
    const qTop = midY - ((Math.min(qRows, Math.ceil(visQ / perRow) || 1) - 1) * rowGap) / 2;

    const queuePos = (i: number): P => {
      const r = Math.floor(i / perRow),
        c = i % perRow;
      return { x: qRight - c * stepX, y: qTop + r * rowGap };
    };

    /* ── 목표 위치로 부드럽게 이동 ── */
    const alive = new Set<number>();
    const lerp = (id: number, t: P, snap = false): P => {
      let p = pos.current.get(id);
      if (!p) {
        p = { x: gateX, y: midY + (Math.random() - 0.5) * 26 };
        pos.current.set(id, p);
      }
      const k = snap || reduce.current ? 1 : 0.3; // 모션 최소화 선호 시 보간 없이 즉시 이동
      p.x += (t.x - p.x) * k;
      p.y += (t.y - p.y) * k;
      return p;
    };

    /* ── 대기줄 그리기 (뒤에서 앞으로) ── */
    const now = sim.now;
    const to = sim.cfg.acquireTimeout;
    for (let i = visQ - 1; i >= 0; i--) {
      const r = sim.queue[i]!;
      alive.add(r.id);
      const p = lerp(r.id, queuePos(i));
      // 대기가 길어질수록 노랑→빨강 (곧 이탈)
      const waited = (now - r.enqueuedAt) / to;
      const col = waited > 0.75 ? C.bad : waited > 0.4 ? C.warn : C.muted;
      g.beginPath();
      g.arc(p.x, p.y, dotR, 0, Math.PI * 2);
      g.fillStyle = col;
      g.globalAlpha =
        waited > 0.75 && !reduce.current ? 0.6 + 0.4 * Math.abs(Math.sin(now / 90)) : 0.9;
      g.fill();
      g.globalAlpha = 1;
    }
    if (sim.queue.length > visQ) {
      g.fillStyle = C.bad;
      g.font = '600 11px ui-monospace, monospace';
      g.textAlign = 'left';
      g.fillText(
        `+${(sim.queue.length - visQ).toLocaleString()}명 더 대기중`,
        qLeft - 4,
        qTop + qRows * rowGap + 2,
      );
    }

    /* ── 처리 중 요청 (창구 위 점) ── */
    for (let s = 0; s < N; s++) {
      const r = sim.servers[s];
      if (!r) continue;
      alive.add(r.id);
      lerp(r.id, slotPos(s));
    }

    /* ── 퇴장 애니메이션 ── */
    for (const e of sim.exits) {
      const age = (now - e.at) / 700;
      if (age >= 1) continue;
      const from = pos.current.get(e.id);
      if (!from) continue;
      alive.add(e.id);
      const ease = 1 - Math.pow(1 - age, 2);
      const targetY = e.ok ? midY - 34 : midY + 34;
      const x = from.x + (exitX - from.x) * ease;
      const y = from.y + (targetY - from.y) * ease;
      g.beginPath();
      g.arc(x, y, dotR + (e.ok ? 0 : 0.6), 0, Math.PI * 2);
      g.fillStyle = e.ok ? C.ok : e.willRetry ? C.warn : C.bad;
      g.globalAlpha = 1 - ease * 0.85;
      g.fill();
      g.globalAlpha = 1;
    }

    /* ── 유입구 ── */
    const inflow = Math.min(1, sim.cfg.arrivalRate / 400);
    g.strokeStyle = C.accent;
    g.globalAlpha = 0.25 + 0.5 * inflow;
    g.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const t = (now / (620 - inflow * 400) + i / 3) % 1;
      const x = gateX - 14 + t * 20;
      g.beginPath();
      g.moveTo(x, midY - 7);
      g.lineTo(x + 6, midY);
      g.lineTo(x, midY + 7);
      g.stroke();
    }
    g.globalAlpha = 1;

    /* ── 출구 라벨 ── */
    g.font = '600 10.5px ui-monospace, monospace';
    g.textAlign = 'right';
    g.fillStyle = C.ok;
    g.fillText('성공', exitX, midY - 46);
    g.fillStyle = C.bad;
    g.fillText(sim.cfg.retry ? '실패 / 재시도' : '실패', exitX, midY + 34);
    g.textAlign = 'left';

    /* ── 안 쓰는 좌표 정리 (메모리 누수 방지) ── */
    if (pos.current.size > 900) {
      for (const id of pos.current.keys()) if (!alive.has(id)) pos.current.delete(id);
    }
  };

  const reset = () => {
    pos.current.clear();
    draw();
  };

  useImperativeHandle(ref, () => ({ draw, reset }), [sim]);
  useEffect(() => {
    pos.current.clear();
    draw();
  }, [sim]);

  // draw 는 매 렌더 새로 만들어지므로 최신 참조를 ref 에 보관한다 (stale closure 방지)
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  });
  useEffect(() => {
    const onResize = () => drawRef.current();
    window.addEventListener('resize', onResize);
    window.addEventListener('themechange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('themechange', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="stage"
      role="img"
      aria-label="요청이 대기줄에 서고 커넥션에서 처리되어 나가는 과정을 보여주는 애니메이션"
    />
  );
});

function canvasPalette(element: HTMLElement) {
  const style = getComputedStyle(element);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    bgSoft: token('--bg-soft'),
    lineSoft: token('--line-soft'),
    muted: token('--fg-muted'),
    dim: token('--fg-dim'),
    ok: token('--ok'),
    warn: token('--warn'),
    bad: token('--bad'),
    accent: token('--accent'),
  };
}

function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

Stage.displayName = 'Stage';
export default Stage;
