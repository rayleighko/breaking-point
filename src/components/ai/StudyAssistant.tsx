import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  askStudyAssistant,
  loadFreeStudyModels,
  type OpenRouterModel,
  type StudyMessage,
} from '@/lib/ai/openrouter';

const AUTO_MODEL: OpenRouterModel = { id: 'openrouter/free', name: '무료 model 자동 선택' };
const SERVICE_API_URL = import.meta.env.PUBLIC_AI_API_URL?.trim();
const WELCOME: StudyMessage = {
  role: 'assistant',
  content:
    '안녕하세요. 저는 실험을 함께 살펴보는 고양이 코치입니다. 이해되지 않는 현상이나 직접 바꿔 본 설정을 알려주시면, 답보다 먼저 확인할 단서를 같이 찾아드릴게요.',
};

export default function StudyAssistant() {
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<OpenRouterModel[]>([AUTO_MODEL]);
  const [model, setModel] = useState(AUTO_MODEL.id);
  const [catalogMessage, setCatalogMessage] = useState('무료 model 목록을 확인하고 있습니다…');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<StudyMessage[]>([WELCOME]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    loadFreeStudyModels(controller.signal)
      .then((available) => {
        setModels([AUTO_MODEL, ...available]);
        setCatalogMessage(
          available.length
            ? `현재 선택 가능한 Qwen·Kimi·DeepSeek 무료 variant ${available.length}개`
            : '현재 지정한 model family의 무료 variant가 없어 자동 선택을 사용합니다.',
        );
      })
      .catch(() => setCatalogMessage('목록을 불러오지 못해 무료 model 자동 선택만 제공합니다.'));
    return () => controller.abort();
  }, []);

  const selectedName = useMemo(
    () => models.find((candidate) => candidate.id === model)?.name ?? model,
    [model, models],
  );

  const submit = async () => {
    setError('');
    if (!SERVICE_API_URL && !apiKey.trim()) {
      setError(
        '아직 서비스 API가 연결되지 않았습니다. 개발 중에는 OpenRouter API key를 입력해 주세요.',
      );
      return;
    }
    if (!question.trim() || loading) return;

    const nextMessages = [
      ...messages,
      { role: 'user', content: question.trim() } satisfies StudyMessage,
    ];
    setMessages(nextMessages);
    setQuestion('');
    setLoading(true);
    try {
      const answer = await askStudyAssistant({
        apiKey: apiKey.trim() || undefined,
        endpoint: SERVICE_API_URL,
        model,
        messages: nextMessages,
      });
      setMessages((current) => [...current, { role: 'assistant', content: answer }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '답변을 가져오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-[var(--line)] bg-[var(--bg-card)] p-4">
        <div className="grid place-items-center rounded-xl bg-[var(--bg-soft)] py-5 text-center">
          <div
            className={`text-5xl ${loading ? 'animate-bounce' : ''}`}
            aria-label="고양이 학습 코치"
          >
            🐈
          </div>
          <b className="mt-2 text-sm">Breakpoint Cat</b>
          <span className="text-xs text-[var(--fg-dim)]">
            {loading ? '생각 중…' : '함께 살펴볼 준비가 됐어요'}
          </span>
        </div>

        <label className="mt-4 grid gap-1 text-sm text-[var(--fg-muted)]">
          무료 model
          <select
            value={model}
            onChange={(event) => setModel(event.currentTarget.value)}
            className="rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--fg)]"
          >
            {models.map((candidate) => (
              <option value={candidate.id} key={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-[var(--fg-dim)]">{catalogMessage}</p>

        {!SERVICE_API_URL && (
          <details className="mt-4 border-t border-[var(--line-soft)] pt-3">
            <summary className="cursor-pointer text-xs text-[var(--fg-muted)]">
              개발용 API key 사용
            </summary>
            <label className="mt-3 grid gap-1 text-xs text-[var(--fg-muted)]">
              OpenRouter API key
              <input
                type="password"
                value={apiKey}
                autoComplete="off"
                placeholder="sk-or-v1-…"
                onChange={(event) => setApiKey(event.currentTarget.value)}
                className="rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 font-mono text-[var(--fg)]"
              />
            </label>
            <p className="mt-2 text-xs text-[var(--fg-dim)]">
              Key는 이 tab의 memory에만 보관됩니다.
            </p>
          </details>
        )}
      </aside>

      <section className="flex min-h-[540px] min-w-0 flex-col rounded-xl border border-[var(--line)] bg-[var(--bg-card)]">
        <div className="flex items-center justify-between border-b border-[var(--line-soft)] px-4 py-3">
          <h2 className="!m-0 !border-0 !p-0 text-base">AI 학습 코치</h2>
          <span className="max-w-[50%] truncate text-xs text-[var(--fg-dim)]">{selectedName}</span>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && <span aria-hidden="true">🐾</span>}
              <p
                className={`m-0 max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-6 ${message.role === 'user' ? 'bg-[var(--accent)] text-[#071018]' : 'border border-[var(--line)] bg-[var(--bg-soft)]'}`}
              >
                {message.content}
              </p>
            </div>
          ))}
          {loading && <p className="text-sm text-[var(--fg-dim)]">🐾 단서를 정리하고 있습니다…</p>}
        </div>
        <div className="border-t border-[var(--line-soft)] p-3">
          {error && (
            <div
              role="alert"
              className="mb-3 rounded-md border border-[var(--bad)] bg-[var(--bad-bg)] p-2 text-sm text-[#ffb3ae]"
            >
              {error}
            </div>
          )}
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor="coach-question">
              AI 학습 코치에게 질문
            </label>
            <textarea
              id="coach-question"
              value={question}
              onChange={(event) => setQuestion(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
              rows={2}
              placeholder="무엇이 이해되지 않는지 적어 주세요…"
              className="min-w-0 flex-1 resize-none rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)]"
            />
            <Button onClick={submit} disabled={loading || !question.trim()}>
              {loading ? '생각 중' : '보내기'}
            </Button>
          </div>
          <p className="mb-0 mt-2 text-xs text-[var(--fg-dim)]">
            Enter로 보내고 Shift+Enter로 줄을 바꿉니다. 민감한 정보는 입력하지 마세요.
          </p>
        </div>
      </section>
    </div>
  );
}
