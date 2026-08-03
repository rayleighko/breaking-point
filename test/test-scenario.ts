import assert from 'node:assert/strict';

import { Sim } from '../src/lib/engine.ts';
import { SPIKE_EXAMPLE } from '../src/simulation/examples.ts';
import { rateAt, toSimConfig, validateScenario } from '../src/simulation/schema.ts';

const valid = validateScenario(SPIKE_EXAMPLE);
assert.equal(valid.ok, true, valid.errors.join('\n'));

const reversed = structuredClone(SPIKE_EXAMPLE) as unknown as {
  traffic: { phases: Array<{ atMs: number }> };
};
reversed.traffic.phases[1]!.atMs = 0;
assert.equal(
  validateScenario(reversed).ok,
  false,
  '동일하거나 감소하는 phase 시간을 거절해야 합니다.',
);

const oversized = { ...SPIKE_EXAMPLE, durationMs: 120_001 };
assert.equal(
  validateScenario(oversized).ok,
  false,
  'browser 실행 상한을 넘는 duration을 거절해야 합니다.',
);

function execute() {
  const sim = new Sim(toSimConfig(SPIKE_EXAMPLE), SPIKE_EXAMPLE.seed);
  for (let elapsed = 0; elapsed < SPIKE_EXAMPLE.durationMs; elapsed += 10) {
    sim.setConfig({ arrivalRate: rateAt(SPIKE_EXAMPLE, elapsed) });
    sim.step(10);
  }
  return sim.stats();
}

assert.deepEqual(execute(), execute(), '같은 Scenario와 seed는 같은 결과를 내야 합니다.');
console.log('PASS  Scenario validation, 실행 상한과 고정 seed 재현성');
