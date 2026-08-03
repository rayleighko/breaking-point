# AI harness

AI harness는 특정 model의 prompt가 아니라 어떤 coding agent를 사용해도 같은 contract, quality gate와 evidence를
적용하게 하는 repository-level 실행 환경입니다.

## Canonical context

```text
AGENTS.md                         project mission, boundaries, required evidence
├── CONTENT_GUIDE.md             lab content contract
├── docs/ENGINE_GUIDE.md         simulation contract
├── docs/FRONTEND_GUIDELINES.md  frontend contract
└── skills/                      repeatable workflows
```

제품별 파일은 adapter일 뿐입니다. 같은 규칙을 복사하지 않고 `AGENTS.md`와 이 문서를 참조합니다. 규칙을 바꿀
때는 canonical 문서를 먼저 수정하고 `pnpm test`로 adapter reference가 유효한지 검사합니다.

## Task packet

agent에게 작업을 맡길 때 다음 정보를 제공합니다.

```md
Objective: 사용자가 얻게 될 결과 한 문장
Scope: 변경 가능한 file 또는 subsystem
Constraints: 깨뜨리면 안 되는 contract와 하지 않을 일
Acceptance: 실행 가능한 완료 조건
Evidence: test, browser state, measurement 또는 screenshot
```

## Agent loop

1. **Orient** — 관련 `AGENTS.md`, contract, current implementation과 test를 읽습니다.
2. **Predict** — 변경될 behavior, 영향 surface와 실패 가능성을 짧게 기록합니다.
3. **Change** — acceptance에 필요한 가장 작은 coherent change를 만듭니다.
4. **Verify** — 가까운 test부터 실행하고 마지막에 `pnpm quality`를 실행합니다.
5. **Observe** — UI면 browser, performance면 raw measurement로 실제 결과를 확인합니다.
6. **Handoff** — 변경, evidence, 남은 risk와 다음 결정을 분리해 보고합니다.

## Cost and retrieval gate

- AI 기능은 내부 검수 자료를 먼저 검색하고, 부족할 때만 공식 원문을 사용하며, 사용자 답변마다 출처를 표시합니다.
- database, vector index, hosted analytics와 account system은 예상 traffic이 아니라 측정된 실패 지표로 정당화합니다.
- 새 managed service proposal에는 현재 무료 대안, 도입 기준, 월 비용 상한, 초과 시 동작과 제거 경로를 적습니다.
- 비용이 드는 retrieval을 추가하기 전에 고정 eval set으로 lexical recall, citation coverage와 token 사용량을 기록합니다.
- 대화에서 합의한 architecture 결정은 `docs/DECISIONS.md`, 사용자에게 전달된 변경은 `CHANGELOG.md`, 현재 실행
  상태와 다음 작업은 `HANDOFF.md`에 반영합니다. 대화 원문은 canonical context가 아닙니다.

대화 내용은 evidence가 아닙니다. test fixture, Scenario JSON, result bundle, screenshot, command output과 decision log처럼
다시 실행하거나 검토할 수 있는 artifact를 남깁니다.

## Model-neutral adapters

| 환경                          | 자동 context                      | 사용법                                            |
| ----------------------------- | --------------------------------- | ------------------------------------------------- |
| Codex 및 AGENTS.md 지원 agent | `AGENTS.md`                       | project root에서 작업합니다.                      |
| Claude Code                   | `CLAUDE.md`                       | import된 canonical 문서를 따릅니다.               |
| Cursor                        | `.cursor/rules/*.mdc`             | core rule은 항상, UX rule은 관련 file에 붙습니다. |
| GitHub Copilot                | `.github/copilot-instructions.md` | canonical 문서를 먼저 읽습니다.                   |
| OpenRouter, Hermes, API agent | 보장되지 않음                     | 첫 prompt에 아래 bootstrap prompt를 넣습니다.     |

```text
Read AGENTS.md and docs/AI_HARNESS.md first. Use the relevant project skill under skills/. Before editing,
state objective, scope, constraints, acceptance criteria, and evidence. Do not claim completion unless the
required checks were actually run.
```

어떤 model이 파일을 자동 탐색하는지 추측하지 않습니다. 자동 discovery가 보장되지 않으면 명시적으로 두 파일의
내용이나 repository URL을 context에 제공합니다.

## Harness quality

- **Determinism:** engine과 Scenario fixture는 seed로 재현합니다.
- **Bounded context:** 관련 contract와 change surface만 읽고 전체 code dump를 prompt에 넣지 않습니다.
- **Executable acceptance:** prose 대신 test와 browser state로 완료를 판정합니다.
- **Independent review:** author의 설명보다 diff, test와 artifact를 우선합니다.
- **Least authority:** 배포, 외부 load, secret, destructive command는 별도 승인 대상으로 둡니다.
- **Drift control:** adapter에는 canonical rule을 복사하지 않고 경로만 둡니다.
- **Human ownership:** contributor는 선택한 대안과 포기한 대안을 설명할 수 있어야 합니다.

## PR handoff

AI를 사용한 PR은 사용자 관점의 변경 결과, 변경한 contract, 정확한 검증 명령, browser 관찰, 선택하지 않은
대안과 알려진 limitation을 포함합니다. model 이름과 prompt 전문보다 결과에 대한 이해와 evidence를 우선합니다.
