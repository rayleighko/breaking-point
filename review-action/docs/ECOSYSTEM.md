# 여러 AI reviewer와 외부 지식을 함께 쓰는 구조

하나의 model이나 도구가 모든 PR에 가장 적합하다고 가정하지 않습니다. 대신 저장소가 소유하는 공통 review contract와
지식을 실행기에서 분리합니다.

```text
Issue acceptance + repository contract
                  │
         project rule (highest priority)
                  │
      reviewed knowledge packs + provenance
                  │
       language profile + common policy
                  │
       ┌──────────┴──────────┐
       │                     │
OpenCodeReview lane    agentic specialist lane
always-on advisory     explicit, high-cost request
diff as data           sandbox clone + tools
       │                     │
       └──────────┬──────────┘
                  │
       author response + human approval
```

## 실행기와 지식을 분리하는 이유

- lint, test와 schema validation처럼 결정적인 검사는 CI가 소유합니다.
- correctness·security·regression 후보는 저권한 automatic reviewer가 모든 PR에서 빠르게 찾습니다.
- repository 전체 탐색, 명령 실행, 수정 제안은 sandbox와 명시적 호출이 있는 agentic reviewer에 맡깁니다.
- 팀 고유 invariant와 검토된 외부 지식은 Git에 pin한 review pack으로 두 실행기에 전달할 수 있습니다.
- tool 출력 형식이 달라도 작성자는 `수정 / 근거 있는 반박 / 별도 Issue`라는 같은 종료 계약을 따릅니다.

도구를 모두 every-PR로 실행하면 중복 comment, 비용과 책임 불명확성이 늘어납니다. 기본 lane은 하나만 두고 specialist
lane은 PR label, 위험 경로, `@reviewer` command 또는 사람의 판단으로 호출합니다.

## 현재 두 lane의 역할

| 항목       | OpenCodeReview 기반 Action        | Vercel OpenReview                             |
| ---------- | --------------------------------- | --------------------------------------------- |
| trigger    | PR event 자동                     | PR comment의 명시적 mention                   |
| code 취급  | merge-base diff를 데이터로 review | sandbox에 branch clone                        |
| tool 실행  | 하지 않음                         | lint, formatter, test 실행 가능               |
| write 범위 | PR comment                        | comment와 PR branch 수정 가능                 |
| 운영       | GitHub Action + LLM endpoint      | Vercel deploy + GitHub App + Sandbox/Workflow |
| 기본 용도  | 모든 PR의 가벼운 1차 검수         | 복잡하거나 고위험 PR의 심층 탐색              |

OpenReview는 2026-08-14 확인 시 beta이며 Claude Sonnet, Vercel Sandbox/Workflow와 `.agents/skills` progressive loading을
사용합니다. README에는 MIT라고 적혀 있지만 repository root에 LICENSE 파일이 없고 GitHub API의 license 값도
비어 있었습니다. 실행 방식은 평가할 수 있지만 skill이나 코드를 복사·배포하는 일은 upstream license가 명확해진 뒤
진행합니다. 확인한 revision과 상태는 [`catalog/review-tools.json`](../catalog/review-tools.json)에 고정했습니다.

## Review pack v1

`knowledge_packs`는 외부 또는 팀 내부 지식을 OpenCodeReview rule로 옮기는 최소 portable contract입니다. Action은
network에서 지식을 직접 내려받지 않고 trusted base에 이미 review된 JSON만 읽습니다.

```json
{
  "schema_version": 1,
  "name": "react-boundaries",
  "version": "1.0.0",
  "source": {
    "url": "https://github.com/example/review-knowledge",
    "revision": "full-commit-or-content-hash",
    "license": "MIT",
    "reviewed_at": "2026-08-14"
  },
  "rules": [
    {
      "path": "**/*.tsx",
      "profile": "typescript",
      "rule": "Check the documented server/client boundary."
    }
  ]
}
```

```yaml
- uses: rayleighko/engineering-review-action@v1
  with:
    profiles: typescript
    project_rule: .engineering-review/rule.json
    knowledge_packs: >-
      .engineering-review/packs/react.json,
      .engineering-review/packs/security.json
```

합성 순서는 `project rule → knowledge pack → language profile → common policy`입니다. 프로젝트 invariant가 가장 먼저
평가되며 pack rule의 `profile`은 `profiles` input에 포함되어야 합니다. pack에는 name/version과 출처 URL, immutable
revision 또는 content hash, license 판단과 검토일을 반드시 기록합니다.

## 외부 지식 intake

1. **발견:** tool, paper, security guide, framework skill을 catalog에 기록합니다.
2. **법적 확인:** LICENSE, attribution, redistribution과 modification 조건을 확인합니다. README 문구만으로 복사하지
   않습니다.
3. **고정:** tag보다 full commit SHA 또는 content hash를 우선합니다.
4. **분류:** deterministic rule은 lint/test로, 맥락 의존 판단만 pack rule로 옮깁니다.
5. **번역:** 원문을 통째로 붙이지 않고 우리 finding contract에 맞는 작고 검증 가능한 rule로 만듭니다. 원문 표현을
   재사용했다면 notice를 보존합니다.
6. **eval:** known-defect와 clean fixture에서 true/false positive를 기록합니다.
7. **승격:** evaluation → optional → default 순서로 올리고 version/release를 남깁니다.
8. **회수:** source 변경, license 불명확, 비용·오탐 악화 시 pack을 disable하되 과거 provenance는 보존합니다.

## 다음 확장점

review pack은 지식의 portable subset일 뿐입니다. sandbox tool, code suggestion, reaction workflow는 JSON rule로
축소하면 장점이 사라지므로 실행기 adapter로 별도 유지합니다. 실제 두 번째 runtime을 운영할 때 다음 공통 finding
schema를 추가합니다.

- `tool`, `rule_id`, `category`, `severity`, `confidence`
- `path`, `line`, `trigger`, `impact`, `evidence`
- `suggested_verification`, `source_pack`, `source_revision`
- `disposition`: fixed, rejected-with-evidence, deferred-to-issue

두 실행기에서 fixture 결과를 모을 수 있을 때만 deduplication과 routing adapter를 구현합니다. 지금 결과 schema부터
만들면 실제 출력 차이를 추측하게 되므로 catalog와 pack contract까지만 안정화합니다.

## Sources

- [Vercel OpenReview](https://github.com/vercel-labs/openreview)
- [Alibaba OpenCodeReview](https://github.com/alibaba/open-code-review)
- [GitHub secure use of `pull_request_target`](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)
