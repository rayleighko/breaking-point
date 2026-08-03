# 지식 그래프 관리 원칙

Breaking Point의 위키는 폴더 목차보다 **작은 주제와 설명이 있는 연결**을 중심으로 관리합니다.
Obsidian의 internal link와 backlink, Zettelkasten의 atomic note 원칙을 정적 사이트에 맞게 적용한
형태입니다.

## Single source of truth

- 주제 하나는 `src/content/topics/<slug>.json` 한 파일입니다.
- `related`와 `relations`가 outgoing link의 원본입니다.
- backlink와 전체 graph는 build time에 계산한 projection입니다. 직접 편집하지 않습니다.
- 검색 keyword와 source는 다릅니다. 외부 검색 결과는 탐색의 시작점일 뿐, 검증된 근거는
  `sources`에 기록합니다.

현재 JSON을 쓰는 이유는 schema 검증과 비개발자의 작은 contribution을 단순하게 유지하기 위해서입니다.
Obsidian 전용 syntax에 의존하지 않지만, 한 파일에 한 주제를 두고 link와 backlink를 중심으로 탐색하는
운영 방식은 같습니다. 본문이 길어져 문단 간 link가 필요해지는 시점에는 Markdown frontmatter로
migration합니다.

## 연결을 추가하는 기준

| 관계        | 사용할 때                                                   | 예시                             |
| ----------- | ----------------------------------------------------------- | -------------------------------- |
| `선행 개념` | 대상 개념을 알아야 현재 주제를 계산하거나 설명할 수 있을 때 | Little's Law → Capacity Planning |
| `함께 보기` | 같은 문제를 다른 각도에서 보완할 때                         | Timeout ↔ Retry                  |
| `비교하기`  | 선택지의 trade-off를 대조할 때                              | Serverless ↔ Container           |
| `구분하기`  | 이름이 비슷하지만 역할이 다를 때                            | Queue ↔ Message Queue            |
| `적용 사례` | 추상 개념이 실제 system이나 practice에 쓰일 때              | Queue → Load Shedding            |

모든 typed relation에는 “왜 연결되는가”를 한 문장으로 씁니다. 연결 수를 늘리는 것보다 학습자가 다음
페이지를 열 이유를 이해하는 것이 우선입니다.

## 화면과 도구 선택

- 전체 graph: 현재 규모에서는 dependency 없는 SVG를 사용합니다. category filter와 한 topic의 이웃
  보기를 먼저 제공합니다.
- 문서 한 편의 계층: Markdown heading을 mind map으로 보여줄 필요가 생기면 Markmap을 검토합니다.
- graph가 커져 layout 계산, clustering, graph analysis가 필요해지면 Cytoscape.js로 교체합니다.

node가 100개를 넘기기 전에는 화려한 force layout보다 filter, 관계 설명과 keyboard navigation을
우선합니다. graph는 학습 경로를 찾는 도구이지 모든 node를 한 화면에 과시하는 그림이 아닙니다.

## Contribution checklist

- [ ] 기존 topic과 중복되는지 검색했나요?
- [ ] 설명 하나만으로 독립적으로 이해할 수 있나요?
- [ ] typed relation마다 연결 이유가 있나요?
- [ ] relation target이 실제 topic slug인가요?
- [ ] 외부 주장을 `sources`의 원전 또는 공식 문서로 확인했나요?
- [ ] `pnpm test`와 `pnpm build`가 통과하나요?
