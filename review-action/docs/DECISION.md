# PR AI review 도구 선택

2026-08-14 기준으로 개인과 팀이 같은 policy를 소유하면서 GitHub PR에 자동 comment를 남기는 방법을
비교했습니다.

| 선택지                 | 장점                                                           | 제약                                                               | 적합한 경우                         |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------- |
| GitHub Copilot review  | GitHub ruleset와 자연스럽게 통합, custom instruction           | Copilot/AI Credit 정책과 GitHub에 종속                             | 이미 Copilot 조직 표준이 있는 팀    |
| CodeRabbit             | 빠른 설치, PR UX, analytics와 enterprise self-hosting          | 본격 PR review는 유료 seat, self-hosting은 enterprise              | 운영 부담보다 SaaS 편의가 중요한 팀 |
| Qodo                   | PR·IDE·규칙·analytics, enterprise BYOK/on-prem                 | 무료 상시 tier가 없고 credit/plan에 종속                           | governance dashboard가 필요한 조직  |
| 오픈소스 PR-Agent      | 여러 Git provider, CLI/Action/self-host, 다양한 command        | 설정 면적이 크고 repository가 community-maintained legacy로 안내됨 | GitHub 외 provider까지 필요한 팀    |
| Alibaba OpenCodeReview | BYOK, custom rule, deterministic diff pipeline, inline comment | LLM endpoint·비용·rule 품질을 사용자가 운영                        | 개인과 팀 policy를 코드로 소유할 때 |

이 Action은 OpenCodeReview를 실행 코어로 선택합니다. 다른 선택지보다 항상 정확하다는 의미가 아니라 다음 요구사항에
가장 직접 맞기 때문입니다.

1. 개인과 팀 모두 seat 구매 없이 같은 workflow를 실행할 수 있습니다.
2. OpenAI-compatible 또는 Anthropic endpoint를 선택하고 별도 review token과 비용 상한을 둘 수 있습니다.
3. TypeScript, Go, Python과 프로젝트 rule을 Git에서 review할 수 있습니다.
4. 기존 CI와 독립시키거나 same-repository PR에서 `needs`로 순차 실행할 수 있습니다.
5. AI finding을 required truth가 아닌 사람이 검증할 advisory artifact로 남길 수 있습니다.

OpenCodeReview `v1.7.16` preview에서 Markdown·MDX는 `unsupported_ext`로 제외되는 것을 확인했습니다. 따라서 이
Action의 언어와 configuration review 범위에 포함하지 않고, 문서 품질은 deterministic checker와 human review로
남깁니다.

## 채택하지 않은 설계

- **새 LLM review engine 구현:** diff positioning, batching, reflection과 incremental comment를 다시 구현해야 하므로
  OpenCodeReview를 wrapping합니다.
- **MCP를 PR trigger로 사용:** MCP는 local agent의 대화형 review에는 적합하지만 GitHub event, permissions,
  concurrency와 branch protection의 실행 단위는 GitHub Actions가 더 명확합니다.
- **AI review를 기본 required check로 지정:** API 장애, quota와 false positive가 deterministic CI를 가릴 수 있어
  기본은 advisory입니다. 팀이 별도 eval로 false-positive rate와 운영 가용성을 측정한 뒤 required로 바꿀 수 있습니다.
- **PR code에서 언어 toolchain 실행:** AI credential이 있는 trusted job에서는 diff를 데이터로만 읽습니다. lint와
  test는 별도 untrusted CI job이 담당합니다.

## Sources

- [OpenCodeReview repository](https://github.com/alibaba/open-code-review)
- [OpenCodeReview GitHub Action](https://github.com/alibaba/open-code-review/blob/main/action.yml)
- [GitHub Copilot code review](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review)
- [CodeRabbit plans](https://docs.coderabbit.ai/management/plans)
- [Qodo plans](https://www.qodo.ai/pricing/)
- [PR-Agent repository](https://github.com/qodo-ai/pr-agent)
- [GitHub pull_request_target security](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)
- [GitHub reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)
- [Publishing Marketplace Actions](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace)
