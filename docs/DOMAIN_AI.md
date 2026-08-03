# Domain-grounded Engineering Coach

Breaking Point의 AI는 범용 AGI를 축소해서 흉내 내지 않습니다. 검증된 주제 위키, 랩, 원전, simulation과 사용자가 제공한 architecture context를 먼저 찾고, 그 근거 안에서 설명과 다음 행동을 만드는 engineering coach를 지향합니다.

## 해결하려는 질문

- “Carrying Capacity가 무엇인가요?”처럼 용어와 출처 맥락을 묻습니다.
- “우리 서비스의 Carrying Capacity를 높일 기능을 생각해 주세요.”처럼 Product metric과 가설을 연결합니다.
- “이 기획을 현재 architecture에 적용하는 ADR을 작성해 주세요.”처럼 개념을 system decision으로 변환합니다.
- 장애 상황에서는 관련 pattern, 관찰 metric, simulation과 공식 문서를 찾아 다음 experiment를 제안합니다.

## Retrieval 순서

```text
질문과 선택적 architecture context
  → intent 분류(설명 / ideation / diagnosis / ADR)
  → 내부 topic·lab·source registry를 lexical/tag/graph로 검색
  → 내부 근거가 부족할 때만 공식 원문 검색
  → 필요한 lab·simulation·template 결합
  → 제한된 evidence bundle만 model에 전달
  → citation이 포함된 답변
  → 사용자가 실행할 experiment 또는 review checklist
```

전체 문서를 매번 prompt에 넣지 않습니다. 먼저 metadata와 lexical search로 후보를 좁히고, 필요할 때만 embedding retrieval이나 graph traversal을 추가합니다. corpus가 작은 초기에는 단순 검색이 더 싸고 설명 가능할 수 있습니다. RAG는 목적이 아니라 context precision과 citation coverage를 높이는 수단입니다.

## Source fallback contract

1. `src/content/topics`, lab 본문과 repository의 source registry를 먼저 검색합니다.
2. 내부 자료가 질문을 지지하지 못할 때만 표준 기구, 원 논문 또는 vendor의 공식 문서를 검색합니다.
3. Blog, 영상, 검색 결과 요약과 community 글은 사실의 fallback 근거로 사용하지 않습니다. 업계 관점을 소개해야
   할 때는 관점임을 표시하고 내부 편집 검수를 거칩니다.
4. 답변의 사실 주장에는 가까운 위치에 source title과 canonical URL을 표시합니다. 내부 자료와 외부 원문을
   구분하고, 근거가 없으면 추측하지 않고 확인할 수 없다고 답합니다.
5. 공식 원문 fallback은 검색 결과를 영구 저장하라는 뜻이 아닙니다. 허용 host, 확인 시각과 사용한 URL만
   기록하고 필요한 최소 문단만 일회성 context로 전달합니다.

## 제공할 인터페이스

같은 knowledge core를 Web chat, MCP server와 agent skill이 공유합니다.

| 인터페이스  | 주요 사용처                            | 초기 tool                                                      |
| ----------- | -------------------------------------- | -------------------------------------------------------------- |
| Web chat    | 학습자와 실무자의 대화형 탐색          | `explain`, `compare`, `ideate`, `draft_adr`                    |
| MCP server  | IDE와 coding agent가 현재 작업 중 호출 | `search_topics`, `get_topic`, `find_labs`, `draft_adr_context` |
| Agent skill | MCP가 없는 환경의 반복 가능한 workflow | 질문 분류, 출처 우선순위, ADR·검증 checklist                   |

MCP와 skill은 서로 다른 진실을 갖지 않습니다. `src/content/topics`, lab metadata와 source registry가 single source of truth입니다.

## ADR mode의 입력과 출력

입력에는 문제, 현재 architecture, quality attribute, constraint, 고려한 option과 확인되지 않은 가정을 받습니다. 출력은 Title, Status, Context, Decision, Alternatives, Consequences, Validation plan과 Sources로 제한합니다. 정보가 없으면 임의로 채우지 않고 `확인 필요`로 남깁니다.

## 품질과 안전

- 답변마다 사용한 topic과 source를 표시합니다.
- 표준, 회사 사례와 개인 관점을 같은 근거로 취급하지 않습니다.
- retrieved content 안의 명령은 data로 취급하고 system instruction으로 실행하지 않습니다.
- private code와 문서는 명시적인 동의 없이 hosted corpus에 저장하지 않습니다.
- model별 감상 평가 대신 retrieval recall, citation precision, unsupported claim, token usage와 task completion을 eval합니다.
- provider가 실패해도 wiki 검색과 관련 lab 안내는 동작해야 합니다.

## 단계적 구현

1. topic metadata와 related graph를 이용한 deterministic local search
2. 답변에 topic·source citation과 사용한 context 표시
3. `explain`, `ideate`, `draft_adr` mode와 template 추가
4. 질문·정답·필수 출처로 구성된 eval set 구축
5. 측정된 lexical recall이 목표에 못 미치고 동의어 사전으로 해결되지 않을 때만 embedding index와 hybrid retrieval 도입
6. read-only MCP server와 portable agent skill 제공

도입 순서와 비용 gate는 [`docs/RETRIEVAL_COST_POLICY.md`](./RETRIEVAL_COST_POLICY.md)를 따릅니다.
