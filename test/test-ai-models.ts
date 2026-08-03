import assert from 'node:assert/strict';

import { selectFreeStudyModels } from '../src/lib/ai/openrouter.ts';
import { isAllowedModel, isValidContext } from '../workers/ai-proxy/src/index.js';

const selected = selectFreeStudyModels({
  data: [
    { id: 'qwen/qwen-test:free', name: 'Qwen Test (free)', context_length: 32_000 },
    { id: 'moonshotai/kimi-test:free', name: 'Kimi Test (free)' },
    { id: 'deepseek/deepseek-test', name: 'DeepSeek Paid' },
    { id: 'meta/llama-test:free', name: 'Llama Free' },
    { id: 'deepseek/deepseek-free:free', name: 'DeepSeek Free' },
  ],
});

assert.deepEqual(
  selected.map((model) => model.id),
  ['qwen/qwen-test:free', 'moonshotai/kimi-test:free', 'deepseek/deepseek-free:free'],
);
console.log('PASS  무료 Qwen·Kimi·DeepSeek model catalog filtering');

assert.equal(isAllowedModel('openrouter/free'), true);
assert.equal(isAllowedModel('qwen/example:free'), true);
assert.equal(isAllowedModel('deepseek/example:paid'), false);
assert.equal(isAllowedModel('openai/frontier:free'), false);
console.log('PASS  AI gateway 무료 model allowlist');

assert.equal(isValidContext('{"lab":"connection-pool"}'), true);
assert.equal(isValidContext('x'.repeat(3_001)), false);
assert.equal(isValidContext({ lab: 'connection-pool' }), false);
console.log('PASS  AI gateway 실험 Snapshot 크기와 형식 제한');
