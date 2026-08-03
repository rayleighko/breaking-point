# GitFlow

Breaking Point는 GitHub Pages의 `main` 배포를 보호하기 위해 축소형 GitFlow를 사용합니다.
목표는 “작은 feature 단위로 검증하고, 안정된 상태만 공개 URL에 올린다”입니다.

## Branches

| 브랜치 | 역할 | 배포 |
| ------ | ---- | ---- |
| `main` | 공개 가능한 안정 버전 | push 시 GitHub Pages 배포 |
| `develop` | 다음 공개를 모으는 통합 브랜치 | 배포하지 않음 |
| `feature/<slug>` | 로드맵 lab·기능 단위 작업 | PR로만 `develop`에 합침 |
| `release/<yyyy-mm-dd>` | 공개 전 최종 점검 | PR로 `main`과 `develop`에 합침 |
| `hotfix/<slug>` | 공개 사이트 긴급 수정 | `main`에서 분기 후 `main`·`develop`에 합침 |

## Feature 크기

한 feature 브랜치는 **한 가지 사용자 결과**만 담습니다.

- 예: `feature/queue-sense`, `feature/p50-p99`, `feature/cache-stampede`
- 커밋은 `영역: 변경 내용` 한국어 형식, 가능하면 계산 / UI / 콘텐츠를 나눕니다.
- engine·challenge 변경은 같은 브랜치 안에서 검증 스크립트와 함께 넣습니다.
- unrelated refactor, 문서 대청소, 의존성 업그레이드는 별도 브랜치로 분리합니다.

## 흐름

```text
main
  └── develop
        └── feature/<slug>  →  PR → develop
              └── (필요 시) release/<date> → PR → main
```

1. `develop`에서 `feature/<slug>`를 만듭니다.
2. 로컬에서 `pnpm quality`를 통과시킵니다. UI면 375px와 console도 확인합니다.
3. feature → `develop` PR을 엽니다. CI와 리뷰 후 squash 또는 merge commit으로 합칩니다.
4. 공개할 준비가 되면 `develop` → `main` release PR을 엽니다.
5. `main` merge 후 Actions 배포와 공개 URL을 확인합니다.

## 안정 운영 규칙

- `main`에 직접 feature 커밋을 올리지 않습니다. hotfix만 예외입니다.
- `pnpm quality`를 통과하지 않은 브랜치를 `develop`에 합치지 않습니다.
- browser model 수치, AI gateway secret, 외부 load test는 기존 `AGENTS.md` 안전을 따릅니다.
- 배포 직후 회귀가 있으면 `hotfix/`로 고치거나, 원인 파악 전까지 이전 안정 커밋으로 되돌립니다.
