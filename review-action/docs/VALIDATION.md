# Validation record

검증일: 2026-08-14, macOS arm64, Node.js 24, OpenCodeReview `v1.7.16` (`a0b49d5b`)

## 완료된 검증

```bash
pnpm --dir review-action test
pnpm quality
actionlint .github/workflows/ai-review.yml review-action/.github/workflows/*.yml \
  review-action/examples/*.yml
```

- policy 합성, profile 중복 제거, project policy 상속을 검증했습니다.
- TypeScript·Go·Python profile path와 대표 defect rule을 검증했습니다.
- 지원하지 않는 profile, workspace 밖 project rule과 symlink 탈출을 거부하는지 검증했습니다.
- checkout과 OpenCodeReview가 full commit SHA로 고정됐는지 검증했습니다.
- `review-action/`만 별도 임시 directory로 복사한 standalone 상태에서 `npm test`와 actionlint를 실행했습니다.

실제 OpenCodeReview matcher도 다음 명령에 해당하는 방식으로 확인했습니다.

```bash
ocr rules check --rule <generated-rule> src/example.ts
ocr rules check --rule <generated-rule> cmd/example.go
ocr rules check --rule <generated-rule> app/example.py
```

각 경로는 `typescript`, `go`, `python` custom rule과 정확히 매칭됐습니다. `ocr review --preview`는 현재 변경 27개를
찾아 18개를 review 대상으로 선택했고, Markdown·MDX 9개는 `unsupported_ext`로 제외했습니다. 이 제한은 README와
selection 문서에 반영했습니다.

## 아직 필요한 end-to-end 검증

실제 LLM과 GitHub comment write는 credential과 원격 PR이 필요하므로 실행하지 않았습니다. 공개 또는 팀 사용 전
작은 fixture PR에서 다음을 확인합니다.

- TypeScript·Go·Python defect fixture가 기대한 inline 위치와 severity로 보고됩니다.
- 새 push에서 sticky summary가 갱신되고 겹치는 incremental comment가 다시 생기지 않습니다.
- fork PR에서 base policy만 checkout되며 PR code가 credential이 있는 job에서 실행되지 않습니다.
- JSON/stderr artifact에 token, 전체 environment와 실제 request body가 없습니다.
- model, PR 크기, token 사용량과 비용을 기록하고 provider-side 월 상한을 설정합니다.
- AI review 장애가 advisory일 때 deterministic quality와 사람 review를 막지 않습니다.
