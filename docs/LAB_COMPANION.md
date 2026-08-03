# Lab Companion architecture

Breaking Point Cat은 정답을 대신 생성하는 chatbot이 아니라 현재 실험을 함께 관찰하고 다음 조작과 판단을
돕는 optional Lab Companion입니다.

## Runtime contract

```text
Deterministic Engine
  → ConnectionPoolLab
      → Lab Session Store (Snapshot + approved controls)
          ├─ Full simulation view
          ├─ Mini Lab view
          └─ AI context serializer → Cloudflare AI gateway
```

- Mini Lab은 Engine, Canvas와 Chart를 복제하지 않습니다. 같은 Snapshot을 읽고 승인된 control만 호출합니다.
- AI는 값을 직접 변경하지 않습니다. 최대 세 개의 변경안을 보여주고 사용자가 고른 뒤 다시 승인해야 합니다.
- Snapshot에는 Lab ID, 입력값과 요약 지표만 포함합니다. 대화 원문, 스크롤 기록과 개인 식별자는 넣지 않습니다.
- Full simulation이 화면 밖이거나 tab이 background이면 Engine과 Canvas를 멈춥니다.
- Browser model과 실제 benchmark를 항상 구분합니다.

## Coaching policy

- 기본 순서는 `단서 하나 → 선택지 세 개 → 직접 설명`입니다.
- 직접 설명을 막지는 않지만 Productive Failure의 취지를 과장하지 않고 알려줍니다. 특정한 고민 시간이나
  학습률 향상을 보장하지 않습니다.
- 능동 알림은 장애 징후가 있고 Full simulation이 화면 밖일 때만 표시하며 Lab당 최대 두 번입니다.
- 사용자가 Cat을 숨기면 작은 복구 control만 남고 AI 없이도 모든 Lab을 완료할 수 있어야 합니다.

근거로는 문제 해결 후 설명(PS-I)이 설명 후 문제 해결(I-PS)보다 평균적으로 유리했다는 53개 연구의
meta-analysis를 사용합니다. 보고된 평균 효과는 Hedges' g 0.36이며 조건에 따라 달라지므로 “50% 향상”으로
번역하지 않습니다.

- Sinha & Kapur (2021), `When Problem Solving Followed by Instruction Works`
  <https://doi.org/10.3102/00346543211019105>

## Analytics boundary

UI는 `breaking-point:learning-event` browser event만 발행합니다. 현재는 외부로 전송하지 않습니다. PostHog가
나중에 주입되면 동일한 allowlist event만 받을 수 있습니다. Sentry는 오류와 성능 진단, PostHog는 제품
행동 분석으로 책임을 분리합니다.

허용 event:

- 능동 알림 표시·닫기·무시·열기
- Cat 숨기기·복구
- Mini Lab 열기
- 제안 선택·승인

질문 내용, 대화 내용, Slider 원시값, URL query, IP와 사용자 입력은 Analytics property로 보내지 않습니다.
알림의 유용성은 `opened / shown`, 방해 정도는 `dismissed / shown`, 실제 학습 행동은
`applied / selected`처럼 집계합니다.

## Persistence and cost stages

### Stage 1 — Local-first

- 위치·숨김·안내 확인: `localStorage`
- 현재 tab 대화: `sessionStorage`, 최근 20개
- 실험 공유: 향후 versioned URL Scenario
- 계정, D1과 Leaderboard 없음

이 단계는 읽기 중심 정적 서비스의 비용과 개인정보 책임을 최소화합니다. Browser 저장소 삭제나 기기 변경 시
기록이 사라진다는 한계를 UI에 알립니다.

### Stage 2 — Explicit export

완료 Lab, 사용한 Hint와 실패 유형을 versioned JSON으로 내보내고 가져옵니다. 원문 대화는 포함하지 않습니다.
동기화 수요를 계정 없이 검증할 수 있습니다.

### Stage 3 — Optional account

재방문자의 동기화 수요가 확인된 뒤에만 인증과 D1을 검토합니다. 저장 대상은 완료 상태, Hint count, Challenge
attempt summary입니다. Leaderboard는 부정행위 방지, 삭제권, 공개 범위와 운영 비용이 정의되기 전에는 만들지
않습니다.

## Retrieval evolution

### 현재

System prompt는 고정하고 최근 대화 12개와 현재 Lab Snapshot만 전송합니다. 정적 Wiki 본문 전체를 매 요청에
넣지 않습니다.

### 다음 단계

1. 질문에서 Lab ID와 Topic slug를 결정합니다.
2. 해당 Topic의 검수된 chunk만 3~5개 검색합니다.
3. 각 chunk에 source URL, revision과 content hash를 포함합니다.
4. Snapshot, retrieval context, 최근 대화 요약을 서로 다른 block으로 전달합니다.
5. 답변에는 근거 source를 표시하고 검색 결과가 없으면 일반 지식임을 밝힙니다.

내부 자료에 충분한 근거가 없을 때는 공식 원문만 fallback으로 검색합니다. 일반 지식으로 빈칸을 채우지 않고,
내부 자료와 외부 원문의 출처를 답변마다 구분해 표시합니다.

Prompt caching은 변하지 않는 System prompt와 Topic chunk 앞부분에만 적용합니다. 사용자 질문과 실험 Snapshot은
뒤에 배치합니다. Provider별 cache semantics와 실제 hit rate를 확인하기 전에는 비용 절감을 주장하지 않습니다.

Vector search는 Topic 수가 작을 때 필요하지 않습니다. 먼저 Pagefind, tag, synonym과 graph edge를 사용하는
vectorless retrieval을 구현합니다. 고정 eval set에서 recall이 목표보다 낮고 lexical 개선으로 해결되지 않을 때만
Vectorize 같은 vector index를 검토합니다. 상세 비용 gate는
[`docs/RETRIEVAL_COST_POLICY.md`](./RETRIEVAL_COST_POLICY.md)를 따릅니다.
