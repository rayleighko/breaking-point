# Changelog

사용자에게 보이는 주요 변경을 기록합니다. 세부 구현 이력은 Git commit을 source of truth로 사용합니다.

## 2026-08-03

### Added

- p50과 p99 lab: 같은 평균·다른 꼬리 나란히 비교와 평균만 맞추기 챌린지
- Queue의 감각 lab: 이용률 슬라이더와 대기시간 곡선, 피크 여유 챌린지
- Bug, Lab, Knowledge, Feature/Architecture용 GitHub Issue Form과 evidence 중심 PR template
- Connection Pool Lab의 상태를 공유하는 전역 Breaking Point Cat Mini Lab
- 세 가지 변경안 선택 후 명시적으로 승인하는 AI coaching flow
- `단서 하나 → 선택지 세 개 → 직접 설명`의 단계형 Hint
- Lab당 최대 두 번의 비침해적 능동 알림과 Cat 숨김·복구 UI
- local-first 학습 event contract와 provider-neutral analytics boundary
- 전체 Wiki·Lab·roadmap을 찾는 Pagefind 검색과 정적 knowledge graph
- Light/Dark theme, mobile navigation과 Chromium·Firefox·WebKit 회귀 검수
- OpenRouter secret을 보호하는 Cloudflare Worker AI gateway

### Changed

- 사용자 문장은 존칭 한국어를 사용하고 기술 고유명사는 보편적인 원어를 유지하도록 콘텐츠 규칙을 정리했습니다.
- AI retrieval은 내부 검수 자료 우선, 공식 원문 fallback, 답변별 출처 표시로 결정했습니다.
- 수식과 code block의 Light mode 대비를 개선했습니다.
- simulation은 화면 밖이나 background에서 정지해 browser 부하를 줄입니다.

### Verified

- `pnpm quality`와 주요 Playwright flow를 통과했습니다.
- GitHub Pages와 `breaking-point-ai` Worker 배포를 확인했습니다.
