# Breaking Point — Codex 인수인계

이 문서는 다른 Codex 채팅이 과거 대화 없이 Breaking Point 작업을 이어가기 위한 현재 실행 상태입니다. 대화 원문보다 이 문서, GitHub Issue/PR, test와 browser evidence를 우선합니다.

## 새 채팅에서 바로 사용할 프롬프트

```text
이 repository의 HANDOFF.md를 읽고 현재 작업의 실행 계약으로 사용해 주세요. 먼저 AGENTS.md와 skills/breaking-point-maintainer/SKILL.md를 끝까지 읽고, git status, 현재 branch, 연결된 GitHub Issue/PR과 Actions 상태를 확인해 주세요. 그다음 HANDOFF.md의 “즉시 수행할 작업 패킷”을 가장 작은 coherent change로 수행해 주세요. 변경 전 objective, scope, constraints, acceptance criteria와 evidence를 짧게 정리하고, 관련 contract와 기존 test만 읽어 주세요. PR code를 secret이 있는 job에서 checkout하거나 실행하지 말고, 실행하지 않은 검사를 통과했다고 표현하지 마세요. 완료 시 pnpm quality와 해당 추가 evidence를 실행하고, 변경·검증·남은 risk·다음 결정을 보고해 주세요.
```

## 프로젝트 목적

Breaking Point는 system behavior를 browser simulation으로 직접 부수며 배우는 한국어 공개 학습 사이트입니다.

- 공개 사이트: <https://rayleighko.github.io/breaking-point/>
- GitHub: <https://github.com/rayleighko/breaking-point>
- Stack: Astro 5, React 19 islands, TypeScript, pnpm 10, GitHub Pages
- 공개 shell은 정적으로 유지하며 interaction만 React island가 담당합니다.
- generic system pattern을 먼저 설명하고 TypeScript, Go, Rust, JVM, AWS와 Kubernetes 구현으로 연결합니다.

모든 사용자 경험은 다음 순서로 닫습니다.

1. 현상을 직접 만집니다.
2. 중학교 수준 산수로 원인을 설명합니다.
3. 업계 용어를 연결합니다.
4. constraint가 있는 challenge에서 순진한 해법을 실패시킵니다.
5. Recall card로 30초 안에 복습합니다.

사용자 문장은 존칭 한국어를 사용하고 기술 고유명사는 통용되는 원어를 유지합니다. AI가 작성한 변경도 contributor가 설명하고 검증할 수 있어야 합니다.

## Canonical context

작업을 시작할 때 전체 repository를 읽지 말고 변경 유형에 맞는 문서만 읽습니다.

| 항상 읽기                                   | 작업에 따라 추가로 읽기                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| `AGENTS.md`                                 | 새 lab·교육 콘텐츠: `CONTENT_GUIDE.md`                                      |
| `skills/breaking-point-maintainer/SKILL.md` | simulation·engine: `docs/ENGINE_GUIDE.md`와 관련 engine test                |
| 이 `HANDOFF.md`                             | UI/UX: `docs/FRONTEND_GUIDELINES.md`와 `skills/review-learning-ux/SKILL.md` |
| 관련 구현과 가장 가까운 test                | delivery·review: `docs/AI_DEVELOPMENT_LOOP.md`                              |
|                                             | branch·release: `docs/GITFLOW.md`                                           |
|                                             | AI harness: `docs/AI_HARNESS.md`                                            |

Architecture 결정은 `docs/DECISIONS.md`, 사용자에게 전달된 변경은 `CHANGELOG.md`, 현재 실행 상태는 이 문서에 갱신합니다.

## 현재 확인된 상태

2026-08-14 로컬 기준입니다. 새 채팅은 아래 값을 그대로 가정하지 말고 다시 확인합니다.

- 현재 branch: `feature/engineering-review-action`
- 현재 HEAD는 새 채팅에서 `git rev-parse HEAD`로 다시 확인합니다.
- base: `develop` (`9b5b714`)
- 관련 Issue: [#13 — AI code review delivery loop](https://github.com/rayleighko/breaking-point/issues/13)
- 관련 Draft PR: [#14](https://github.com/rayleighko/breaking-point/pull/14)
- `main`과 `develop`은 GitHub branch protection과 `quality`, `browser` required check를 사용합니다.
- `AI review`는 advisory이며 사람의 Approve를 대신하지 않습니다.

### 제품 baseline

- Connection Pool, Queue Sense, p50/p99 세 lab이 완료되어 있습니다.
- 공통 Queue simulation engine은 fixed seed로 재현 가능합니다.
- challenge test는 순진한 해법 실패와 의도한 해법 통과를 script로 검증합니다.
- Pagefind 검색, static knowledge graph, Scenario playground, light/dark theme와 mobile navigation이 있습니다.
- AI Gateway는 Cloudflare Worker로 분리되어 있으며 AI secret을 static site에 넣지 않습니다.
- 현재 로드맵의 다음 콘텐츠 후보는 Cache Stampede이고, 그다음은 Retry Storm입니다.

### AI review 분리 상태

Breaking Point는 독립 Action의 consumer이며 Action 구현을 repository 안에 복제하지 않습니다.

- Action repository: <https://github.com/rayleighko/engineering-review-action>
- local checkout: `/Users/rayleighko/Development/engineering-review-action`
- 첫 release: `v1.0.0`
- caller가 고정한 full SHA: `66f5efffa411a355beebc5ba690c31154c580af5`
- Breaking Point 소유 범위: `.github/workflows/ai-review.yml`, `.opencodereview/rule.json`, secret/variable 이름과 사람 review contract

공통 TypeScript·Go·Python policy와 실행 코드는 외부 Action repository에서만 변경합니다. 두 repository를 한
작업에서 동시에 수정하지 않습니다.

### Consumer 전환 검증 (2026-08-14)

- `.github/workflows/ai-review.yml`은 외부 Action을 immutable full SHA로 호출합니다.
- caller에는 PR head checkout, dependency install, test와 arbitrary script 실행이 없습니다.
- permissions는 `contents: read`, `pull-requests: write`입니다.
- repository 내부 `review-action/`과 해당 package test를 제거했습니다.
- 공식 `actionlint v1.7.12` Darwin arm64 binary의 checksum을 확인한 뒤 workflow lint를 통과했습니다.
- `pnpm quality`를 통과했습니다.
- AI review는 advisory이며 `quality`, `browser` required check와 사람의 Approve를 대신하지 않습니다.

## 즉시 수행할 작업 패킷

### Objective

PR #14의 consumer 전환 diff를 사람의 review로 확인하고 `develop`에 rebase merge합니다. merge 후 작은 non-draft
test PR에서 live AI comment 경계를 검증합니다.

### Merge 전 확인

- PR #14의 현재 HEAD에서 `quality`, `browser`가 통과했는지 확인합니다.
- external Action `uses:`가 `66f5efffa411a355beebc5ba690c31154c580af5`인지 확인합니다.
- AI review가 실행되지 않았다면 현재 diff를 직접 검토했다고 PR에 기록합니다.
- rebase merge를 사용하고 merge commit을 만들지 않습니다.

### Live prototype prerequisites

2026-08-14 확인 결과 OCR 전용 secret/variable은 아직 설정되지 않았습니다. 값은 읽거나 출력하지 말고 존재 여부만
확인합니다. 기존 site용 OpenRouter key를 재사용하지 않고 review 전용 key와 provider-side 비용 상한을 사용합니다.

### Live prototype acceptance

독립 Action 자체의 TypeScript end-to-end prototype은 `engineering-review-action/HANDOFF.md`를 따라 별도 프로젝트에서 수행합니다. Breaking Point에서는 consumer 전환이 base branch에 반영된 뒤 작은 non-draft test PR로 다음만 검증합니다.

- 한국어 sticky summary가 게시됩니다.
- intentional defect가 유용한 inline 위치에 보고됩니다.
- 새 push에서 겹치는 finding이 중복되지 않습니다.
- artifact와 log에 secret, 전체 environment 또는 request body가 없습니다.
- AI API 실패가 deterministic CI 결과를 가리지 않습니다.

필요 설정:

| 종류     | 이름                      |
| -------- | ------------------------- |
| Secret   | `OCR_LLM_URL`             |
| Secret   | `OCR_LLM_TOKEN`           |
| Variable | `OCR_LLM_MODEL`           |
| Variable | `OCR_USE_ANTHROPIC`       |
| Variable | `OCR_REVIEW_ENABLED=true` |

값을 읽거나 출력하지 말고 존재 여부만 확인합니다. 전용 review key와 provider-side 비용 상한을 사용합니다.

## 다음 제품 작업

AI review consumer 전환과 live prototype evidence가 끝난 뒤에만 다음 feature를 별도 Issue와 branch로 시작합니다.

### 1. Cache Stampede lab

- 현상: 같은 TTL로 만료된 요청이 동시에 database로 쏟아집니다.
- 산수: hit/miss와 downstream concurrency 증가를 작은 숫자로 보여줍니다.
- 비교: naive TTL, jitter, single-flight/mutex를 나란히 실행합니다.
- challenge: cache size나 database connection만 늘리는 순진한 해법은 실패해야 합니다.
- engine 변경이 필요하면 Scenario schema와 UI를 분리하고 invariant/fixed-seed test를 먼저 설계합니다.

새 lab이므로 구현 전 `CONTENT_GUIDE.md`, `docs/ENGINE_GUIDE.md`, 관련 engine test를 모두 읽고 Proposal Issue에서 acceptance와 challenge constraint를 닫습니다.

### 2. Retry Storm lab

Cache Stampede 이후 별도 slice로 진행합니다. `retryBackoff`를 무백오프, fixed, exponential+jitter 전략으로 일반화하되 Cache Stampede 작업과 함께 refactor하지 않습니다.

## Delivery와 review 계약

```text
Issue/Proposal
  → feature/<slug> branch
  → early Draft PR to develop
  → nearest tests
  → pnpm quality
  → UI면 browser/375px/error/console evidence
  → advisory AI review
  → author disposition
  → human review
  → rebase merge
```

- 한 branch는 한 사용자 결과만 담습니다.
- feature는 `develop`에서 분기하고 `develop`으로 rebase merge합니다.
- 공개할 때 `release/<yyyy-mm-dd>`를 `main`으로 rebase merge한 뒤 Pages와 공개 URL을 확인합니다.
- 커밋은 `영역: 변경 내용` 형식의 한국어를 사용합니다. 예: `인프라: 독립 리뷰 Action 연결`.
- 기존 사용자 변경을 덮어쓰거나 unrelated cleanup을 하지 않습니다.
- 시니어·주니어 구분 없이 같은 CI와 AI review를 적용합니다.

AI finding은 다음 셋 중 하나로 종료합니다.

```text
수정: <commit 또는 설명>
근거 있는 반박: <test, contract 또는 source>
별도 Issue: <링크와 지금 미루는 이유>
```

사람은 Issue/acceptance → behavior → architecture/security → risky diff → AI finding → evidence 순으로 검토합니다. AI comment 수나 job 성공만으로 Approve하지 않습니다.

## 검증 matrix

| 변경 유형         | 최소 evidence                                                                |
| ----------------- | ---------------------------------------------------------------------------- |
| 일반 변경         | `pnpm quality`                                                               |
| Engine/Scenario   | invariant, fixed-seed 재현성 test + `pnpm test`                              |
| Challenge         | 순진한 해법 실패, 의도한 해법 통과 script                                    |
| UI/UX             | 핵심 flow, 오류 상태, desktop, 375px overflow, console error 확인            |
| 성능 주장         | 환경, duration, warm-up, raw result와 model/measurement provenance           |
| Workflow/security | `actionlint`, permissions, immutable pins, trusted-base/secret boundary 검토 |
| Cloudflare Worker | `docs/AI_GATEWAY.md`에 따른 dry-run, deploy와 endpoint 검증                  |

검사를 실행하지 못했다면 통과했다고 쓰지 않고 명령과 이유를 정확히 남깁니다. browser model 결과를 production benchmark로 표현하지 않습니다.

## 유지해야 할 Architecture boundary

- 계산 규칙을 React component 안에 넣지 않습니다.
- Scenario schema와 engine은 UI를 알지 못합니다.
- 같은 Scenario와 seed는 같은 결과를 냅니다.
- local state는 React, 여러 island가 공유하는 preference만 Zustand, 공유 가능한 상태는 URL에 둡니다.
- feature 간 import는 `@/`, 같은 directory 내부는 `./`를 사용합니다.
- Astro는 정적 shell이고 React island는 interaction만 담당합니다.
- database, hosted search, analytics는 측정된 필요와 비용 상한 없이 도입하지 않습니다.
- AI retrieval은 내부 검수 자료를 먼저 찾고 부족할 때만 공식 원문을 사용하며 답변마다 출처를 표시합니다.

## 현재 알려진 risk와 결정 필요 사항

- PR #14의 local Action과 독립 Action이 중복되어 있습니다. merge 전에 단일 source of truth로 정리해야 합니다.
- live LLM 및 GitHub comment write는 아직 credential과 원격 PR을 사용한 end-to-end evidence가 필요합니다.
- 첫 workflow 추가 PR은 base branch에 workflow가 없으므로 스스로 AI review를 실행하지 못할 수 있습니다. merge 후 작은 test PR로 검증합니다.
- OpenCodeReview `v1.7.16`은 Markdown/MDX review에 제한이 있습니다. 문서 drift와 source 검증은 deterministic checker와 사람이 담당합니다.
- AI review는 false positive/negative와 provider 장애가 있으므로 required check로 승격하지 않습니다. 승격은 fixture eval, 비용과 가용성 측정 후 별도 decision입니다.

## Handoff 완료 조건

다음 채팅은 작업을 마칠 때 이 문서를 최신화하고 다음을 보고합니다.

- 사용자가 얻게 된 결과
- 영향을 받은 file과 public/architecture contract
- 실제 실행한 검증 명령과 결과
- browser 또는 GitHub Actions 관찰
- 선택하지 않은 대안과 이유
- 남은 risk와 다음 한 가지 결정

대화 내용 자체는 evidence가 아닙니다. test, fixture, Scenario, screenshot, command output, GitHub run과 decision log를 남깁니다.
