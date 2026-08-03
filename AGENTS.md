# Breaking Point agent instructions

이 파일은 AI coding agent를 위한 canonical entry point입니다. 제품별 규칙과 대화 내용이 충돌하면 명시적인
사용자 요청, 가장 가까운 `AGENTS.md`, 이 파일 순서로 따릅니다.

## Mission

Breaking Point는 system behavior를 browser simulation으로 부수며 배우는 한국어 공개 학습 사이트입니다.
사용자에게 보이는 문장은 존칭을 사용하고, 기술 고유명사는 업계에서 통용되는 원어를 유지합니다.

모든 판단은 다음 원칙을 따릅니다.

1. 읽지 말고 만집니다. 개념에는 동작하는 simulation을 연결합니다.
2. 현상 → 중학교 수준 산수 → 용어 순서로 설명합니다.
3. constraint가 있는 challenge로 닫고 순진한 해법이 실패하게 합니다.
4. 각 lab 끝에는 30초 안에 복습할 Recall card를 둡니다.
5. generic pattern을 먼저 설명한 뒤 TypeScript, Go, Rust, JVM, AWS와 Kubernetes 구현으로 연결합니다.
6. AI 답변은 내부 검수 자료를 먼저 찾고, 부족할 때만 공식 원문을 사용하며, 답변마다 출처를 표시합니다.

## Start every task

1. 요청을 한 문장으로 다시 정의하고 acceptance criteria를 식별합니다.
2. 관련 파일만 `rg`로 찾고 변경 전 contract와 기존 test를 읽습니다. 전체 repository를 무작정 읽지 않습니다.
3. 새 lab이나 교육 콘텐츠면 `CONTENT_GUIDE.md`를 전부 읽습니다.
4. simulation 변경이면 `docs/ENGINE_GUIDE.md`와 관련 engine test를 읽습니다.
5. UI/UX 변경이면 `docs/FRONTEND_GUIDELINES.md`와 `skills/review-learning-ux/SKILL.md`를 읽습니다.
6. 작업 범위 밖의 구조 변경은 하지 않고 필요한 경우 decision과 trade-off를 보고합니다.

## Architecture boundaries

- Astro는 정적 학습 shell, React island는 interaction만 담당합니다.
- 계산 규칙을 React component 안에 넣지 않습니다. Scenario schema와 engine은 UI를 알지 못해야 합니다.
- 같은 Scenario와 seed는 같은 결과를 내야 합니다.
- Browser model 결과를 production benchmark처럼 표현하지 않습니다.
- local state는 React, 여러 island가 공유하는 client preference는 Zustand, 공유 가능한 상태는 URL에 둡니다.
- `src`의 feature 간 import는 `@/` alias, 같은 directory 내부는 `./`를 사용합니다.
- Tailwind utility와 `components/ui` primitive를 재사용하되 domain Canvas를 design system으로 추상화하지 않습니다.

## Required evidence

- 일반 변경: `pnpm quality`
- engine 변경: invariant와 재현성 test를 추가하고 `pnpm test`
- challenge 변경: 순진한 해법 실패와 의도한 해법 통과를 script로 검증
- UI 변경: 실제 browser에서 핵심 flow, 오류 상태, 375px overflow와 console error 확인
- 성능 주장: 환경, duration, warm-up, raw result와 model/measurement provenance 기록

검사를 실행하지 못했다면 통과했다고 표현하지 말고, 실행하지 못한 명령과 이유를 정확히 남깁니다.

## Safety and contribution

- public Issue나 result bundle에 secret, 전체 environment, 실제 request body를 포함하지 않습니다.
- 외부 host로 load test를 보내지 않습니다. 명시적 사용자 승인 없이는 local target만 사용합니다.
- 기존 사용자 변경을 덮어쓰거나 unrelated file을 정리하지 않습니다.
- AI가 작성한 코드도 contributor가 설명하고 검증할 수 있어야 합니다.
- 새 database, hosted search 또는 analytics는 측정된 필요와 비용 상한 없이 도입하지 않습니다. Git·정적 index·browser
  저장소로 요구사항을 충족할 수 있으면 그것을 우선합니다.
- commit message는 `영역: 변경 내용` 형식의 한국어로 작성합니다.

상세 harness contract와 제품별 사용법은 `docs/AI_HARNESS.md`, delivery·review 순환은
`docs/AI_DEVELOPMENT_LOOP.md`, 브랜치·rebase 규칙은 `docs/GITFLOW.md`, 프로젝트 skill은
`skills/breaking-point-maintainer/SKILL.md`에 있습니다. 외부 Agent OS·리뷰 CLI는 권장 참고이며
필수 merge 조건이 아닙니다.
