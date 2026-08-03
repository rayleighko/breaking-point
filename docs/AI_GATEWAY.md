# AI Gateway 배포

GitHub Pages에는 secret을 저장할 server runtime이 없습니다. `PUBLIC_` 환경 변수나 build-time secret에 API key를 넣으면 browser bundle에 노출됩니다. 정적 site는 그대로 두고 Cloudflare Worker가 OpenRouter API key를 보관합니다.

## 사용자가 준비할 것

1. OpenRouter 계정을 만들고 completion용 API key를 하나 발급합니다. 가능한 낮은 spending limit과 별도 이름을 설정합니다.
2. Cloudflare 계정을 만들고 Workers를 활성화합니다.
3. `workers/ai-proxy`에서 Wrangler로 로그인한 뒤 Worker를 배포합니다.
4. `OPENROUTER_API_KEY`를 Worker Secret으로 등록합니다. repository, `.env`, GitHub Pages secret에는 넣지 않습니다.
5. 배포된 `/chat` URL을 repository variable `PUBLIC_AI_API_URL`로 등록하고 Astro build에 전달합니다.

Cloudflare는 이 site 자체를 hosting하지 않습니다. 정적 site는 계속 GitHub Pages가 담당하고 Worker는
browser와 OpenRouter 사이의 작은 API proxy로만 동작합니다.

## 배포 명령

```bash
cd workers/ai-proxy
pnpm dlx wrangler login
pnpm dlx wrangler secret put OPENROUTER_API_KEY
pnpm dlx wrangler deploy
```

최초 배포는 CLI가 가장 단순합니다. `wrangler login`에서 browser 승인이 필요하고,
`wrangler secret put`에서는 발급받은 OpenRouter key를 직접 입력해야 합니다. 이 두 값은 repository에
commit하지 않습니다.

이후 자동 배포가 필요하면 Cloudflare Dashboard의 **Workers & Pages → Create application → Import a
repository**에서 `rayleighko/breaking-point`를 연결합니다. 이 repository는 monorepo 형태이므로 다음처럼
설정합니다.

| 항목                | 값                    |
| ------------------- | --------------------- |
| Project/Worker name | `breaking-point-ai`   |
| Production branch   | `main`                |
| Root directory      | `/workers/ai-proxy`   |
| Build command       | 비워 둠               |
| Deploy command      | `npx wrangler deploy` |

화면에서 root directory를 지정할 수 없다면 repository root를 기준으로 build command는 비워 두고 deploy
command를 `npx wrangler deploy --config workers/ai-proxy/wrangler.jsonc`로 설정합니다. 전체 Astro site용
`pnpm run build`는 Worker build command가 아닙니다.

Worker 생성 후 **Settings → Variables and Secrets**에서 `OPENROUTER_API_KEY`를 Secret으로 등록합니다.
일반 variable이 아닙니다. 배포 URL이 예를 들어
`https://breaking-point-ai.<account-subdomain>.workers.dev`라면 GitHub repository의 **Settings → Secrets
and variables → Actions → Variables**에 아래 값을 추가합니다.

```text
PUBLIC_AI_API_URL=https://breaking-point-ai.<account-subdomain>.workers.dev/chat
```

그 뒤 GitHub Pages workflow를 다시 실행하거나 `main`에 새 commit을 push해야 정적 bundle이 이 공개
endpoint를 사용합니다.

공개 전 `ALLOWED_ORIGIN`, 무료 model allowlist, 요청 크기 제한과 rate limiting 설정을 확인합니다. Rate Limiting binding은 비용 정산 장부가 아니라 짧은 시간의 abuse 완화 장치입니다. OpenRouter key 자체에도 spending limit을 둡니다.

## Sprite 후속 작업

고양이 UI는 asset을 교체할 수 있는 상태 영역을 먼저 제공합니다. 최종 sprite sheet는 idle, curious, thinking, success, warning의 다섯 상태로 만들고 reduced motion에서는 첫 frame만 표시합니다. 생성 asset의 license와 원본 prompt를 repository에 함께 기록합니다.
