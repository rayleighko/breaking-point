# 직접 구현해 보는 순서

뼈대 이후의 기능은 아래 순서로 구현해 보시는 것을 권합니다. 각 작업은 한 가지 질문과 검증 기준으로
닫히므로 학습 기록과 portfolio evidence로 남기기 쉽습니다.

## 1. 공유 가능한 Scenario URL

- 배우는 것: serialization, URL size, backward compatibility
- 구현: Playground의 JSON을 압축하거나 짧은 query parameter로 저장하고 다시 열 때 복원합니다.
- 완료 기준: 같은 URL을 새 tab에서 열면 같은 seed와 결과가 나오며, 잘못된 version은 친절히 거절합니다.
- test: encode/decode round-trip, malformed input, 이전 schema fixture

## 2. Cache stampede engine

- 배우는 것: TTL, jitter, request coalescing, cache/DB responsibility
- 구현: `cache.v1` Scenario와 순수 engine을 추가하고 TTL 동시 만료를 시각화합니다.
- 완료 기준: TTL만 둔 해법은 DB capacity를 넘고, jitter 또는 mutex를 적용한 해법은 constraint 안에 듭니다.
- test: 고정 seed 재현성, hit/miss conservation, 순진한 해법 실패와 의도한 해법 통과

## 3. Runtime 비교 recipe

- 배우는 것: 같은 architecture가 runtime의 concurrency model에 따라 구현되는 방식
- 구현: 동일한 bounded worker API를 TypeScript, Go, Rust로 만들고 Kotlin/Java는 JVM recipe로 묶습니다.
- 완료 기준: 같은 input fixture와 output contract를 사용하고 각 구현에서 cancellation과 overload를 설명합니다.
- 주의: 문법 비교가 아니라 event loop, goroutine, async task, JVM thread의 trade-off를 비교합니다.

## 4. Local workload lab

- 배우는 것: model과 measurement의 차이, Docker resource limit, PostgreSQL connection
- 구현: Docker Compose로 application, PostgreSQL와 k6를 실행하고 결과 JSON을 Playground로 import합니다.
- 완료 기준: 한 명령으로 시작·종료할 수 있고 CPU/memory 상한이 있으며 production credential이 필요 없습니다.
- evidence: 환경, warm-up, duration, raw result와 해석을 함께 저장합니다.

## 4-1. Local Lab CLI proof of concept

- 배우는 것: CLI contract, process lifecycle, Docker orchestration, cleanup과 안전한 기본값
- 구현: `doctor`, `run`, `down` 세 명령만 가진 repository-local `bp` script를 만듭니다.
- 완료 기준: interrupt와 실패 상황에서도 자신이 만든 resource만 정리하고 `bp-result.v1` bundle을 남깁니다.
- test: Docker가 없을 때 안내, port 충돌, duration 상한, Ctrl+C cleanup, 동일 fixture 결과 parsing
- 설계 기준: [`CLI_VISION.md`](./CLI_VISION.md)

## 5. 개발 방법론 lab

- 배우는 것: TDD의 feedback loop, DDD의 boundary, OOP의 invariant
- 구현: 같은 주문 규칙을 세 방식으로 변경해 보며 regression과 change surface를 비교합니다.
- 완료 기준: pattern 이름이 아니라 실패 사례, 적용 조건, 쓰지 말아야 할 조건을 simulation과 challenge로 설명합니다.

각 작업을 시작하기 전에 `CONTENT_GUIDE.md`를 읽고 Proposal Issue에 현상, 실패해야 하는 해법, constraint,
검증 script를 먼저 적습니다. 완료 후에는 PR의 decision log에 선택하지 않은 대안과 근거도 남깁니다.
