# AI development loop

Breaking Point는 AI coding agent를 “자동 작성기”가 아니라 **검증 가능한 delivery loop의 실행자**로
둡니다. 특정 CLI나 Agent OS를 강제하지 않습니다. 대신 같은 Orient → Change → Review → Integrate
순환을 반복해 feature를 만듭니다.

이 문서는 기여자·maintainer·coding agent용 canonical process입니다. 공개 설명은 `/process` 페이지를
봅니다. 제품 규칙의 성격 구분은 [`docs/GLOBAL_STANDARD.md`](./GLOBAL_STANDARD.md)를 따릅니다.

## Loop

```text
Orient  →  Spec  →  Change  →  Verify  →  Review  →  Integrate  →  Observe
   ↑                                                                  │
   └──────────────────── Handoff / next slice ←───────────────────────┘
```

| 단계      | 하는 일                                                            | Evidence                    |
| --------- | ------------------------------------------------------------------ | --------------------------- |
| Orient    | `AGENTS.md`, 관련 contract, 기존 test와 roadmap item을 읽습니다    | 읽을 파일 목록              |
| Spec      | Objective, Scope, Constraints, Acceptance를 한 패킷으로 고정합니다 | Issue 또는 task packet      |
| Change    | 한 feature 브랜치에 가장 작은 coherent slice를 만듭니다            | commits on `feature/<slug>` |
| Verify    | 가까운 test → `pnpm quality` → UI면 375px/console                  | command output              |
| Review    | 사람 또는 보조 도구로 Standards와 Spec 축을 검토합니다             | review notes                |
| Integrate | rebase로 `develop`에 합치고, 공개 시 release → `main`              | green CI + linear history   |
| Observe   | Pages URL, Actions, 남은 risk를 확인합니다                         | deploy + handoff            |

대화 원문은 evidence가 아닙니다. test, Scenario, command output, screenshot과 decision log만
canonical입니다. 상세 harness contract는 [`docs/AI_HARNESS.md`](./AI_HARNESS.md), 브랜치 규칙은
[`docs/GITFLOW.md`](./GITFLOW.md)를 따릅니다.

## Alignment before code

요청이 모호하면 구현보다 질문을 먼저 합니다. 목표, 하지 않을 일, 실패해야 하는 순진한 해법,
acceptance를 닫지 않은 채 큰 diff를 만들지 않습니다.

이 습관은 industry practice인 specification-first / interview-before-build에 해당합니다. 특정 skill
이름을 쓰지 않아도 됩니다. 같은 목적이면 Issue Form의 Lab Proposal·Feature Proposal로도 충분합니다.

## GitHub Issue → PR → AI review → human review

다시 구현을 시작할 때 대화 기록 대신 GitHub artifact를 다음 순서로 사용합니다.

1. Issue Form에 사용자 결과, scope 밖의 항목, acceptance와 evidence를 적습니다. 큰 변경은 구현 전에
   `accepted` label로 방향을 닫습니다.
2. `develop`에서 `feature/<slug>`를 만들고 PR을 Draft로 일찍 엽니다. PR 본문에서 Issue를
   `Closes #<number>`로 연결합니다.
3. 가까운 test와 `pnpm quality`를 실행하고, 결과와 관찰을 PR template에 기록합니다.
4. Ready for review로 바꾸면 `quality`, `browser`와 `AI review`가 실행됩니다. 새 commit을 push하면 취소 가능한
   최신 run 하나만 남습니다.
5. OpenCodeReview가 inline finding과 갱신되는 summary를 남깁니다. 작성자는 각 finding을 수정하거나, 재현
   근거와 함께 false positive인 이유를 답합니다.
6. maintainer는 아래 Human review 기준으로 최종 검토한 뒤 rebase merge합니다. AI의 comment 수나 job 성공은
   사람의 Approve를 대신하지 않습니다.

`AI review`는 advisory입니다. API 장애나 model 오탐으로 merge가 멈추지 않도록 branch protection의 required
check에는 `quality`와 `browser`만 둡니다. 다만 AI review가 실패했다면 maintainer가 diff를 직접 검토하고 PR에
그 사실을 기록합니다.

### OpenCodeReview repository setup

`.github/workflows/ai-review.yml`은 `pull_request_target`에서 독립
[`rayleighko/engineering-review-action`](https://github.com/rayleighko/engineering-review-action)을 검토한 full
commit SHA로 호출합니다. Action은 project policy를 신뢰한 base에서 읽고, SHA로 고정한 OpenCodeReview가 PR
head를 Git object로만 가져옵니다. fork PR code를 secret이 있는 runner에서 실행하지 않으며, caller workflow에
PR head checkout, dependency install, test 또는 PR script 실행 단계를 추가하지 않습니다.

Repository Settings → Secrets and variables → Actions에 다음 값을 설정합니다.

| 종류     | 이름                 | 값                                                             |
| -------- | -------------------- | -------------------------------------------------------------- |
| Secret   | `OCR_LLM_URL`        | OpenAI-compatible 또는 Anthropic endpoint                      |
| Secret   | `OCR_LLM_TOKEN`      | review 전용 API token                                          |
| Variable | `OCR_LLM_MODEL`      | 사용할 model identifier                                        |
| Variable | `OCR_USE_ANTHROPIC`  | Anthropic Messages API면 `true`, OpenAI-compatible이면 `false` |
| Variable | `OCR_REVIEW_ENABLED` | 설정과 connectivity 확인 뒤 `true`                             |

token에는 GitHub 권한이 필요하지 않습니다. 별도 LLM project key를 쓰고 월 사용 한도와 provider-side budget alert를
설정합니다. code와 diff가 선택한 LLM provider로 전송된다는 점을 contributor에게 공개하며, secret·개인정보·실제
request body를 PR에 올리지 않습니다. telemetry는 workflow에서 켜지 않습니다.

설정 후 Draft가 아닌 작은 test PR을 열어 다음을 확인합니다.

처음 이 workflow를 추가하는 PR 자체에는 base branch에 아직 `ai-review.yml`이 없으므로 AI review가 실행되지
않습니다. 첫 PR은 기존 `quality`·`browser`와 사람 검토로 merge하고, 그다음 작은 PR부터 end-to-end로 검증합니다.

- `AI review`가 한국어 sticky summary와 필요한 inline comment를 게시합니다.
- 새 commit에서 이전 inline history를 삭제하지 않고 겹치지 않는 finding만 추가합니다.
- artifact에는 review JSON과 stderr만 있으며 secret이 출력되지 않습니다.
- Settings → Branches의 required checks에는 `quality`, `browser`만 있습니다.

외부 Action의 현재 검토 revision은 `66f5efffa411a355beebc5ba690c31154c580af5`이며 내부 OpenCodeReview Action은
`v1.7.16`의 commit SHA로 고정되어 있습니다. version을 올릴 때 release note, `action.yml`의 checkout,
permissions와 secret 처리 변경을 검토하고 caller의 full SHA를 갱신합니다. TypeScript·Go·Python 공통 policy,
독립 실행과 CI 순차 실행 방법은 외부 Action repository의 README를 따릅니다.

### Human review

AI finding을 순서대로 읽기보다 다음 순서로 검토합니다.

1. **Issue/Spec:** Outcome과 acceptance가 여전히 맞고, unrelated change가 없는지 봅니다.
2. **Behavior:** test 이름만 보지 말고 실패해야 할 case가 실제로 실패하는지, UI면 핵심 flow와 375px/error state를
   직접 확인합니다.
3. **Architecture:** 계산이 React로 새지 않았는지, 같은 Scenario와 seed가 같은 결과인지, secret과 외부 비용이
   새로 생기지 않았는지 봅니다.
4. **Diff:** 위험도가 높은 auth, workflow, data boundary부터 읽고 generated/format-only diff는 뒤로 미룹니다.
5. **AI findings:** High/critical은 재현하거나 수정합니다. Medium은 acceptance와 비교하고, Low/style은 summary에서
   필요한 것만 선택합니다. 근거 없는 suggestion은 따르지 않습니다.
6. **Evidence:** PR에 적힌 명령, screenshot, source와 limitation이 현재 HEAD 기준인지 확인한 뒤 Approve합니다.

리뷰를 마칠 때 “왜 이 구현인가”, “어떤 순진한 해법이 실패하는가”, “어디서 되돌릴 것인가”를 설명할 수 없으면
merge하지 않습니다.

AI review 기준은 작성자의 직급과 무관합니다. 주니어는 finding을 그대로 시니어에게 넘기지 않고 재현 입력, 실제
결과, 확인한 contract/test와 시도한 선택지를 먼저 정리합니다. 시니어는 반복적인 style·누락 검수보다 auth,
data loss, architecture, rollback처럼 판단이 필요한 위험에 집중합니다. 시니어가 작성한 PR도 같은 CI와 AI
review를 거치며 가능한 경우 다른 사람이 최종 승인합니다. 도입 순서, escalation 조건과 개인 평가에 사용하지 않을
지표는 외부 Action repository의
[`docs/TEAM_ADOPTION.md`](https://github.com/rayleighko/engineering-review-action/blob/66f5efffa411a355beebc5ba690c31154c580af5/docs/TEAM_ADOPTION.md)를
따릅니다.

## Optional local tooling (권장, 비강제)

아래 도구는 루프를 돕는 **참고 구현**입니다. 설치·사용·CI 통과를 merge 조건으로 두지 않습니다.
기존 필수 게이트는 `pnpm quality`와 browser compatibility입니다.

| 도구                                                                    | 성격                                                   | Breaking Point에서의 위치                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| [mattpocock/skills](https://github.com/mattpocock/skills)               | composable engineering skill (grill, TDD, code-review) | Orient/Spec/Review 습관을 보강할 때 참고                          |
| [Alibaba Open Code Review](https://github.com/alibaba/open-code-review) | deterministic pipeline + LLM review CLI (`ocr`)        | PR 자동 1차 검수와 PR 전 로컬 diff 보조                           |
| [Q00/ouroboros](https://github.com/Q00/ouroboros)                       | specification-first Agent OS                           | “어떻게 명세하고 재현할지”를 보여주는 레퍼런스. 필수 runtime 아님 |

사용 예시는 권장일 뿐입니다.

```bash
# 선택: PR 전 로컬 리뷰 보조. repository rule과 업무 배경을 함께 사용합니다.
ocr review --from develop --to HEAD --rule .opencodereview/rule.json \
  --background "Issue outcome과 acceptance를 한 문장으로 적습니다"

# 선택: 외부 skill을 로컬 agent에 복사해 실험
npx skills@latest add mattpocock/skills
```

로컬 OCR의 LLM API key는 기여자 개인 환경에서만 설정합니다. CI는 review 전용 repository secret을 사용하고,
delegation mode로 현재 coding agent에 위임할 수도 있습니다.

## Review axes

리뷰는 두 축을 섞지 않습니다.

1. **Standards** — import boundary, engine/UI 분리, 접근성, GLOBAL_STANDARD 용어·출처 구분
2. **Spec** — acceptance와 challenge 의도(순진한 해법 실패 / 의도한 해법 통과)를 충족하는가

AI 리뷰 결과는 힌트입니다. maintainer가 evidence와 trade-off를 설명할 수 있어야 merge합니다.

## Relation to learning content

이 delivery loop 자체도 사이트에서 가르치는 system thinking과 맞닿아 있습니다.

- Queue / utilization → CI와 review 대기열에 여유를 두지 않으면 p99처럼 병목이 튀는 것과 같습니다.
- Timeout budget → PR과 release에 시간 상한을 두고 무한 대기하지 않습니다.
- Circuit breaker → quality 실패 시 merge를 멈추고 원인을 고칩니다.
- Evidence / tracing → 배포 후 Pages URL과 Actions로 결과를 관측합니다.

랩이 다루는 pattern을 “코드 안”에서만 쓰지 않고, 이 repository를 운영하는 방식에도 같은 언어로
연결합니다.
