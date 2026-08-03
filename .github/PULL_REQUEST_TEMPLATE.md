## Outcome

<!-- 사용자가 얻게 될 결과를 한두 문장으로 적어 주세요. -->

## Context

- Related Issue/Proposal:
- Change type: <!-- content / engine / challenge / frontend / infrastructure / documentation -->
- Read first: <!-- 실제로 확인한 contract 문서 -->
- Merge plan: Rebase and merge into `develop` (release → `main`도 rebase)

## What changed

<!-- 핵심 변경과 영향받은 public contract를 적어 주세요. -->

## Decision and trade-offs

<!-- 선택한 방법, 선택하지 않은 대안과 이유를 적어 주세요. 새 managed service에는 무료 대안, 비용 상한과 fallback을 포함해 주세요. -->

## Sources

<!-- 내부 Topic/Lab을 먼저, 부족하면 표준·원 논문·공식 문서를 적어 주세요. 사용자에게 보이는 사실 주장은 가까운 위치에 출처가 있어야 합니다. -->

## Verification

<!-- 실행한 명령과 결과를 적어 주세요. 실행하지 못한 검사는 이유를 적어 주세요. -->

- [ ] `pnpm quality`
- [ ] UI 변경: 핵심 flow, 오류 상태, desktop, 375px, overflow와 console 확인
- [ ] Engine 변경: invariant, fixed-seed 재현성과 `pnpm test` 확인
- [ ] Challenge 변경: 순진한 해법 실패와 의도한 해법 통과를 script로 확인
- [ ] Content 변경: `CONTENT_GUIDE.md` checklist와 내부 자료→공식 원문 source 순서 확인
- [ ] Performance 주장: 환경, duration, warm-up, raw result와 model/measurement 구분 기록

해당하지 않는 항목은 체크하지 말고 아래에 이유를 적어 주세요.

## Browser or visual evidence

<!-- UI 변경일 때 viewport와 관찰 결과를 적고 필요한 screenshot을 첨부해 주세요. -->

## Scope

- Out of scope:
- Known limitations or follow-up:

## Contributor ownership

- [ ] 변경 내용과 trade-off를 직접 설명할 수 있습니다.
- [ ] AI가 생성한 내용이 있다면 diff, 출처와 test를 직접 검토했습니다.
- [ ] Secret, 개인정보, 실제 요청 본문과 불필요한 telemetry를 포함하지 않았습니다.
