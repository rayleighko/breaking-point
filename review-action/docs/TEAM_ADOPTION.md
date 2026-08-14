# 팀 도입과 성장 운영 모델

이 Action의 목적은 AI가 사람을 승인하는 구조를 만드는 것이 아닙니다. 반복 가능한 1차 검수를 저장소에 두어
주니어는 근거를 준비한 뒤 질문할 수 있고, 시니어는 제품 의도·아키텍처·운영 위험에 집중하게 하는 것입니다.
작성자의 직급과 관계없이 모든 PR에 같은 policy를 적용합니다.

## 책임 경계

| 주체          | 책임                                                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 작성자        | Issue acceptance를 연결하고 deterministic CI를 통과시키며 AI finding을 수정·반박·별도 Issue 전환 중 하나로 닫습니다.       |
| AI reviewer   | changed code에 연결되는 correctness·security·regression·test gap 후보와 최소 재현 근거를 제시합니다. Approve하지 않습니다. |
| 사람 reviewer | 실제 사용자 outcome, architecture, auth/data boundary, rollback, observability와 evidence를 최종 판단합니다.               |
| policy owner  | 공통 rule과 언어 profile을 versioning하고 false positive, 비용, provider 변경과 release를 관리합니다.                      |

시니어가 작성한 PR도 예외가 아닙니다. 동일한 CI와 AI review를 먼저 거치고 다른 사람이 최종 승인합니다. 작은 팀에서
독립 승인이 불가능하면 적어도 작성자 자신이 AI finding과 diff를 분리된 시간에 다시 검토하고 그 제한을 PR에
기록합니다.

## 주니어 self-service와 escalation

AI finding을 그대로 시니어에게 전달하지 않습니다. 작성자는 다음 순서로 먼저 좁힙니다.

1. finding이 가리키는 입력과 영향을 재현합니다.
2. 가장 가까운 contract, test와 Issue acceptance를 확인합니다.
3. 수정과 regression test를 만들거나, 재현되지 않으면 근거 코드와 test로 답합니다.
4. 아래 조건에 해당하면 시니어 또는 domain owner를 호출합니다.

즉시 escalation할 조건은 다음과 같습니다.

- 인증·권한, 개인정보, 금전, data loss 또는 irreversible migration 위험
- public API·schema·transaction·concurrency invariant 변경
- rollback 경로가 없거나 장애 반경을 판단할 수 없는 변경
- AI finding과 contract/test가 충돌하고 어느 쪽이 기준인지 불명확한 경우
- 같은 finding으로 두 번 수정했는데도 재현 결과가 안정되지 않는 경우

질문에는 `원하는 결과 / 재현 입력 / 실제 결과 / 확인한 contract와 test / 시도한 선택지 / 필요한 결정`을 함께
적습니다. 이렇게 하면 주니어는 질문을 미루지 않으면서도, 시니어는 이미 좁혀진 의사결정에 집중할 수 있습니다.

## 사람 리뷰 순서

AI comment 수가 아니라 위험 순서로 읽습니다.

1. Issue outcome, acceptance와 out-of-scope
2. 실패해야 하는 case와 rollback·오류 상태
3. auth, data, concurrency, transaction, external cost 경계
4. architecture와 운영 관측성
5. Critical/High AI finding의 재현 결과
6. Medium finding과 test gap
7. Low/style summary 중 실제 유지보수 위험이 있는 항목

자세한 finding 종료 방식은 [`HUMAN_REVIEW.md`](./HUMAN_REVIEW.md)를 따릅니다.

## 4주 도입 순서

### 1주차: baseline

- AI review를 advisory로 켜고 기존 required CI는 유지합니다.
- PR 10개 안팎에서 사람 리뷰 시간, 첫 유효 feedback까지 걸린 시간과 escaped defect를 기록합니다.
- model, 평균 PR 크기, token·비용과 provider data policy를 공개합니다.

### 2주차: rule calibration

- 반복되는 false positive는 prompt로 덮지 말고 contract 또는 deterministic lint/test 후보인지 먼저 판단합니다.
- 프로젝트 invariant만 project rule에 추가하고 일반 언어 규칙은 중앙 profile에 둡니다.
- 근거 없는 style comment와 changed code 밖 finding을 줄입니다.

### 3주차: escalation 훈련

- 주니어는 위 질문 형식으로 finding 하나를 직접 닫고, 시니어는 답 대신 판단 기준을 남깁니다.
- 시니어 PR에도 같은 review를 적용해 직급이 아닌 위험 기반 process인지 확인합니다.
- 주 1회 20분만 false positive와 놓친 defect를 회고합니다.

### 4주차: 확장 결정

- 다른 repository에는 immutable release 또는 full SHA를 pin해 적용합니다.
- false-positive rate와 운영 가용성이 충분해도 AI 결과 자체를 required gate로 만들기보다, `AI review 실행 또는 사람
직접 검토 기록` 같은 process requirement를 우선 검토합니다.
- TypeScript에서 먼저 안정화하고 Go·Python에는 language profile과 해당 repository contract만 추가합니다.

## 볼 지표와 보지 않을 지표

팀 개선을 위해 다음을 repository 또는 기간 단위로 봅니다.

- 첫 유효 feedback까지 걸린 시간
- 사람이 실제 review에 쓴 시간과 재검토 횟수
- 작성자가 시니어 호출 없이 근거와 test로 닫은 finding 비율
- AI false-positive rate와 사람이 추가로 발견한 defect 유형
- merge 뒤 escaped defect와 rollback 수
- PR당 token·비용, Action 성공률과 p95 실행 시간

AI comment 수, 개발자별 finding 수, 직급별 통과율은 개인 평가나 순위화에 사용하지 않습니다. 그러면 작은 PR을
피하거나 finding을 숨기는 역인센티브가 생기고, 도구가 학습 장치가 아니라 감시 장치가 됩니다.

## Policy를 개선하는 tech lead loop

1. 실제 Issue와 PR에서 반복되는 마찰을 관찰합니다.
2. 사람의 판단이 필요한 것과 기계적으로 검증할 것을 분리합니다.
3. 결정적인 규칙은 lint·typecheck·test로 옮기고, 맥락 의존 위험만 AI rule에 남깁니다.
4. 공통 변경은 Action release, 프로젝트 변경은 project rule과 ADR로 review합니다.
5. 변경 전후의 시간, false positive, escaped defect와 비용을 비교합니다.
6. 효과가 없는 rule은 제거하고 학습된 판단 기준을 문서와 onboarding에 반영합니다.

이 loop를 운영하는 경험은 특정 model이나 agent framework보다 오래갑니다. TypeScript 제품 개발에서 시작해
repository contract, CI, AI review, human approval과 feedback metric을 함께 설계하는 것이 여러 프로젝트를 맡는
tech lead 역량으로 이어집니다.

## 참고 자료

- [DORA 2025 State of AI-assisted Software Development](https://research.google/pubs/dora-2025-state-of-ai-assisted-software-development-report/)
- [DORA Version Control](https://dora.dev/capabilities/version-control/)
- [GitHub secure use of `pull_request_target`](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)
