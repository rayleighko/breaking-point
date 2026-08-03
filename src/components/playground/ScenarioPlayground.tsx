import { useMemo, useRef, useState } from 'react';

import Chart, { type ChartHandle } from '@/components/sim/Chart';
import Stage, { type StageHandle } from '@/components/sim/Stage';
import { useSimLoop } from '@/components/sim/useSimLoop';
import { Button } from '@/components/ui/Button';
import { Sim, type Stats } from '@/lib/engine';
import { SPIKE_EXAMPLE } from '@/simulation/examples';
import { rateAt, toSimConfig, validateScenario, type QueueingScenario } from '@/simulation/schema';
import { useSimulationPreferences, type PlaybackSpeed } from '@/stores/simulation-preferences';
import '@/styles/playground.css';
import '@/styles/sim.css';

const INITIAL_JSON = JSON.stringify(SPIKE_EXAMPLE, null, 2);

export default function ScenarioPlayground() {
  const [source, setSource] = useState(INITIAL_JSON);
  const [scenario, setScenario] = useState<QueueingScenario>(SPIKE_EXAMPLE);
  const [sim, setSim] = useState(() => new Sim(toSimConfig(SPIKE_EXAMPLE), SPIKE_EXAMPLE.seed));
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>(() => sim.stats());
  const playbackSpeed = useSimulationPreferences((state) => state.playbackSpeed);
  const setPlaybackSpeed = useSimulationPreferences((state) => state.setPlaybackSpeed);
  const stageRef = useRef<StageHandle>(null);
  const chartRef = useRef<ChartHandle>(null);

  const run = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(source);
    } catch (error) {
      setErrors([`JSON 문법을 확인해 주세요: ${(error as Error).message}`]);
      return;
    }
    const result = validateScenario(parsed);
    if (!result.ok || !result.scenario) {
      setErrors(result.errors);
      return;
    }
    const next = new Sim(toSimConfig(result.scenario), result.scenario.seed);
    setErrors([]);
    setScenario(result.scenario);
    setSim(next);
    setStats(next.stats());
    setProgress(0);
    chartRef.current?.clear();
    stageRef.current?.reset();
    setRunning(true);
  };

  useSimLoop({
    sim,
    running,
    speed: playbackSpeed,
    stopAt: scenario.durationMs,
    rateAt: (t) => rateAt(scenario, t),
    onFrame: () => stageRef.current?.draw(),
    onSample: (t, next) => {
      setStats(next);
      setProgress(Math.min(1, t / scenario.durationMs));
      chartRef.current?.push(t, next);
      chartRef.current?.draw();
    },
    onDone: () => setRunning(false),
  });

  const issueUrl = useMemo(() => {
    const body = `## 관찰한 문제\n\n<!-- 기대한 결과와 실제 결과를 적어 주세요. -->\n\n## Scenario JSON\n\n\`\`\`json\n${source}\n\`\`\`\n\n## 마지막 관찰값\n\n- p99: ${Math.round(stats.p99)}ms\n- error rate: ${(stats.errorRate * 100).toFixed(2)}%\n- throughput: ${stats.throughput.toFixed(1)} RPS\n- queue: ${stats.queueLen}`;
    return `https://github.com/rayleighko/breaking-point/issues/new?template=simulation-report.md&title=${encodeURIComponent(`[Simulation] ${scenario.title}`)}&body=${encodeURIComponent(body)}`;
  }, [scenario.title, source, stats]);

  return (
    <div className="playground">
      <section className="editor-pane">
        <div className="pane-head">
          <b>Scenario JSON</b>
          <span>schemaVersion 1 · queueing.v1</span>
        </div>
        <textarea
          aria-label="Simulation Scenario JSON"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          disabled={running}
        />
        {errors.length > 0 && (
          <div className="json-errors" role="alert">
            <b>실행할 수 없습니다.</b>
            <ul>
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="editor-actions">
          <Button onClick={run} disabled={running}>
            {running ? `실행 중… ${Math.round(progress * 100)}%` : '검증하고 실행하기'}
          </Button>
          <Button variant="outline" onClick={() => setSource(INITIAL_JSON)} disabled={running}>
            예제로 되돌리기
          </Button>
          <label className="speed-control">
            재생 속도
            <select
              value={playbackSpeed}
              disabled={running}
              onChange={(event) =>
                setPlaybackSpeed(Number(event.currentTarget.value) as PlaybackSpeed)
              }
            >
              <option value={1}>1×</option>
              <option value={4}>4×</option>
              <option value={8}>8×</option>
            </select>
          </label>
        </div>
      </section>
      <section className="result-pane">
        <div className="pane-head">
          <b>{scenario.title}</b>
          <span>
            {playbackSpeed}배속 · seed {scenario.seed}
          </span>
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-label="Simulation 진행률"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i style={{ width: `${progress * 100}%` }} />
        </div>
        <Stage ref={stageRef} sim={sim} />
        <div className="play-metrics">
          <span>
            <small>p99</small>
            <b>{Math.round(stats.p99)}ms</b>
          </span>
          <span>
            <small>에러율</small>
            <b>{(stats.errorRate * 100).toFixed(2)}%</b>
          </span>
          <span>
            <small>처리량</small>
            <b>{stats.throughput.toFixed(1)}/초</b>
          </span>
          <span>
            <small>대기열</small>
            <b>{stats.queueLen}개</b>
          </span>
        </div>
        <Chart ref={chartRef} />
        <div className="report">
          <a href={issueUrl} target="_blank" rel="noopener">
            이 결과를 GitHub Issue로 신고하기 ↗
          </a>
          <p>
            Scenario JSON과 마지막 관찰값이 함께 전달됩니다. 공개하면 안 되는 정보는 입력하지 말아
            주세요.
          </p>
        </div>
      </section>
    </div>
  );
}
