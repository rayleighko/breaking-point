import { useEffect, useRef } from 'react';

import type { Sim, Stats } from '@/lib/engine';

interface Opts {
  sim: Sim | null;
  running: boolean;
  /** 배속. 1 = 실시간 */
  speed?: number;
  /** 매 프레임 (그리기) */
  onFrame?: () => void;
  /** 약 10Hz (지표 갱신) */
  onSample?: (t: number, s: Stats) => void;
  /** 시점별 도착률 (트래픽 시나리오) */
  rateAt?: (t: number) => number;
  /** 이 시각(ms)에 도달하면 자동 정지 */
  stopAt?: number;
  onDone?: () => void;
}

const DT = 2; // 시뮬 스텝 (ms)
const MAX_PER_FRAME = 500; // 한 프레임에 소화할 최대 시뮬 시간 (ms)

/** requestAnimationFrame 으로 시뮬레이션을 굴리는 훅. */
export function useSimLoop({
  sim,
  running,
  speed = 1,
  onFrame,
  onSample,
  rateAt,
  stopAt,
  onDone,
}: Opts) {
  // 렌더 중 ref 를 쓰지 않는다 (React 19 동시성 렌더링에서 버려진 렌더의 콜백이 남을 수 있음)
  const cb = useRef({ onFrame, onSample, rateAt, onDone });
  useEffect(() => {
    cb.current = { onFrame, onSample, rateAt, onDone };
  });

  useEffect(() => {
    if (!sim || !running) return;
    let raf = 0;
    let last = performance.now();
    let sampleAcc = 0;
    let stopped = false;

    const tick = (now: number) => {
      const wall = Math.min(120, now - last);
      last = now;
      let budget = Math.min(MAX_PER_FRAME, wall * speed);

      while (budget >= DT && !stopped) {
        sim.step(DT, cb.current.rateAt?.(sim.now));
        budget -= DT;
        sampleAcc += DT;
        if (sampleAcc >= 100) {
          sampleAcc = 0;
          cb.current.onSample?.(sim.now, sim.stats());
        }
        if (stopAt != null && sim.now >= stopAt) {
          stopped = true;
        }
      }

      cb.current.onFrame?.();
      if (stopped) {
        cb.current.onSample?.(sim.now, sim.stats());
        cb.current.onDone?.();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sim, running, speed, stopAt]);
}
