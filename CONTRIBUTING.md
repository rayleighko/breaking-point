# Contributing to Breaking Point

Breaking Point는 설명의 양보다 **검증 가능한 학습 경험**을 우선합니다. 좋은 의도만으로도
콘텐츠가 빠르게 늘어날 수 있기 때문에, 새 랩은 바로 구현하기보다 문제와 검증 방법부터 합의합니다.

## 먼저 고를 것

| 기여 유형                    | 시작 위치          | 필요한 내용                                          |
| ---------------------------- | ------------------ | ---------------------------------------------------- |
| 오탈자·깨진 링크             | 바로 PR 가능       | 변경 이유 한 줄                                      |
| 주제 위키 설명·출처 개선     | Knowledge Issue/PR | 해당 topic JSON, 변경 근거와 내부 자료·공식 원문     |
| 기술적 오류·현실과 다른 모델 | Bug Issue          | 재현 조건, 기대 동작, 가능하면 공식 원문             |
| 새 랩·큰 시뮬레이터          | Lab Proposal       | 현상, 순진한 해법, 제약, 통과 조건, 난이도 검증 계획 |
| 기능·AI·검색·Architecture    | Feature Proposal   | 사용자 문제, 대안, 비용 상한, fallback, 검증 계획    |
| UI·접근성                    | Bug Issue/작은 PR  | 전/후 화면, 검증한 viewport                          |
| 보안 문제                    | 공개 Issue 금지    | GitHub Security Advisory의 private report 사용       |

새 랩은 maintainer가 Proposal에 `accepted` label을 붙인 뒤 시작해 주세요. 승인 전 대규모 PR은
방향이 맞아도 검토하지 않고 닫을 수 있습니다. 이는 아이디어를 거절하기 위해서가 아니라,
maintainer와 contributor 모두의 시간을 보호하기 위한 규칙입니다.

## Content contract

모든 랩은 [CONTENT_GUIDE.md](./CONTENT_GUIDE.md)를 따릅니다.

- 현상 → 산수 → 업계 용어 순서로 설명합니다.
- vendor 이름은 generic pattern을 설명한 뒤에만 사용합니다.
- `Kubernetes`, `AWS Lambda`, `Amazon RDS Proxy`처럼 공식 명칭을 씁니다.
- 숫자·기본값·서비스 동작은 공식 문서나 1차 출처를 링크합니다.
- 국제 표준, de facto standard, vendor behavior, industry practice와 company case를 구분합니다.
- 한국어로 설명하되 기술 고유명사와 검색 가능한 원어 표기를 보존합니다.
- challenge는 “자원만 늘리기”가 실패하고 의도한 해법이 통과함을 테스트로 증명합니다.
- 실제 시스템 benchmark처럼 오해될 수 있는 수치를 쓰지 않습니다.

주제 위키는 `src/content/topics/`의 topic별 JSON 파일로 관리합니다. 설명을 개선할 때는 기존 slug를
유지하고, 관련 주제 slug와 출처 URL이 유효한지 `pnpm test`와 `pnpm build`로 확인해 주세요. 여러 주제를
한 PR에서 일괄 재작성하기보다 하나의 개념과 근거에 집중해 주세요.

## Pull request checklist

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

UI를 바꿨다면 desktop과 375px viewport에서 직접 확인하고 PR에 결과를 적습니다.
simulation engine을 바꿨다면 불변식 테스트와 challenge 난이도 테스트를 반드시 갱신합니다.

PR은 한 가지 목적만 담고, 무엇을 바꿨는지보다 **왜 이 모델이 맞는지**를 설명해 주세요.
AI를 사용한 기여도 환영합니다. 다만 작성자가 결과를 이해하고, 출처와 테스트를 직접 확인해야 합니다.

AI coding agent를 사용한다면 먼저 `AGENTS.md`와 `docs/AI_HARNESS.md`를 읽혀 주세요. Codex, Claude Code,
Cursor와 자동 instruction discovery가 없는 API agent에서 같은 품질 기준을 적용하는 방법과 project skill이
정리되어 있습니다. PR에는 model이나 prompt 전문보다 실행한 검증, browser 관찰과 trade-off를 남겨 주세요.

자동 instruction discovery가 없는 도구에는 다음 bootstrap prompt를 사용할 수 있습니다.

```text
Read AGENTS.md and docs/AI_HARNESS.md first. Use the relevant project skill under skills/.
Before editing, state the objective, scope, constraints, acceptance criteria, and required evidence.
Use the matching GitHub Issue or PR template and do not claim completion without running its checks.
```

## Review and ownership

- maintainer는 scope, 교육적 정확성, 유지 비용을 기준으로 최종 결정을 내립니다.
- 요청된 변경이 30일 동안 반영되지 않으면 PR을 닫을 수 있습니다.
- merge는 즉시 발행을 보장하지 않습니다. 로드맵 순서에 맞춰 공개할 수 있습니다.
- 행동 기준은 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)를 따릅니다.
