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
import { trackLearningEvent } from '@/lib/learning-events';
import { useCoachPreferences } from '@/stores/coach-preferences';
import { useLabSession, type LabPatch, type LabSnapshot } from '@/stores/lab-session';

const AUTO_MODEL: OpenRouterModel = { id: 'openrouter/free', name: '무료 model 자동 선택' };
const SERVICE_API_URL = import.meta.env.PUBLIC_AI_API_URL?.trim();
const SESSION_KEY = 'breaking-point-coach-messages';
const REQUEST_TIMEOUT_MS = 45_000;
const PET_ASSET_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/pet`;
const WELCOME: StudyMessage = {
  role: 'assistant',
  content:
    '안녕하세요. 지금 보고 계신 개념이나 실험에서 막힌 부분을 알려주세요. 답을 바로 드리기보다 먼저 확인할 단서를 함께 찾아보겠습니다.',
};

type PetActivity = 'idle' | 'typing' | 'working' | 'done' | 'error';
type DragState = {
  dx: number;
  dy: number;
  startX: number;
  startY: number;
  moved: boolean;
};

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
  const hasSeenDragTip = useCoachPreferences((state) => state.hasSeenDragTip);
  const setEnabled = useCoachPreferences((state) => state.setEnabled);
  const setOpen = useCoachPreferences((state) => state.setOpen);
  const setPosition = useCoachPreferences((state) => state.setPosition);
  const setHasSeenDragTip = useCoachPreferences((state) => state.setHasSeenDragTip);
  const labHealth = useLabSession((state) => state.snapshot?.health);
  const labVisible = useLabSession((state) => state.snapshot?.visible);
  const labId = useLabSession((state) => state.snapshot?.labId);
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const dragEndedAt = useRef(0);
  const [mobile, setMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [proactivePrompt, setProactivePrompt] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 640px)');
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (hasSeenDragTip || mobile || !enabled) return;
    const timer = window.setTimeout(() => setHasSeenDragTip(true), 6500);
    return () => window.clearTimeout(timer);
  }, [enabled, hasSeenDragTip, mobile, setHasSeenDragTip]);

  useEffect(() => {
    if (!enabled || open || labHealth !== 'over' || labVisible !== false || !labId) return;
    const key = `breaking-point-coach-prompts:${labId}`;
    const shown = Number(localStorage.getItem(key) ?? 0);
    if (shown >= 2) return;
    const showTimer = window.setTimeout(() => {
      setProactivePrompt(true);
      localStorage.setItem(key, String(shown + 1));
      trackLearningEvent({ name: 'coach_prompt_shown', labId, source: 'proactive_prompt' });
    }, 2500);
    return () => window.clearTimeout(showTimer);
  }, [enabled, labHealth, labId, labVisible, open]);

  useEffect(() => {
    if (!proactivePrompt) return;
    const timer = window.setTimeout(() => {
      setProactivePrompt(false);
      trackLearningEvent({ name: 'coach_prompt_ignored', labId, source: 'proactive_prompt' });
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [labId, proactivePrompt]);

  useEffect(() => {
    if (!position || mobile) return;
    const clamped = clampPosition(position, rootRef.current);
    if (clamped.x !== position.x || clamped.y !== position.y) setPosition(clamped);
  }, [mobile, open, position, setPosition]);

  const style =
    !mobile && position
      ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
      : undefined;
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>, allowButton = false) => {
    if (
      mobile ||
      event.button !== 0 ||
      !rootRef.current ||
      (!allowButton && (event.target as HTMLElement).closest('button'))
    )
      return;
    const rect = rootRef.current.getBoundingClientRect();
    drag.current = {
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current || !rootRef.current) return;
    drag.current.moved ||=
      Math.hypot(event.clientX - drag.current.startX, event.clientY - drag.current.startY) > 4;
    if (!drag.current.moved) return;
    setPosition(
      clampPosition(
        { x: event.clientX - drag.current.dx, y: event.clientY - drag.current.dy },
        rootRef.current,
      ),
    );
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (drag.current?.moved) dragEndedAt.current = performance.now();
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (!enabled) {
    return (
      <button
        type="button"
        className="pet-restore"
        onClick={() => {
          setEnabled(true);
          trackLearningEvent({ name: 'coach_restored', source: 'launcher' });
        }}
      >
        Cat 다시 보기
      </button>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`pet-coach ${open ? 'pet-coach--open' : ''}`}
      style={style}
      data-testid="pet-coach"
      onContextMenu={(event) => {
        event.preventDefault();
        setMenuOpen(true);
      }}
    >
      {open ? (
        <section className="pet-panel" role="dialog" aria-label="AI 학습 코치">
          <header
            className="pet-panel__head"
            onPointerDown={(event) => onPointerDown(event)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
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
                onClick={() => setMenuOpen((value) => !value)}
                aria-label="AI 학습 코치 메뉴"
              >
                ⋯
              </button>
            </div>
          </header>
          <CoachBody />
        </section>
      ) : (
        <>
          {(proactivePrompt || !hasSeenDragTip) && (
            <div className="pet-nudge" role="status">
              {proactivePrompt ? (
                <>
                  실험이 감당 가능한 범위를 넘었습니다.
                  <button
                    type="button"
                    onClick={() => {
                      setProactivePrompt(false);
                      setOpen(true);
                      trackLearningEvent({
                        name: 'coach_opened',
                        labId,
                        source: 'proactive_prompt',
                      });
                    }}
                  >
                    세 가지 변경안 보기
                  </button>
                  <button
                    type="button"
                    className="pet-nudge__dismiss"
                    aria-label="알림 닫기"
                    onClick={() => {
                      setProactivePrompt(false);
                      trackLearningEvent({
                        name: 'coach_prompt_dismissed',
                        labId,
                        source: 'proactive_prompt',
                      });
                    }}
                  >
                    ×
                  </button>
                </>
              ) : (
                <>저를 드래그해서 편한 곳으로 옮길 수 있어요.</>
              )}
            </div>
          )}
          <button
            type="button"
            className="pet-launcher"
            aria-label="AI 학습 코치 열기"
            title={mobile ? 'AI 학습 코치 열기' : '클릭해서 열거나 드래그해서 옮기세요'}
            onPointerDown={(event) => onPointerDown(event, true)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={(event) => {
              if (event.detail > 0 && performance.now() - dragEndedAt.current < 350) return;
              setOpen(true);
              setProactivePrompt(false);
              trackLearningEvent({ name: 'coach_opened', labId, source: 'launcher' });
            }}
          >
            <PetVisual activity="idle" compact />
            <span className="pet-launcher__beta">Beta</span>
          </button>
        </>
      )}
      {menuOpen && (
        <div className="pet-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => setPosition(null)}>
            위치 초기화
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setEnabled(false);
              trackLearningEvent({ name: 'coach_hidden', labId, source: 'panel' });
            }}
          >
            Cat 숨기기
          </button>
          <button type="button" role="menuitem" onClick={() => setMenuOpen(false)}>
            닫기
          </button>
        </div>
      )}
    </div>
  );
}

function CoachBody() {
  const labId = useLabSession((state) => state.snapshot?.labId);
  const [tab, setTab] = useState<'chat' | 'lab'>(labId ? 'lab' : 'chat');

  return (
    <div className="pet-body">
      <div className="pet-tabs" role="tablist" aria-label="학습 코치 기능">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'chat'}
          onClick={() => setTab('chat')}
        >
          코칭
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'lab'}
          disabled={!labId}
          onClick={() => {
            setTab('lab');
            trackLearningEvent({
              name: 'mini_lab_opened',
              labId,
              source: 'panel',
            });
          }}
        >
          Mini Lab
        </button>
      </div>
      {tab === 'lab' && labId ? <MiniLab /> : <CoachChat />}
    </div>
  );
}

interface LabSuggestion {
  id: string;
  title: string;
  description: string;
  patch: LabPatch;
}

function MiniLab() {
  const snapshot = useLabSession((state) => state.snapshot)!;
  const controls = useLabSession((state) => state.controls);
  const [selected, setSelected] = useState<string | null>(null);
  const suggestions = useMemo(() => buildSuggestions(snapshot), [snapshot]);
  const choice = suggestions.find((suggestion) => suggestion.id === selected);

  return (
    <div className="mini-lab">
      <div className="mini-lab__head">
        <div>
          <b>{snapshot.title}</b>
          <span>{snapshot.visible ? '본문 실험과 연결됨' : '본문 실험은 화면 밖에서 절전 중'}</span>
        </div>
        <button type="button" onClick={() => controls?.setRunning(!snapshot.running)}>
          {snapshot.running ? '일시정지' : '실행'}
        </button>
      </div>

      <div className="mini-metrics" data-health={snapshot.health}>
        <MiniMetric label="이용률" value={`${Math.round(snapshot.utilization * 100)}%`} />
        <MiniMetric label="p99" value={fmtCoachMs(snapshot.stats.p99)} />
        <MiniMetric label="에러율" value={`${(snapshot.stats.errorRate * 100).toFixed(1)}%`} />
        <MiniMetric label="대기열" value={`${snapshot.stats.queueLen.toLocaleString()}명`} />
      </div>

      <div className="mini-formula">
        필요한 커넥션 = {snapshot.config.arrivalRate}/초 ×{' '}
        {(snapshot.config.serviceTime / 1000).toFixed(3)}초 = <b>{snapshot.needed.toFixed(1)}개</b>
      </div>

      <fieldset className="mini-choices">
        <legend>어떤 변경을 먼저 실험하시겠어요?</legend>
        {suggestions.map((suggestion) => (
          <label key={suggestion.id} data-selected={selected === suggestion.id}>
            <input
              type="radio"
              name="lab-suggestion"
              value={suggestion.id}
              checked={selected === suggestion.id}
              onChange={() => {
                setSelected(suggestion.id);
                trackLearningEvent({
                  name: 'lab_suggestion_selected',
                  labId: snapshot.labId,
                  source: 'mini_lab',
                  suggestionId: suggestion.id,
                });
              }}
            />
            <span>
              <b>{suggestion.title}</b>
              <small>{suggestion.description}</small>
            </span>
          </label>
        ))}
      </fieldset>

      {choice && (
        <div className="mini-approval">
          <p>선택한 변경안은 승인하기 전까지 실험에 적용되지 않습니다.</p>
          <Button
            onClick={() => {
              controls?.patch(choice.patch);
              controls?.reset();
              controls?.setRunning(true);
              trackLearningEvent({
                name: 'lab_suggestion_applied',
                labId: snapshot.labId,
                source: 'mini_lab',
                suggestionId: choice.id,
              });
              setSelected(null);
            }}
            disabled={!controls}
          >
            변경하고 다시 실행
          </Button>
        </div>
      )}

      <div className="mini-lab__footer">
        <button type="button" onClick={() => controls?.focus()} disabled={!controls}>
          전체 시뮬레이터로 이동
        </button>
        <small>Browser model · 실제 DB benchmark가 아닙니다.</small>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function buildSuggestions(snapshot: LabSnapshot): LabSuggestion[] {
  const queryTime = Math.max(5, Math.round(snapshot.config.serviceTime / 2 / 5) * 5);
  const safePool = Math.min(
    50,
    Math.max(snapshot.config.poolSize, Math.ceil(snapshot.needed / 0.7)),
  );
  const safeArrival = Math.max(10, Math.floor(((snapshot.maxThroughput * 0.7) / 10) * 10));

  return [
    {
      id: 'query-time',
      title: `쿼리 시간을 ${queryTime}ms로 줄이기`,
      description: 'Index나 Cache로 처리 시간을 줄여 같은 Pool로 더 많이 처리합니다.',
      patch: { serviceTime: queryTime },
    },
    {
      id: 'pool-budget',
      title: `Pool을 ${safePool}개로 조정하기`,
      description:
        safePool >= 50
          ? '안전 이용률에 필요한 수가 상한을 넘습니다. DB 총 Connection Budget을 먼저 확인해야 합니다.'
          : '이용률 70%를 목표로 역산한 값입니다. DB의 전체 Connection Budget을 함께 확인해야 합니다.',
      patch: { poolSize: safePool },
    },
    {
      id: snapshot.config.retry ? 'stop-retry' : 'load-shed',
      title: snapshot.config.retry
        ? '과부하 중 재시도 끄기'
        : `유입을 ${safeArrival}/초로 제한하기`,
      description: snapshot.config.retry
        ? '실패한 요청이 다시 들어와 부하를 키우는 Feedback Loop를 끊습니다.'
        : '처리 한계의 70%만 받아 Backpressure가 생길 여유를 확보합니다.',
      patch: snapshot.config.retry ? { retry: false } : { arrivalRate: safeArrival },
    },
  ];
}

function fmtCoachMs(value: number) {
  if (!value) return '—';
  return value >= 1000 ? `${(value / 1000).toFixed(1)}초` : `${Math.round(value)}ms`;
}

function formatLabContext(snapshot: LabSnapshot | null) {
  if (!snapshot) return undefined;
  return JSON.stringify({
    fidelity: 'deterministic-browser-model',
    lab: snapshot.labId,
    config: {
      arrivalRate: snapshot.config.arrivalRate,
      poolSize: snapshot.config.poolSize,
      serviceTimeMs: snapshot.config.serviceTime,
      acquireTimeoutMs: snapshot.config.acquireTimeout,
      retry: snapshot.config.retry,
    },
    metrics: {
      utilization: Number(snapshot.utilization.toFixed(3)),
      throughput: Number(snapshot.stats.throughput.toFixed(1)),
      p99Ms: Math.round(snapshot.stats.p99),
      errorRate: Number(snapshot.stats.errorRate.toFixed(4)),
      queueLength: snapshot.stats.queueLen,
    },
  });
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
  const [showAnswerGate, setShowAnswerGate] = useState(false);
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
        context: formatLabContext(useLabSession.getState().snapshot),
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
        <div className="pet-quick-prompts" aria-label="질문 방식 선택">
          <button
            type="button"
            onClick={() => setQuestion('정답 대신 다음에 확인할 단서 하나만 주세요.')}
          >
            단서 하나
          </button>
          <button
            type="button"
            onClick={() => setQuestion('제가 선택할 수 있는 다음 실험 세 가지를 제안해 주세요.')}
          >
            선택지 3개
          </button>
          <button type="button" onClick={() => setShowAnswerGate(true)}>
            직접 설명
          </button>
        </div>
        {showAnswerGate && (
          <div className="pet-answer-gate">
            <p>
              먼저 해결을 시도한 뒤 설명을 보는 방식은 개념 이해와 새로운 문제로의 전이에 도움이 될
              수 있습니다. 특정 시간이나 “50% 향상”을 보장하는 결과는 아닙니다.
            </p>
            <a href="https://doi.org/10.3102/00346543211019105" target="_blank" rel="noreferrer">
              Productive Failure meta-analysis
            </a>
            <button
              type="button"
              onClick={() => {
                setQuestion('지금은 직접적인 정답과 그 이유를 설명해 주세요.');
                setShowAnswerGate(false);
              }}
            >
              그래도 직접 설명을 요청할게요
            </button>
          </div>
        )}
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
  const asset = compact ? 'launcher' : activity;
  return (
    <div
      className={`pet-visual ${compact ? 'pet-visual--compact' : ''}`}
      data-activity={activity}
      aria-hidden="true"
    >
      <img
        src={`${PET_ASSET_BASE}/${asset}.webp`}
        alt=""
        width="1024"
        height="1024"
        draggable={false}
      />
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
