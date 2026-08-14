# Engineering Review Action

OpenCodeReview 위에 공통 engineering policy와 TypeScript, Go, Python profile을 올리는 재사용 가능한 PR AI
리뷰 Action입니다. AI finding은 advisory이며 deterministic CI와 사람의 Approve를 대신하지 않습니다.

## 선택 이유

- 개인은 LLM endpoint와 token만 준비하면 repository 하나에서도 사용할 수 있습니다.
- 팀은 같은 Action version과 profile을 고정해 여러 repository에 같은 1차 검수 기준을 적용할 수 있습니다.
- LLM provider는 OpenAI-compatible 또는 Anthropic API 중 선택하며 code가 전송되는 위치를 통제할 수 있습니다.
- 기존 build/deploy workflow와 독립 실행하거나 같은 `pull_request` workflow에서 `needs: quality` 뒤에 실행할 수
  있습니다.
- OpenCodeReview가 trusted base checkout, merge-base diff, inline comment, sticky summary와 incremental review를
  담당합니다.

Hosted 대안과 선택 근거는 [`docs/DECISION.md`](./docs/DECISION.md), 사람 검토 방법은
[`docs/HUMAN_REVIEW.md`](./docs/HUMAN_REVIEW.md), 주니어 self-service·시니어 escalation·팀 지표는
[`docs/TEAM_ADOPTION.md`](./docs/TEAM_ADOPTION.md), 실행한 검증과 남은 end-to-end 항목은
[`docs/VALIDATION.md`](./docs/VALIDATION.md), 여러 reviewer와 외부 review 지식의 intake 구조는
[`docs/ECOSYSTEM.md`](./docs/ECOSYSTEM.md)를 봅니다.

## Inputs

필수:

| Input               | 설명                                            |
| ------------------- | ----------------------------------------------- |
| `llm_url`           | OpenAI-compatible 또는 Anthropic endpoint       |
| `llm_auth_token`    | review 전용 API token                           |
| `llm_model`         | provider가 받는 model identifier                |
| `llm_use_anthropic` | Anthropic Messages API면 `true`, 아니면 `false` |

주요 선택 input:

| Input             | 기본값                 | 설명                                      |
| ----------------- | ---------------------- | ----------------------------------------- |
| `profiles`        | `typescript,go,python` | 쉼표로 구분한 언어 policy                 |
| `project_rule`    | 없음                   | repository 내부 OpenCodeReview rule JSON  |
| `knowledge_packs` | 없음                   | 검토된 review pack JSON 경로 목록         |
| `language`        | `English`              | review 결과 언어                          |
| `background`      | 없음                   | 제품 목표와 PR acceptance                 |
| `ocr_version`     | `1.7.16`               | 설치할 OpenCodeReview CLI version         |
| `incremental`     | `true`                 | 과거 comment와 겹치지 않는 finding만 추가 |
| `sticky_summary`  | `true`                 | summary comment 하나를 갱신               |

## 안전한 독립 실행

fork PR까지 검수하려면 `pull_request_target`을 사용하되 PR head를 checkout하거나 실행해서는 안 됩니다.

```yaml
name: AI review

on:
  pull_request_target:
    types: [opened, reopened, synchronize, ready_for_review]

permissions:
  contents: read
  pull-requests: write

concurrency:
  group: ai-review-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  review:
    if: github.event.pull_request.draft == false
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: rayleighko/engineering-review-action@v1
        with:
          llm_url: ${{ secrets.AI_REVIEW_LLM_URL }}
          llm_auth_token: ${{ secrets.AI_REVIEW_LLM_TOKEN }}
          llm_model: ${{ vars.AI_REVIEW_LLM_MODEL }}
          llm_use_anthropic: ${{ vars.AI_REVIEW_USE_ANTHROPIC }}
          profiles: typescript
          project_rule: .engineering-review/rule.json
          language: Korean
          background: >-
            PR description: ${{ github.event.pull_request.body }}
```

Marketplace에서 tag 사용이 편하지만 보안 민감 repository는 `@v1` 대신 검증한 full commit SHA를 사용합니다.

## 기존 CI 뒤에 순차 실행

같은 repository branch에서 만든 PR처럼 `pull_request` workflow에 secret이 제공되는 환경은 AI review job에
`needs: quality`를 붙일 수 있습니다. fork PR에는 repository secret이 제공되지 않으므로 이 예시는 fork를
명시적으로 건너뜁니다.

```yaml
name: Quality and AI review

on:
  pull_request:

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm quality

  review:
    needs: quality
    if: >-
      github.event.pull_request.draft == false &&
      github.event.pull_request.head.repo.full_name == github.repository
    permissions:
      contents: read
      pull-requests: write
    runs-on: ubuntu-latest
    steps:
      - uses: rayleighko/engineering-review-action@v1
        with:
          llm_url: ${{ secrets.AI_REVIEW_LLM_URL }}
          llm_auth_token: ${{ secrets.AI_REVIEW_LLM_TOKEN }}
          llm_model: ${{ vars.AI_REVIEW_LLM_MODEL }}
          llm_use_anthropic: ${{ vars.AI_REVIEW_USE_ANTHROPIC }}
          profiles: typescript
```

Go는 quality job을 `go test ./...`, `go vet ./...`로, Python은 `ruff check .`, `mypy .`, `pytest`로 바꾸고
각각 `profiles: go`, `profiles: python`을 사용합니다. AI review job에서 PR code의 dependency를 설치하거나
test를 실행하지 않습니다.

바로 복사할 수 있는 workflow는 [`examples/independent-review.yml`](./examples/independent-review.yml),
[`examples/sequential-typescript.yml`](./examples/sequential-typescript.yml),
[`examples/sequential-go.yml`](./examples/sequential-go.yml),
[`examples/sequential-python.yml`](./examples/sequential-python.yml)에 있습니다. 언어별 quality 명령과 dependency
file 이름은 각 repository contract에 맞게 바꿉니다.

## 팀 reusable workflow

Action repository의 [`.github/workflows/reusable-review.yml`](./.github/workflows/reusable-review.yml)을 호출하면
timeout, permissions와 review 설정까지 중앙에서 유지할 수 있습니다.

```yaml
jobs:
  review:
    permissions:
      contents: read
      pull-requests: write
    uses: rayleighko/engineering-review-action/.github/workflows/reusable-review.yml@v1
    with:
      profiles: go,python
      language: Korean
      project_rule: .engineering-review/rule.json
      knowledge_packs: .engineering-review/packs/security.json
    secrets:
      llm_url: ${{ secrets.AI_REVIEW_LLM_URL }}
      llm_auth_token: ${{ secrets.AI_REVIEW_LLM_TOKEN }}
      llm_model: ${{ secrets.AI_REVIEW_LLM_MODEL }}
      llm_use_anthropic: ${{ secrets.AI_REVIEW_USE_ANTHROPIC }}
```

조직 secret 전체를 `inherit`하기보다 필요한 네 값만 명시적으로 전달합니다.

## Project rule

프로젝트 고유 invariant만 repository에 둡니다. 이 rule은 언어와 공통 rule보다 먼저 평가됩니다. 선택적
`profile`을 지정하면 해당 언어 policy와 project policy가 한 rule로 결합됩니다. 생략하면 공통 correctness·security
policy가 결합됩니다.

```json
{
  "rules": [
    {
      "path": "src/domain/**",
      "rule": "같은 입력과 seed는 같은 결과를 내야 하며 invariant test가 필요합니다.",
      "profile": "typescript"
    }
  ]
}
```

`project_rule`은 `GITHUB_WORKSPACE` 내부 상대 경로만 허용됩니다. Action은 선택한 policy를
`RUNNER_TEMP`에 합성하며 token이나 전체 environment를 출력하지 않습니다.

`profile`은 Action의 `profiles` input에도 포함되어야 합니다. 지원 값은 `typescript`, `go`, `python`입니다.

외부 또는 팀 내부 review 지식은 `knowledge_packs`에 쉼표로 구분한 repository 상대 경로로 전달합니다. pack은 trusted
base에서만 읽으며 name/version, source URL, immutable revision 또는 content hash, license 판단과 검토일이 없으면
거부합니다. 예시는 [`examples/review-pack.json`](./examples/review-pack.json), intake 기준은
[`docs/ECOSYSTEM.md`](./docs/ECOSYSTEM.md)를 따릅니다.

## 검증과 release

```bash
npm test
```

독립 repository로 추출한 뒤 다음 순서로 공개합니다.

1. fixture repository에서 TypeScript, Go, Python PR을 각각 검증합니다.
2. fork PR에서 base만 checkout되고 PR code가 실행되지 않는지 확인합니다.
3. `v1.0.0` immutable release와 Marketplace listing을 만듭니다.
4. 호환 release를 가리키는 `v1` tag와 full SHA 사용법을 함께 안내합니다.
5. OpenCodeReview version 변경 시 release note, `action.yml`, secret 처리와 comment contract를 다시 검토합니다.

## 알려진 제한

- OpenCodeReview `v1.7.16`은 Markdown과 MDX를 `unsupported_ext`로 제외합니다. 문서의 broken link, process drift와
  source 검증은 deterministic checker와 사람이 담당합니다.
- AI review는 model과 prompt에 따라 false positive와 false negative가 생깁니다. 기본 branch protection에서
  required check로 사용하지 않습니다.
- `pull_request` 순차 예제는 LLM secret을 받을 수 있는 same-repository branch PR 전용입니다. fork PR은
  `pull_request_target` 독립 workflow를 사용합니다.
- 처음 Action workflow를 추가하는 PR은 base branch에 workflow가 없으므로 자동 review되지 않습니다. merge 뒤
  작은 test PR로 end-to-end를 확인합니다.
