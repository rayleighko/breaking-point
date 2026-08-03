export const OPENROUTER_API = 'https://openrouter.ai/api/v1';

export interface OpenRouterModel {
  id: string;
  name: string;
  contextLength?: number;
  pricing?: { prompt?: string; completion?: string };
}

interface ModelsResponse {
  data?: Array<{
    id?: unknown;
    name?: unknown;
    context_length?: unknown;
    pricing?: { prompt?: unknown; completion?: unknown };
  }>;
}

interface ChatResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
  error?: { message?: unknown };
}

export interface StudyMessage {
  role: 'user' | 'assistant';
  content: string;
}

const FAMILY_ORDER = ['qwen', 'kimi', 'deepseek'];

export function selectFreeStudyModels(input: ModelsResponse): OpenRouterModel[] {
  const models = (input.data ?? [])
    .filter(
      (model): model is typeof model & { id: string; name: string } =>
        typeof model.id === 'string' && typeof model.name === 'string',
    )
    .filter((model) => model.id.endsWith(':free'))
    .filter((model) => {
      const searchable = `${model.id} ${model.name}`.toLowerCase();
      return FAMILY_ORDER.some((family) => searchable.includes(family));
    })
    .map((model) => ({
      id: model.id,
      name: model.name,
      contextLength: typeof model.context_length === 'number' ? model.context_length : undefined,
      pricing: {
        prompt: typeof model.pricing?.prompt === 'string' ? model.pricing.prompt : undefined,
        completion:
          typeof model.pricing?.completion === 'string' ? model.pricing.completion : undefined,
      },
    }));

  return models.sort((a, b) => {
    const familyRank = (model: OpenRouterModel) => {
      const searchable = `${model.id} ${model.name}`.toLowerCase();
      const index = FAMILY_ORDER.findIndex((family) => searchable.includes(family));
      return index < 0 ? FAMILY_ORDER.length : index;
    };
    return familyRank(a) - familyRank(b) || a.name.localeCompare(b.name);
  });
}

export async function loadFreeStudyModels(signal?: AbortSignal): Promise<OpenRouterModel[]> {
  const response = await fetch(`${OPENROUTER_API}/models?output_modalities=text`, { signal });
  if (!response.ok) throw new Error(`무료 model 목록을 불러오지 못했습니다. (${response.status})`);
  return selectFreeStudyModels((await response.json()) as ModelsResponse);
}

export async function askStudyAssistant({
  apiKey,
  endpoint,
  model,
  messages,
  signal,
}: {
  apiKey?: string;
  endpoint?: string;
  model: string;
  messages: StudyMessage[];
  signal?: AbortSignal;
}): Promise<string> {
  const useGateway = Boolean(endpoint);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!useGateway && apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (!useGateway) {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-OpenRouter-Title'] = 'Breaking Point';
  }

  const response = await fetch(endpoint || `${OPENROUTER_API}/chat/completions`, {
    method: 'POST',
    signal,
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 900,
      messages: useGateway
        ? messages
        : [
            {
              role: 'system',
              content:
                '당신은 Breaking Point의 한국어 학습 코치입니다. 존칭을 사용하세요. 정답을 바로 던지기보다 현상, 중학교 수준의 산수, 업계 용어 순서로 설명하세요. 실제 benchmark와 browser model을 구분하고 모르는 수치나 출처를 만들지 마세요. 사용자가 스스로 다음 실험을 해볼 수 있도록 짧은 질문이나 조작 제안으로 마무리하세요.',
            },
            ...messages,
          ],
    }),
  });

  const payload = (await response.json()) as ChatResponse;
  if (!response.ok) {
    const message = typeof payload.error?.message === 'string' ? payload.error.message : null;
    throw new Error(message ?? `요청에 실패했습니다. (${response.status})`);
  }
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim())
    throw new Error('Model이 비어 있는 답변을 반환했습니다.');
  return content.trim();
}
