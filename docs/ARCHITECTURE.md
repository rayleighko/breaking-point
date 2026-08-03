# Architecture

Breaking Point는 학습 경험에 필요한 만큼만 runtime을 사용합니다. 정적 콘텐츠와 실제 workload 실행을
한 server에 억지로 합치지 않습니다.

## 현재: Static shell + Client Islands

Astro는 랩 본문, 주제 위키와 로드맵을 build time에 HTML로 만듭니다. React는 simulation, chart,
challenge처럼 상호작용이 필요한 부분에만 사용합니다.

현재 구조가 적합한 이유는 다음과 같습니다.

- 로그인이나 사용자별 데이터가 없습니다.
- 모든 방문자에게 같은 교육 콘텐츠를 제공합니다.
- simulation은 deterministic model이며 browser에서 안전하게 실행됩니다.
- GitHub Pages에 server 운영 비용 없이 배포할 수 있습니다.
- 콘텐츠를 읽는 사용자는 simulation을 보기 전까지 불필요한 JavaScript를 받지 않습니다.

SSR은 지금 필요하지 않습니다. SSR이 필요한 조건은 사용자별 권한, 자주 바뀌는 server data,
cookie/session, 비공개 API credential 또는 request마다 만들어야 하는 HTML이 생길 때입니다.

## Simulation fidelity levels

모든 simulation 입력은 version이 있는 Scenario JSON으로 표현합니다. UI는 JSON을 만들고 검증하는
client이며, engine은 UI를 알지 못합니다. 같은 Scenario를 browser model, local workload와 미래의 hosted
sandbox가 공유하되 결과에는 반드시 어떤 fidelity level에서 측정했는지 표시합니다.

```
Scenario JSON → schema validation → engine adapter → deterministic engine → result + evidence
                                        ├─ browser visualization
                                        └─ GitHub Issue report
```

### Level 1 — Deterministic browser model

현재 방식입니다. queue, timeout, retry와 capacity 관계를 빠르고 재현 가능하게 배웁니다. 표시되는 RPS는
production benchmark가 아니며 실제 CPU나 network를 소비한 결과가 아닙니다.

### Level 2 — Local runnable lab

실제 runtime 차이를 배울 때 사용합니다. 사용자가 repository를 clone하고 Docker Compose로 Node.js,
Go/JVM application, PostgreSQL, Redis를 실행합니다. k6가 실제 traffic을 만들고 OpenTelemetry와 container
metric으로 CPU, memory, connection과 latency를 수집합니다.

사이트는 실행 명령과 예상 결과를 안내하고, 사용자가 측정 결과 JSON을 browser에 끌어다 놓으면 같은
chart에서 해석할 수 있게 합니다. 공개 server 비용이나 보안 위험 없이 실제 자원을 경험할 수 있습니다.

장기적으로는 `bp` CLI가 이 과정을 자동화합니다. CLI는 별도의 simulation 규칙을 갖지 않고 같은
Scenario schema와 lab manifest를 사용합니다. Docker 환경 확인, image 실행, traffic 생성, metric 수집과
결과 bundle 생성을 담당하며, 마지막에는 local Playground URL을 열어 결과를 시각화합니다.

### Level 3 — Hosted isolated sandbox

설치 없이 production-like experiment를 제공하려면 별도 backend가 필요합니다. 각 사용자에게 짧게 사는
격리 container나 VM을 할당하고 CPU·memory·실행 시간·network를 제한해야 합니다. Queue, scheduler,
cleanup, abuse prevention과 비용 상한도 필요합니다.

이 단계는 SSR 기능이 아니라 **workload orchestration service**입니다. Astro는 계속 정적 학습 shell로
남기고, 별도 API와 sandbox가 experiment run을 담당하도록 분리합니다.

## SSR을 도입하는 시점

다음 기능이 실제로 필요해질 때 GitHub Pages에서 on-demand rendering을 지원하는 host와 Astro adapter로
이전합니다.

- 계정과 학습 진행률 저장
- 비공개 challenge 결과와 leaderboard
- server에서 보호해야 하는 credential
- 실행 이력과 팀별 curriculum
- server island 또는 API endpoint

## AI assistant boundary

AI 학습 코치의 UI는 별도 페이지가 아니라 전역 `PetCoach` React island입니다. 기본은 접힌 상태이며,
사용자가 열 때만 채팅과 model catalog를 mount합니다. 상태와 3D asset의 경계는
[`PET_COACH.md`](./PET_COACH.md)를 따릅니다.

초기 AI 학습 코치는 사용자가 제공한 OpenRouter API key로 browser에서 provider API를 직접 호출합니다. Key는
React memory에만 두고 localStorage, analytics, Issue 또는 server에 저장하지 않습니다. 무료 model catalog는
runtime에 조회하므로 특정 model availability를 build에 고정하지 않습니다.

사용자별 history, project-owned credit, abuse prevention, prompt audit 또는 private context가 필요해지면 browser
직접 호출을 중단하고 별도 AI gateway를 둡니다. 이 gateway는 SSR page와 동일한 책임이 아니라 key protection,
rate limiting, provider routing과 data policy를 담당합니다.

SSR을 먼저 도입하지 않습니다. 콘텐츠 전달, simulation model, 실제 workload 실행은 서로 다른 문제이며,
각 문제에 필요한 가장 작은 runtime을 선택합니다.

공개 AI 코치는 GitHub Pages에서 직접 provider를 호출하지 않습니다. 별도 Cloudflare Worker가 secret, model
allowlist, 요청 크기 제한, Origin 검증과 rate limiting을 담당합니다. 배포 절차는
[`docs/AI_GATEWAY.md`](./AI_GATEWAY.md)를 따릅니다.

AI의 제품 방향과 retrieval contract는 [`docs/DOMAIN_AI.md`](./DOMAIN_AI.md)를 따릅니다. Web chat, MCP와
agent skill은 서로 다른 knowledge base를 만들지 않고 topic collection과 source registry를 공유합니다.

## 권장 진화 순서

1. Browser simulation으로 system model을 검증합니다.
2. Docker Compose 기반 local lab 하나를 proof of concept로 만듭니다.
3. 동일한 scenario를 TypeScript와 Go 또는 JVM에서 비교합니다.
4. 실제 사용자가 설치 과정에서 막히는지 확인합니다.
5. 수요가 확인된 뒤에만 hosted sandbox의 비용과 보안 모델을 설계합니다.

## Browser와 CLI의 책임

| 영역                   | Browser Playground     | `bp` CLI                             |
| ---------------------- | ---------------------- | ------------------------------------ |
| Scenario 작성·검증     | 주 책임                | file과 stdin 입력 검증               |
| Deterministic model    | 직접 실행              | 필요하면 headless 실행               |
| 실제 process/container | 실행하지 않음          | Docker Compose와 load generator 관리 |
| 결과 표현              | animation, chart, 비교 | machine-readable bundle 생성         |
| 공유                   | URL, GitHub Issue      | bundle file, Issue용 Markdown 생성   |

CLI가 만드는 결과는 단순 요약 JSON이 아니라 재현에 필요한 manifest, Scenario, 환경 정보, raw sample과
요약값을 묶은 evidence bundle입니다. Playground는 이 bundle을 import하여 model 예측과 실제 측정을 같은
축에 표시하되 두 값을 명확히 구분합니다.
