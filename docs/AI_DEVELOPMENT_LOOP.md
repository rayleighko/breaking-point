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

## Optional tooling (권장, 비강제)

아래 도구는 루프를 돕는 **참고 구현**입니다. 설치·사용·CI 통과를 merge 조건으로 두지 않습니다.
기존 필수 게이트는 `pnpm quality`와 browser compatibility입니다.

| 도구                                                                    | 성격                                                   | Breaking Point에서의 위치                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| [mattpocock/skills](https://github.com/mattpocock/skills)               | composable engineering skill (grill, TDD, code-review) | Orient/Spec/Review 습관을 보강할 때 참고                          |
| [Alibaba Open Code Review](https://github.com/alibaba/open-code-review) | deterministic pipeline + LLM review CLI (`ocr`)        | PR 전 로컬 diff 리뷰 보조. CI 필수 아님                           |
| [Q00/ouroboros](https://github.com/Q00/ouroboros)                       | specification-first Agent OS                           | “어떻게 명세하고 재현할지”를 보여주는 레퍼런스. 필수 runtime 아님 |

사용 예시는 권장일 뿐입니다.

```bash
# 선택: PR 전 로컬 리뷰 보조
ocr review --from develop --to HEAD

# 선택: 외부 skill을 로컬 agent에 복사해 실험
npx skills@latest add mattpocock/skills
```

OCR에 LLM API key가 필요하면 기여자 로컬 또는 개인 환경에서만 설정합니다. repository secret으로
강제하지 않으며, delegation mode로 현재 coding agent에 위임해도 됩니다.

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
