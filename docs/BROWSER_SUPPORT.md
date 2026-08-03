# Browser support and performance checks

## 지원 범위

Breaking Point는 다음 브라우저의 최신 2개 주 버전을 지원 대상으로 삼습니다.

- Chrome, Microsoft Edge, Opera 같은 Chromium 계열
- Firefox
- macOS와 iOS의 Safari
- Android Chrome

Playwright CI에서는 Chromium, Firefox, WebKit, Pixel 7, iPhone 13 환경으로 핵심 경로와 interaction을
검사합니다. Chromium 통과는 Edge와 Opera의 공통 rendering engine에 대한 강한 신호이지만, 각 제품의
확장 기능과 정책 차이까지 완전히 대신하지는 않습니다. 주요 배포 전에는 stable Edge와 Opera에서 수동
smoke test를 추가할 수 있습니다.

## Internet Explorer

Internet Explorer 11은 지원하지 않습니다. Microsoft의 desktop application 지원이 종료됐고, Astro 5,
React 19와 이 프로젝트의 ES module 기반 client bundle도 IE를 대상으로 하지 않습니다. 사내 legacy
환경에서는 Microsoft Edge의 IE mode로 이 사이트를 실행하는 대신, 최신 Edge로 접속하도록 안내합니다.

## 자동 검사

```bash
pnpm build
pnpm test:browser:install # 처음 한 번, browser binary 설치
pnpm test:browser
```

검사 범위는 다음과 같습니다.

- 핵심 route의 HTTP 응답, hydration error와 console error
- Connection Pool 시뮬레이터의 시작·일시정지와 preset interaction
- 375 × 812 화면의 document-level 가로 overflow
- 모바일 navigation과 Pet Coach dialog
- Chromium 첫 화면의 DCL, JavaScript/CSS 전송량과 resource 개수 budget

성능 결과는 production benchmark가 아니라 regression guard입니다. CI runner, network, cache 상태에 따라
시간 값이 달라질 수 있으므로 절대적인 사용자 체감 속도로 인용하지 않습니다. 실제 release 판단에는 공개
URL의 field data와 Safari/Firefox/Edge 실기기 smoke test를 함께 사용합니다.
