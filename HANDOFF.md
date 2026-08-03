# Codex 인수인계 프롬프트

> 아래 내용을 그대로 Codex(또는 다른 코딩 에이전트)에 붙여넣고 이어서 작업하면 됩니다.
> `[ ]` 항목을 위에서부터 처리하세요.

---

## 프로젝트 컨텍스트

`breaking-point` — AI 시대의 software engineer가 시스템을 **브라우저 simulation으로 직접
부숴보며** 배우는 공개 학습 사이트. Astro 5 + React 19 island, GitHub Pages 정적 배포, 한국어.

- 공개 주소: <https://rayleighko.github.io/breaking-point/>
- repository: <https://github.com/rayleighko/breaking-point>
- package manager: pnpm 10 (`pnpm-lock.yaml`을 source of truth로 사용)

**설계 원칙 4가지** (모든 판단의 기준. 어길 때는 이유를 명시할 것):

1. **읽지 말고 만진다** — 모든 개념에 실제로 돌아가는 시뮬레이터가 붙는다.
2. **중학교 수학까지만** — 용어를 먼저 가르치지 않는다. 현상 → 산수 → 그다음 이름.
3. **챌린지로 닫는다** — 제약이 있는 문제를 주고, 순진한 해법(자원만 늘리기)은 반드시 실패하게 만든다.
4. **다시 왔을 때 30초** — 각 랩 끝에 리마인드 카드.

자세한 작성 규격은 `CONTENT_GUIDE.md`. 새 랩을 쓸 때는 반드시 먼저 읽을 것.

## 현재 상태

**완성**

- 사이트 뼈대: 레이아웃, 네비, 디자인 토큰, 콘텐츠 컬렉션, 라우팅, GitHub Actions 배포 워크플로
- `src/lib/engine.ts` — Queue 시뮬레이션 엔진. 앞으로의 랩 대부분이 이걸 재사용한다.
  도착(포아송) / 창구(커넥션 풀) / 대기열 / acquire 타임아웃 / 재시도 / 리틀의 법칙 계산.
  시드 고정이라 재현 가능.
- 랩 3개 완성:
  - `커넥션 풀 고갈` (`src/content/labs/connection-pool.mdx`)
    - 시각화(`Stage.tsx` — 은행 창구 비유 캔버스 애니메이션)
    - 응답시간 그래프(`Chart.tsx` — 로그 스케일 p50/p99 + 에러율)
    - 챌린지(`Challenge.tsx` — 트래픽 스파이크 방어)
    - 확인 문제(`Quiz.tsx`)
  - `Queue의 감각` (`src/content/labs/queue-sense.mdx`)
    - 이용률→대기시간 곡선(`WaitCurve.tsx` + `queue-sense.ts`)
    - 실시간 Stage/Chart와 70%/95% 비교
    - 챌린지(`QueueSenseChallenge.tsx` — 피크에서도 70% 여유)
    - 확인 문제(`Quiz.tsx`)
  - `p50과 p99` (`src/content/labs/p50-p99.mdx`) — **feature/p50-p99 브랜치**
    - 혼합 분포 순수 계산(`src/lib/p50-p99.ts`)
    - 나란히 비교 UI(`P50P99Lab.tsx` + `DistCompare.tsx`)
    - 챌린지(`P50P99Challenge.tsx` — 평균만 맞추기 실패 / 꼬리 자르기 통과)
    - 확인 문제(`Quiz.tsx`)
- 엔진·랩 테스트 (`test/`, `pnpm test`에 `test-p50-p99.ts` 포함)
- 정적 Wiki content collection과 knowledge graph (`src/content/topics/*.json`)
- Pagefind 기반 통합 검색: lab·Wiki·roadmap·resource 검색
- JSON scenario playground와 공유 가능한 URL
- 라이트/다크 테마, 반응형 navigation, 375px mobile 기준
- 전역 AI Pet Coach beta UI와 OpenRouter용 Cloudflare Worker proxy 뼈대
- Connection Pool Lab과 상태를 공유하는 Mini Lab, 승인형 AI 제안과 단계형 Hint
- ESLint·Prettier·TypeScript·engine test·build를 묶은 `pnpm quality`
- Chromium·Firefox·WebKit용 Playwright compatibility/performance test

**검증된 것**

- 엔진 물리: 풀 5개 × 50ms → 처리량 정확히 100 RPS 상한. 리틀의 법칙 일치.
- 큐 불변식: 풀 크기를 실시간으로 바꿔도 `enqueuedAt` 오름차순 유지, 타임아웃 누락 없음.
- 챌린지 난이도: 풀만 20개까지 올리는 순진한 해법은 p99 634ms로 실패(기준 500ms).
  쿼리 시간을 줄이면 통과. 의도대로 작동함.

**검증 완료 (2026-08-03)**

> `pnpm quality` 통과. Queue의 감각 lab은 preview에서 70%→95% 프리셋(대기 약 14배),
> 375px overflow 없음, console error 없음을 확인했습니다.
> 챌린지는 `test/test-queue-sense.ts`로 순진한 해법 실패·의도한 해법 통과를 검증했습니다.

**진행 중 — feature/p50-p99 (2026-08-03)**

> 브랜치: `feature/p50-p99` → PR target `develop` (main 직접 merge 금지).
> 로컬 `pnpm quality` 통과 (format·lint·astro check·test·build).
> 챌린지: `test/test-p50-p99.ts`에서 순진한 해법(평균 100·p99 5050) 실패,
> 의도한 해법(평균 100·p99 290) 통과.
> 남은 확인: preview 375px overflow·console, CI(browser) 녹색 후 develop merge.
> 다음 slice: `engine.ts` Sim 좌우 체감 연결, Pet Coach `labId` 등록, browser smoke.

---

## 작업 목록

### A. 최우선 — 실제로 빌드시키기

- [x] `pnpm install` 실행 → `pnpm-lock.yaml` 생성
      → `.github/workflows/deploy.yml`은 `pnpm install --frozen-lockfile` 사용
- [x] `pnpm exec astro sync && pnpm check` — 타입 에러 전부 해결
      (`astro:content`, `import.meta.env.BASE_URL` 타입은 `astro sync` 이후에 생성됨)
- [x] `pnpm build` 성공시키기
- [x] `pnpm dev`로 육안 확인:
  - [x] 홈(`/`)의 시뮬레이터가 자동으로 돌아가는가
  - [x] 캔버스 애니메이션에서 요청이 대기줄 → 창구 → 출구로 자연스럽게 흐르는가
  - [x] 슬라이더를 움직이면 즉시 반응하는가 (일시정지 상태에서도 창구 격자가 바뀌는가)
  - [x] 프리셋 5개가 각각 의도한 상황을 보여주는가
  - [x] 챌린지 실행 → 45초 시뮬 → 판정이 정상 동작하는가
  - [x] 모바일 폭(375px)에서 레이아웃이 깨지지 않는가
  - [x] 랩 페이지에서 가로 스크롤이 생기지 않는가 (`.bleed` 관련)
- [x] `pnpm test` 통과 확인

### B. 배포

- [x] `astro.config.mjs`의 `SITE` / `BASE`를 실제 GitHub 계정·레포명으로 교체
      (`USERNAME.github.io` 레포면 `BASE = '/'`)
- [x] `src/components/Nav.astro`의 GitHub 링크 URL 교체
- [x] 레포 Settings → Pages → Source를 `GitHub Actions`로 설정
- [x] 푸시 후 배포 확인, 실제 URL에서 base 경로가 깨지지 않는지 점검

### C. 알려진 개선 과제

- [x] `Stage.tsx` — browser performance budget과 자동 회귀 검수 추가
      (`test/browser/performance.spec.ts`, 상세 기준은 `docs/PERFORMANCE.md`)
- [x] scenario 상태를 URL query에 직렬화 — playground 설정 공유 가능
- [ ] `Chart.tsx`에 처리량(throughput) 라인 추가 검토 (현재는 지연시간과 에러율만)
- [x] 다크/라이트 테마 토글과 system preference 지원 (기본은 라이트)
- [ ] OG 이미지 자동 생성
- [x] AI Gateway 실제 배포: OpenRouter key, Cloudflare Worker, `PUBLIC_AI_API_URL` 연결
- [ ] 최종 고양이 sprite asset 제작과 상태별 animation 연결
- [ ] Wiki 규모가 수천 건을 넘을 때 build 시간·검색 index 크기를 측정하고 외부 검색 전환 판단

Cloudflare는 정적 site hosting이 아니라 AI API key를 보호하는 proxy에만 사용합니다. 설정과 수동 작업은
`docs/AI_GATEWAY.md`를 따릅니다. API key를 repository나 `PUBLIC_` 환경 변수에 넣지 않습니다.

AI retrieval은 내부 검수 자료를 먼저 사용하고, 부족할 때만 공식 원문으로 fallback하며 답변마다 출처를
표시합니다. 현재는 별도 database나 vector index를 사용하지 않습니다. 도입 기준은
`docs/RETRIEVAL_COST_POLICY.md`, 결정 이력은 `docs/DECISIONS.md`를 따릅니다.

### D. 다음 콘텐츠 (`src/lib/roadmap.ts`가 전체 목차 = 진행 상황판)

우선순위 순:

1. ~~**Queue의 감각**~~ — 완료 (`queue-sense`, roadmap status `done`)

2. ~~**p50과 p99**~~ — 콘텐츠·챌린지 스크립트 완료 (`p50-p99`). develop PR 리뷰/CI 대기.
   다음 slice 후보: 실제 `engine.ts` Sim을 낮은 이용률로 좌우 실행해 체감 연결,
   Pet Coach `labId` 등록, browser smoke.

3. **캐시 스탬피드** — 캐시를 넣었는데 왜 5분마다 DB가 죽을까
   시뮬: TTL 동시 만료 순간 요청이 DB로 쏟아지는 장면 + 지터/뮤텍스 적용 비교.
   → `engine.ts`에 캐시 계층(히트 시 즉시 반환, 미스 시 창구 점유) 추가 필요.

4. **리트라이 스톰** — 백오프 없음 / 고정 / 지수+지터 3가지를 나란히 실행
   → `engine.ts`의 `retryBackoff`를 전략 함수로 일반화.

랩을 완성하면 `src/lib/roadmap.ts`에서 해당 항목의 `status`를 `'done'`으로,
`slug`를 채울 것.

---

## 작업 규칙

- **엔진을 고치면 `pnpm test`를 반드시 다시 돌린다.** 시뮬레이션이 물리적으로 틀리면
  이 프로젝트는 존재 가치가 없다.
- **새 챌린지를 만들면 반드시 스크립트로 난이도를 검증한다.**
  `test/test-chal.ts`가 그 패턴이다 — 순진한 해법이 실패하고 의도한 해법이 통과하는지
  코드로 확인한 뒤에 배포한다.
- **콘텐츠를 쓰기 전에 `CONTENT_GUIDE.md`의 9단 구조와 발행 전 체크리스트를 확인한다.**
- 커밋 메시지는 한국어로, `랩: 캐시 스탬피드 추가` / `엔진: 캐시 계층 지원` 식으로.

## 다음 작업 시작점

1. 일반 변경은 `AGENTS.md` → 관련 문서 → 관련 test 순으로 읽습니다.
2. 브랜치는 `docs/GITFLOW.md`를 따릅니다. `develop`에서 `feature/<slug>`를 만들고, 공개는
   `develop` → `main` release PR로만 합니다.
3. 현재 상태 확인은 `git status --short --branch`와 `pnpm quality`로 시작합니다.
4. UI 변경은 `docs/FRONTEND_GUIDELINES.md`, simulation 변경은 `docs/ENGINE_GUIDE.md`, 새 콘텐츠는
   `CONTENT_GUIDE.md`를 먼저 읽습니다.
5. feature를 `develop`에 합친 뒤 release PR로 `main`에 올리면 GitHub Pages가 배포됩니다. Actions와
   공개 URL을 모두 확인합니다.
6. AI Gateway는 배포되어 있습니다. Worker를 변경하면 `docs/AI_GATEWAY.md`에 따라 dry-run, deploy와 공개
   endpoint를 검증합니다.
7. 완료된 제품 변경은 `CHANGELOG.md`, architecture 결정은 `docs/DECISIONS.md`, 다음 실행 상태는 이 문서에
   반영합니다.
