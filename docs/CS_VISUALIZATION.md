# CS 시각화 원칙

CS 주제는 animation 자체가 아니라 판단 과정을 보이게 만듭니다. 사용자는 같은 입력을 다른 알고리즘과 system 구성에 넣고 비용과 결과가 달라지는 이유를 설명할 수 있어야 합니다.

## 모든 시각화가 함께 보여줄 것

1. **현재 상태** — 배열의 index, Graph의 frontier, CDN의 Edge cache처럼 지금 어디를 보고 있는지 표시합니다.
2. **다음 결정** — 비교, 방문, hit/miss, eviction처럼 다음 상태를 만드는 행동을 한 문장으로 설명합니다.
3. **누적 비용** — 비교 횟수, memory, network hop, Origin request와 latency를 숫자로 표시합니다.
4. **불변식** — 정렬된 앞부분, FIFO 순서, 이미 방문한 node처럼 깨지면 안 되는 조건을 표시합니다.
5. **현실의 연결** — 면접용 입력뿐 아니라 scheduler, dependency graph, cache key와 request routing에 적용합니다.

## 조작 방식

- 실행, 일시정지, 한 단계, 초기화와 속도 조절을 제공합니다.
- 작은 입력은 손으로 따라갈 수 있게 하고, 큰 입력에서는 비용 곡선으로 전환합니다.
- 정답 경로만 재생하지 않습니다. 잘못된 자료구조나 정책을 선택했을 때의 비용도 같은 입력으로 비교합니다.
- 색만으로 방문·실패·선택 상태를 구분하지 않습니다.
- animation을 끈 경우에도 표와 단계 설명으로 같은 정보를 제공합니다.

## CDN 랩의 최소 장면

- 최소 두 지역의 사용자, 각 지역 Edge와 하나의 Origin을 표시합니다.
- object별 cache key, age, TTL과 상태(`HIT`, `MISS`, `STALE`)를 보여줍니다.
- cache hit ratio뿐 아니라 Origin RPS, 사용자 latency와 stale response 비율을 함께 기록합니다.
- 짧은 TTL, 긴 TTL, 동시 만료, purge, `stale-while-revalidate`를 같은 traffic으로 비교합니다.
- challenge에서는 CDN을 켜는 것만으로 통과하지 못하게 합니다. cache key cardinality나 동시 만료가 Origin overload를 일으키도록 제약을 둡니다.
