import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { Button } from '@/components/ui/Button';
import {
  askStudyAssistant,
  loadFreeStudyModels,
  type OpenRouterModel,
  type StudyMessage,
} from '@/lib/ai/openrouter';
import { useCoachPreferences } from '@/stores/coach-preferences';

const AUTO_MODEL: OpenRouterModel = { id: 'openrouter/free', name: '무료 model 자동 선택' };
const SERVICE_API_URL = import.meta.env.PUBLIC_AI_API_URL?.trim();
const SESSION_KEY = 'breaking-point-coach-messages';
const REQUEST_TIMEOUT_MS = 45_000;
const WELCOME: StudyMessage = {
  role: 'assistant',
  content:
    '안녕하세요. 지금 보고 계신 개념이나 실험에서 막힌 부분을 알려주세요. 답을 바로 드리기보다 먼저 확인할 단서를 함께 찾아보겠습니다.',
};

type PetActivity = 'idle' | 'typing' | 'working' | 'done' | 'error';

const ACTIVITY_LABEL: Record<PetActivity, string> = {
  idle: '쉬는 중',
  typing: '듣는 중',
  working: '답변 작성 중',
  done: '답변 도착',
  error: '확인이 필요해요',
};

export default function PetCoach() {
  const enabled = useCoachPreferences((state) => state.enabled);
  const open = useCoachPreferences((state) => state.open);
  const position = useCoachPreferences((state) => state.position);
  const setEnabled = useCoachPreferences((state) => state.setEnabled);
  const setOpen = useCoachPreferences((state) => state.setOpen);
  const setPosition = useCoachPreferences((state) => state.setPosition);
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 640px)');
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!position || mobile) return;
    const clamped = clampPosition(position, rootRef.current);
    if (clamped.x !== position.x || clamped.y !== position.y) setPosition(clamped);
  }, [mobile, position, setPosition]);

  if (!enabled) return null;

  const style =
    !mobile && position
      ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
      : undefined;
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      mobile ||
      event.button !== 0 ||
      !rootRef.current ||
      (event.target as HTMLElement).closest('button')
    )
      return;
    const rect = rootRef.current.getBoundingClientRect();
    drag.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current || !rootRef.current) return;
    setPosition(
      clampPosition(
        { x: event.clientX - drag.current.dx, y: event.clientY - drag.current.dy },
        rootRef.current,
      ),
    );
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      ref={rootRef}
      className={`pet-coach ${open ? 'pet-coach--open' : ''}`}
      style={style}
      data-testid="pet-coach"
    >
      {open ? (
        <section className="pet-panel" role="dialog" aria-label="AI 학습 코치">
          <header
            className="pet-panel__head"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <div>
              <b>Breaking Point Cat</b>
              <span>AI 학습 코치 · Beta</span>
            </div>
            <div className="pet-panel__actions">
              <button type="button" onClick={() => setPosition(null)} aria-label="펫 위치 초기화">
                ↺
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="AI 학습 코치 접기">
                −
              </button>
              <button
                type="button"
                onClick={() => setEnabled(false)}
                aria-label="AI 학습 코치 끄기"
              >
                ×
              </button>
            </div>
          </header>
          <CoachChat />
        </section>
      ) : (
        <button
          type="button"
          className="pet-launcher"
          aria-label="AI 학습 코치 열기"
          onClick={() => setOpen(true)}
        >
          <PetVisual activity="idle" compact />
          <span className="pet-launcher__beta">Beta</span>
        </button>
      )}
    </div>
  );
}

function CoachChat() {
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<OpenRouterModel[]>([AUTO_MODEL]);
  const [model, setModel] = useState(AUTO_MODEL.id);
  const [catalogMessage, setCatalogMessage] = useState('무료 model 목록을 확인하고 있습니다…');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<StudyMessage[]>(loadMessages);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState<PetActivity>('idle');
  const doneTimer = useRef<number | null>(null);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadFreeStudyModels(controller.signal)
      .then((available) => {
        setModels([AUTO_MODEL, ...available]);
        setCatalogMessage(
          available.length
            ? `Qwen·Kimi·DeepSeek 무료 variant ${available.length}개`
            : '무료 model 자동 선택을 사용합니다.',
        );
      })
      .catch(() => setCatalogMessage('Model 목록을 불러오지 못해 자동 선택을 사용합니다.'));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages.slice(-20)));
  }, [messages]);

  useEffect(
    () => () => {
      if (doneTimer.current) window.clearTimeout(doneTimer.current);
      requestController.current?.abort();
    },
    [],
  );

  const visibleActivity = loading ? 'working' : question.trim() ? 'typing' : activity;
  const selectedName = useMemo(
    () => models.find((candidate) => candidate.id === model)?.name ?? model,
    [model, models],
  );

  const submit = async () => {
    setError('');
    if (!SERVICE_API_URL && !apiKey.trim()) {
      setError('아직 서비스 API가 연결되지 않았습니다. 개발용 OpenRouter API key가 필요합니다.');
      setActivity('error');
      return;
    }
    if (!question.trim() || loading) return;
    const next = [...messages, { role: 'user', content: question.trim() } satisfies StudyMessage];
    setMessages(next);
    setQuestion('');
    setLoading(true);
    setActivity('working');
    const controller = new AbortController();
    requestController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const answer = await askStudyAssistant({
        apiKey: apiKey.trim() || undefined,
        endpoint: SERVICE_API_URL,
        model,
        messages: next,
        signal: controller.signal,
      });
      setMessages((current) => [...current, { role: 'assistant', content: answer }]);
      setActivity('done');
      doneTimer.current = window.setTimeout(() => setActivity('idle'), 3500);
    } catch (cause) {
      setError(
        controller.signal.aborted
          ? '응답이 45초 안에 도착하지 않았습니다. 무료 model이 혼잡할 수 있으니 다시 보내주세요.'
          : cause instanceof Error
            ? cause.message
            : '답변을 가져오지 못했습니다.',
      );
      setActivity('error');
    } finally {
      window.clearTimeout(timeout);
      if (requestController.current === controller) requestController.current = null;
      setLoading(false);
    }
  };

  return (
    <div className="pet-chat">
      <div className="pet-presence">
        <PetVisual activity={visibleActivity} />
        <div>
          <span className="pet-status" data-status={visibleActivity} role="status">
            {ACTIVITY_LABEL[visibleActivity]}
          </span>
          <small>{selectedName}</small>
        </div>
      </div>
      <div className="pet-messages" aria-live="polite">
        {messages.map((message, index) => (
          <p
            className={message.role === 'user' ? 'pet-message pet-message--user' : 'pet-message'}
            key={`${message.role}-${index}`}
          >
            {message.content}
          </p>
        ))}
        {loading && <p className="pet-working">자료와 대화 맥락을 정리하고 있습니다…</p>}
      </div>
      <div className="pet-compose">
        {error && (
          <div className="pet-error" role="alert">
            {error}
          </div>
        )}
        <label className="sr-only" htmlFor="pet-coach-question">
          AI 학습 코치에게 질문
        </label>
        <div className="pet-compose__row">
          <textarea
            id="pet-coach-question"
            rows={2}
            value={question}
            onChange={(event) => setQuestion(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="현재 페이지에서 궁금한 점을 적어주세요…"
          />
          <Button onClick={submit} disabled={loading || !question.trim()}>
            {loading ? '기다리는 중' : '보내기'}
          </Button>
        </div>
        <details>
          <summary>Model과 개발용 API 설정</summary>
          <label>
            무료 model
            <select value={model} onChange={(event) => setModel(event.currentTarget.value)}>
              {models.map((candidate) => (
                <option value={candidate.id} key={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </label>
          <small>{catalogMessage}</small>
          {!SERVICE_API_URL && (
            <label>
              OpenRouter API key
              <input
                type="password"
                value={apiKey}
                autoComplete="off"
                onChange={(event) => setApiKey(event.currentTarget.value)}
              />
            </label>
          )}
        </details>
        <small>대화는 이 tab에만 보관됩니다. 민감한 정보는 입력하지 마세요.</small>
      </div>
    </div>
  );
}

function PetVisual({ activity, compact = false }: { activity: PetActivity; compact?: boolean }) {
  return (
    <div
      className={`pet-visual ${compact ? 'pet-visual--compact' : ''}`}
      data-activity={activity}
      aria-hidden="true"
    >
      <span>🐈</span>
    </div>
  );
}

function loadMessages(): StudyMessage[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '[]') as unknown;
    if (!Array.isArray(value)) return [WELCOME];
    const messages = value.filter(
      (item): item is StudyMessage =>
        Boolean(item) &&
        typeof item === 'object' &&
        ((item as StudyMessage).role === 'user' || (item as StudyMessage).role === 'assistant') &&
        typeof (item as StudyMessage).content === 'string',
    );
    return messages.length ? messages.slice(-20) : [WELCOME];
  } catch {
    return [WELCOME];
  }
}

function clampPosition(position: { x: number; y: number }, element: HTMLElement | null) {
  const width = element?.offsetWidth ?? 380;
  const height = element?.offsetHeight ?? 560;
  return {
    x: Math.max(12, Math.min(window.innerWidth - width - 12, position.x)),
    y: Math.max(68, Math.min(window.innerHeight - height - 12, position.y)),
  };
}
