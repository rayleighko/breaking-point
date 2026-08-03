# Search architecture

## 목표

검색은 실험실, Wiki, 로드맵, 자료와 일반 안내 페이지를 하나의 진입점에서 찾게 합니다. 콘텐츠 파일은
계속 Git에서 review 가능한 정적 파일로 관리하고, 검색을 위해 별도 database를 source of truth로 만들지
않습니다.

## 현재 구조

```text
Astro content + pages
        │
        ├─ dev server ──> search-catalog.json ──> catalog fallback
        │
        └─ production build ──> HTML ──> Pagefind chunked index
                                             │
SearchPage ──> SearchProvider contract ───────┘
```

- `main[data-pagefind-body]`만 색인하여 navigation, footer와 Pet Coach 문구를 제외합니다.
- production에서는 Pagefind가 실제 렌더링된 모든 본문과 heading을 색인합니다.
- 개발 서버에는 build 후 index가 없으므로 `search-catalog.json`이 실험실·topic·roadmap·resource metadata를
  검색합니다.
- 검색어는 `/search?q=...`에 남아 링크로 공유할 수 있습니다.
- UI는 최대 50개 결과만 hydrate합니다. Pagefind는 필요한 index chunk와 선택된 result data만 가져옵니다.

## 규모별 진화

### 정적 index 유지

문서가 수만 건이고 콘텐츠가 deploy 단위로 갱신되는 동안에는 Pagefind를 유지합니다. 별도 server 비용이
없고 읽기 traffic은 CDN이 처리합니다. build 시간, index 총크기, 실제 query payload와 검색 품질을 계속
측정합니다.

### Remote provider로 전환

다음 조건이 실제로 나타날 때 SearchProvider 뒤에 remote adapter를 추가합니다.

- deploy 없이 수분 안에 반영해야 하는 콘텐츠가 많아집니다.
- typo tolerance, synonym 사전, 개인화 ranking 또는 query analytics가 핵심 요구가 됩니다.
- CI의 index build 시간이 release 병목이 됩니다.
- 측정된 query payload나 browser memory가 budget을 반복해서 넘습니다.

이 경우에도 canonical document는 정적 content collection입니다. CI가 `SearchDocument` 형태로 external
index에 upsert하고, UI는 같은 `SearchResponse`를 받습니다. provider 장애 시 정적 Pagefind index를
read-only fallback으로 유지할 수 있습니다.

## Content contract

검색 가능한 문서는 안정적인 `id`, 사용자에게 보이는 `title`, canonical `url`, 종류, excerpt와 tag를
가집니다. 새 content type을 추가할 때 다음을 확인합니다.

1. 사용자에게 보이는 본문이 `data-pagefind-body` 안에 렌더링됩니다.
2. 개발 fallback catalog에 title, URL과 핵심 keyword가 포함됩니다.
3. URL은 redirect 없이 유지할 canonical path입니다.
4. 비공개 정보, API key, 사용자 입력과 draft는 index에 넣지 않습니다.

## 운영 지표

- 검색 성공률: 결과가 하나 이상인 query 비율
- zero-result 상위 query와 synonym 후보
- 검색 결과 click-through와 첫 click까지 걸린 시간
- index build duration, index size, query별 network payload

현재는 analytics를 수집하지 않습니다. 도입할 때 검색어가 민감한 문제나 내부 system 이름을 포함할 수
있다는 점을 고려해 보관 기간, 익명화와 opt-out을 먼저 결정합니다.

AI retrieval의 vectorless baseline, managed index 도입 조건과 비용 상한은
[`docs/RETRIEVAL_COST_POLICY.md`](./RETRIEVAL_COST_POLICY.md)를 따릅니다.
