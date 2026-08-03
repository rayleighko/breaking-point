# Retrieval cost policy

Breaking Point의 검색과 AI retrieval은 기능을 만족하는 가장 싼 구조부터 시작합니다. `vectorless`는 특정
제품명이 아니라 embedding과 vector database 없이 lexical index, metadata, synonym과 knowledge graph로
후보를 찾는 방식을 뜻합니다.

## 현재 결정: zero-storage-cost first

```text
Git의 검수된 content
  → build-time Pagefind + metadata/tag/related graph
  → 질문별 3~5개 chunk
  → 부족하면 공식 원문만 일회성 fallback
  → source가 표시된 답변
```

- Git과 Astro content collection이 single source of truth입니다.
- 사용자 검색은 CDN에 배포된 Pagefind index로 처리합니다.
- AI retrieval도 먼저 같은 metadata, lexical index, synonym과 graph edge를 사용합니다.
- 질문, 대화 원문과 검색어를 server database에 보관하지 않습니다.
- 공식 문서 fallback 결과는 기본적으로 영구 색인하지 않습니다. 재사용 가치가 확인되면 출처 검수 후 내부
  content로 편입합니다.

이 구조는 별도 storage와 embedding 생성 비용이 없고 provider 장애 시에도 Wiki와 Lab 탐색이 동작합니다.

## 단계별 도입 gate

| 단계 | 구현                                  | 도입 조건                                                                             | 비용 상한과 실패 동작                                        |
| ---- | ------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 0    | Pagefind + tag + graph + synonym      | 현재 기본값                                                                           | 정적 hosting 외 추가 검색 비용 0원                           |
| 1    | build-time local embedding 실험       | 고정 eval의 Recall@5가 90% 미만이고 synonym으로 회복되지 않음                         | CI에서만 생성, production DB 없음                            |
| 2    | Cloudflare Vectorize hybrid retrieval | corpus 또는 index payload가 browser budget을 넘고 단계 1이 유의미하게 recall을 개선함 | Free allowance 안에서만 시작, quota 초과 시 Stage 0 fallback |
| 3    | D1 metadata/progress                  | 계정 간 동기화 수요와 유지율 개선이 측정됨                                            | indexed query만 사용, Free limit 경고 후 local-only fallback |

`Vectorize가 무료 범위에 있다`는 사실만으로 도입하지 않습니다. embedding inference, 운영 복잡도와 검색 품질
회귀도 비용입니다. 반대로 문서 수가 많아져 정적 index 전송과 browser memory가 더 비싸지면 managed vector
index가 총비용을 낮출 수 있으므로 동일한 eval과 실제 payload로 비교합니다.

## 도입 전 필수 측정

1. 실제 질문을 익명화해 만든 최소 50개 eval query와 필수 source를 version control에 둡니다.
2. `Recall@5 ≥ 90%`, citation coverage `100%`, unsupported factual claim `< 2%`를 목표로 합니다.
3. query당 전달 chunk 수, input token, p50/p95 latency와 월 예상 요청 수를 기록합니다.
4. 현재 vectorless baseline보다 품질이 유의미하게 좋아지는지 확인합니다.
5. 월 비용 상한, quota 80% 경고, 초과 시 vectorless fallback과 index 제거 절차를 먼저 정의합니다.

## 2026-08-03 기준 Cloudflare 참고값

현재 공식 문서상 Workers Free는 하루 100,000 request, D1 Free는 하루 5백만 row read·10만 row write와 총
5GB storage를 포함합니다. Vectorize Free는 계정당 5백만 stored vector dimensions와 월 3천만 queried vector
dimensions를 제공합니다. 이 수치는 변경될 수 있으므로 구현 직전에 반드시 다시 확인합니다.

- Cloudflare Workers pricing: <https://developers.cloudflare.com/workers/platform/pricing/>
- Cloudflare D1 pricing: <https://developers.cloudflare.com/d1/platform/pricing/>
- Cloudflare Vectorize changelog: <https://developers.cloudflare.com/vectorize/platform/changelog/>
- Cloudflare Vectorize limits: <https://developers.cloudflare.com/vectorize/platform/limits/>
