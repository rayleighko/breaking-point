const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_BODY_BYTES = 24_000;
const MAX_MESSAGES = 12;
const SYSTEM_PROMPT =
  '당신은 Breaking Point의 한국어 고양이 학습 코치입니다. 존칭을 사용하세요. 정답을 바로 던지기보다 현상, 중학교 수준의 산수, 업계 용어 순서로 설명하세요. 실제 benchmark와 browser model을 구분하고 수치나 출처를 만들지 마세요. 사용자가 직접 해볼 짧은 실험으로 마무리하세요.';

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': origin,
      Vary: 'Origin',
    },
  });

export const isAllowedModel = (model) =>
  model === 'openrouter/free' ||
  (model.endsWith(':free') && ['qwen', 'kimi', 'deepseek'].some((name) => model.includes(name)));

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    if (origin !== env.ALLOWED_ORIGIN)
      return json({ error: { message: '허용되지 않은 Origin입니다.' } }, 403, env.ALLOWED_ORIGIN);
    if (request.method === 'OPTIONS')
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          Vary: 'Origin',
        },
      });
    if (request.method !== 'POST')
      return json({ error: { message: 'POST 요청만 지원합니다.' } }, 405, origin);

    const length = Number(request.headers.get('Content-Length') ?? 0);
    if (length > MAX_BODY_BYTES)
      return json({ error: { message: '요청이 너무 큽니다.' } }, 413, origin);

    const actor = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { success } = await env.AI_RATE_LIMITER.limit({ key: actor });
    if (!success) return json({ error: { message: '잠시 뒤 다시 질문해 주세요.' } }, 429, origin);

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES)
      return json({ error: { message: '요청이 너무 큽니다.' } }, 413, origin);

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json({ error: { message: '올바른 JSON이 아닙니다.' } }, 400, origin);
    }

    const model = typeof payload.model === 'string' ? payload.model.toLowerCase() : '';
    const messages = Array.isArray(payload.messages) ? payload.messages.slice(-MAX_MESSAGES) : [];
    const validMessages = messages.every(
      (message) =>
        ['user', 'assistant'].includes(message?.role) &&
        typeof message?.content === 'string' &&
        message.content.length <= 4_000,
    );
    if (!isAllowedModel(model) || !messages.length || !validMessages)
      return json({ error: { message: '지원하지 않는 요청입니다.' } }, 400, origin);

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.ALLOWED_ORIGIN,
        'X-OpenRouter-Title': 'Breaking Point',
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 900,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      }),
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': origin,
        Vary: 'Origin',
      },
    });
  },
};
