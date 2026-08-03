# Breaking Point

> AI가 코드를 만드는 시대에도, 시스템의 결정을 설명하고 검증할 수 있는 개발자를 위한 공개 학습 프로젝트.

**서비스:** [rayleighko.github.io/breaking-point](https://rayleighko.github.io/breaking-point/)

트래픽 관련 문제는 **겪어보지 않으면 존재조차 인지하지 못하는** 종류의 것들입니다.
"파드를 늘리면 되지 않나?"라는 질문이 자연스럽게 나오는 이유이기도 합니다.

이 프로젝트는 그 간극을 simulation으로 메우려는 시도입니다. 글을 읽는 대신 슬라이더를 밀어서
시스템을 부러뜨리고, 왜 부러졌는지 숫자로 확인합니다. 그다음 같은 pattern이 TypeScript application,
PostgreSQL, Docker, Kubernetes, Serverless와 AWS에서 어떤 모습으로 나타나는지 연결합니다.

목표는 모든 코드를 외워서 손으로 다시 쓰는 것이 아닙니다. AI가 만든 변경을 검토하고, architecture의
trade-off를 설명하고, production에서 실패할 지점을 예측하는 **AI 시대의 software engineer** 감각을
만드는 것입니다.

## 설계 원칙

1. **읽지 말고 만진다** — 모든 개념에 실제로 돌아가는 시뮬레이터를 붙인다.
2. **중학교 수학까지만 쓴다** — 용어를 먼저 가르치지 않는다. 현상 → 산수 → 그다음에 이름.
3. **챌린지로 닫는다** — 제약이 있는 문제를 주고, 배운 걸 써야만 통과하게 한다.
4. **다시 왔을 때 30초** — 각 랩 끝에 리마인드 카드를 둔다.
5. **Pattern에서 제품으로 간다** — generic model을 이해한 뒤 Kubernetes·AWS 구현을 연결한다.
6. **AI에게도 근거를 요구한다** — source, test, constraint가 없는 구현은 학습 완료로 보지 않는다.
7. **한국어에서 글로벌 기준으로 연결한다** — 국제 표준과 원어를 보존하고, 지역 관행은 적용 맥락과
   함께 설명한다.

## 시작하기

```bash
pnpm install
pnpm dev      # http://localhost:4321
pnpm build    # dist/ 생성
pnpm check    # 타입 체크
```

## 다루는 범위

- TypeScript, React, Next.js, NestJS
- PostgreSQL, cache, queue, concurrency
- Docker, Kubernetes, AWS, Terraform
- CI/CD, observability, incident response
- AI-assisted development, review, evaluation, orchestration

이 사이트가 TypeScript로 만들어진 이유는 단순합니다. 작성자에게 가장 익숙해서, 학습 model과
simulation을 빠르게 검증할 수 있었기 때문입니다. TypeScript가 system design의 정답이라는 뜻은
아닙니다. 개발자의 핵심 역량은 특정 문법을 기억하는 것이 아니라, 주어진 runtime·framework·조직의
constraint를 파악하고 같은 문제를 그 환경에 맞게 푸는 데 있다고 봅니다.

따라서 본문의 system model은 language-agnostic하게 유지하고, 구현이 필요한 경우 TypeScript를 첫
reference로 사용합니다. 이후 Go, Rust, Kotlin, Java 예제는 같은 원리를 서로 다른 runtime에서 비교하는
implementation recipe로 확장합니다.

전체 학습 순서는 [`src/lib/roadmap.ts`](./src/lib/roadmap.ts), 기술 연결 기준은
[`docs/TECHNOLOGY_LENSES.md`](./docs/TECHNOLOGY_LENSES.md)에 있습니다.
현재와 이후 실행 환경의 경계는 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)에 정리했습니다.
Local Lab 자동화의 장기 방향과 CLI contract는 [`docs/CLI_VISION.md`](./docs/CLI_VISION.md)에 있습니다.
글로벌 기준을 고르고 한국어로 전달하는 원칙은
[`docs/GLOBAL_STANDARD.md`](./docs/GLOBAL_STANDARD.md)에 있습니다.
지원 브라우저와 자동 성능 검수 범위는
[`docs/BROWSER_SUPPORT.md`](./docs/BROWSER_SUPPORT.md)에 있습니다.
정적 검색과 대규모 knowledge base 전환 기준은
[`docs/SEARCH_ARCHITECTURE.md`](./docs/SEARCH_ARCHITECTURE.md)에 있습니다.

## 배포 (GitHub Pages)

현재 `rayleighko/breaking-point` 기준으로 설정되어 있습니다.

```js
const SITE = 'https://rayleighko.github.io';
const BASE = '/breaking-point';
```

그다음 레포 **Settings → Pages → Source**를 `GitHub Actions`로 바꾸고 `main`에 푸시하면
`.github/workflows/deploy.yml`이 알아서 빌드·배포합니다.

## 구조

```
src/
├── simulation/         # Scenario schema, engine registry와 adapter
├── lib/
│   ├── engine.ts       # Queue 시뮬레이션 엔진 (모든 랩이 공유)
│   ├── roadmap.ts      # 전체 목차 = 진행 상황판
│   └── url.ts          # base 경로 헬퍼
├── components/
│   ├── sim/            # React 아일랜드 (시뮬레이터·차트·퀴즈)
│   └── *.astro         # 정적 컴포넌트 (콜아웃·리마인드 카드)
├── content/labs/       # 랩 본문 (.mdx)
├── content/topics/     # 주제별 설명·키워드·출처 (.json)
├── layouts/
├── pages/
└── styles/
```

핵심은 `src/lib/engine.ts`입니다. 창구(커넥션) · 대기줄 · 타임아웃 · 재시도를 다루는
범용 Queue 시뮬레이터라서, 앞으로의 랩 대부분이 이걸 재사용합니다.
시드가 고정돼 있어 **같은 설정이면 항상 같은 결과**가 나옵니다.

## 새 랩 추가하기

1. `src/content/labs/<slug>.mdx` 생성 (프론트매터 스키마는 `src/content.config.ts` 참고)
2. 필요하면 `src/components/sim/` 에 그 주제용 시뮬레이터 추가
3. `src/lib/roadmap.ts` 에서 해당 항목 `status`를 `done`으로 바꾸고 `slug` 기입

작성 규격은 [CONTENT_GUIDE.md](./CONTENT_GUIDE.md)에 정리해 뒀습니다.

## 기여

설명이 틀렸거나 simulation이 현실과 다르다면 Issue로 알려주세요. 새 랩은 구현 전에 Proposal Issue로
현상, 실패해야 하는 순진한 해법, challenge constraint와 검증 계획을 먼저 합의합니다.

- [Contribution guide](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security policy](./SECURITY.md)
- [Performance model](./docs/PERFORMANCE.md)

AI를 사용한 기여도 환영하지만, 결과를 이해하고 검증하는 책임은 contributor에게 있습니다.
