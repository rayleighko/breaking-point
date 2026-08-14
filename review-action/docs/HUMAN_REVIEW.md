# Human review after AI

이 기준은 작성자의 직급과 무관합니다. AI는 반복 검수를 앞당기지만 주니어를 평가하거나 시니어를 면책하지 않으며,
최종 Approve를 남기지 않습니다.

AI comment를 위에서부터 처리하는 대신 다음 순서로 최종 검토합니다.

1. **Spec:** Issue outcome, acceptance와 out-of-scope가 현재 diff와 일치하는지 확인합니다.
2. **Behavior:** 실패해야 하는 test가 실제로 실패하고 intended case가 통과하는지 확인합니다.
3. **Boundary:** auth, data, concurrency, transaction, API compatibility와 rollback 경계를 먼저 읽습니다.
4. **AI finding:** Critical/High는 재현합니다. Medium은 spec과 비교하고 Low/style은 필요한 것만 선택합니다.
5. **Evidence:** CI log, browser 상태, benchmark provenance와 limitation이 현재 HEAD 기준인지 확인합니다.

finding은 다음 중 하나로 닫습니다.

- 수정하고 regression test를 연결합니다.
- 이미 보장되는 behavior라면 근거 코드와 test를 답합니다.
- false positive라면 재현되지 않는 입력과 contract를 답합니다.
- 현재 scope 밖이면 별도 Issue와 rollback risk를 연결합니다.

작성자는 시니어에게 질문하기 전에 재현 입력, 실제 결과, 확인한 contract/test와 시도한 선택지를 정리합니다. 다만
auth·개인정보·금전·data loss·irreversible migration 위험은 혼자 해결하려 하지 말고 즉시 domain owner에게
escalation합니다. 구체적인 운영 방식과 지표는 [`TEAM_ADOPTION.md`](./TEAM_ADOPTION.md)를 따릅니다.

“왜 이 구현인가”, “어떤 실패를 막는가”, “어디서 되돌릴 수 있는가”를 설명할 수 있을 때만 Approve합니다.
