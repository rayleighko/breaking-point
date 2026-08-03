# Product and architecture decisions

대화가 아니라 이 문서가 현재 결정의 요약입니다. 새 결정은 날짜, 상태, 이유, 결과와 재검토 조건을 남깁니다.

## 2026-08-03 — GitFlow for stable Pages delivery

**Status:** Accepted

`main`은 GitHub Pages 배포 전용 안정 브랜치로 둡니다. 일상 통합은 `develop`, 로드맵 작업은
`feature/<slug>`에서 진행하고 release PR로만 `main`에 올립니다. 한 feature는 한 lab 또는 한 사용자
결과만 담아 quality gate를 통과시킨 뒤 합칩니다. 상세는 `docs/GITFLOW.md`를 따릅니다.

## 2026-08-03 — AI retrieval source policy

**Status:** Accepted

내부에서 검수한 Topic, Lab과 source registry를 먼저 검색합니다. 근거가 부족할 때만 표준 기구, 원 논문 또는
vendor 공식 문서를 fallback으로 사용하며 모든 답변에 출처를 표시합니다. 범용 web 결과로 근거의 빈칸을
채우지 않습니다.

## 2026-08-03 — Vectorless-first retrieval

**Status:** Accepted

Pagefind, metadata, tag, synonym과 knowledge graph를 기본 retrieval로 사용합니다. 별도 Vector DB와 D1은 현재
도입하지 않습니다. 고정 eval에서 lexical retrieval 실패가 측정되고 정적 index의 payload/build budget까지
문제가 될 때만 hybrid vector retrieval을 검토합니다. 상세 gate는 `docs/RETRIEVAL_COST_POLICY.md`를 따릅니다.

## 2026-08-03 — Local-first learner data

**Status:** Accepted

Pet 설정과 학습 상태는 browser에 저장하고 계정, 원문 대화 저장과 Leaderboard를 보류합니다. 사용자의 기기 간
동기화 수요와 학습 유지율 개선이 확인되기 전에는 server database 비용과 개인정보 책임을 만들지 않습니다.

## 2026-08-03 — Lab Companion, not autonomous agent

**Status:** Accepted

Breaking Point Cat은 실험 상태를 관찰하고 Hint와 최대 세 가지 변경안을 제안합니다. 값은 사용자의 명시적인
승인 뒤에만 변경하며, 능동 알림은 장애 징후나 학습 지점에서 Lab당 최대 두 번입니다. AI를 꺼도 모든 Lab을
완료할 수 있어야 합니다.

## 2026-08-03 — Static learning shell and isolated gateway

**Status:** Accepted

Astro와 GitHub Pages는 정적 학습 shell을 유지합니다. AI secret과 provider 호출만 Cloudflare Worker로
분리합니다. SSR, hosted sandbox와 account backend는 각각의 수요가 측정되기 전에는 도입하지 않습니다.
