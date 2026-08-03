# AI Pet Coach architecture

AI Pet Coach는 별도 채팅 페이지가 아니라 모든 학습 페이지 위에 놓이는 optional companion입니다. 일반
chatbot보다 캐릭터의 상태가 먼저 보이지만, animation은 decoration이 아니라 system status를 전달해야
합니다.

## Runtime boundary

```text
Base.astro
  → PetCoach React island (기본: 접힘, client-only)
      → 사용자가 열 때 CoachChat mount
          → model catalog / AI gateway 요청
```

- 접힌 상태에서는 provider network 요청을 보내지 않습니다.
- `enabled`, panel 위치는 localStorage에 저장합니다.
- 대화는 같은 tab의 sessionStorage에 최대 20개만 저장합니다.
- API key는 저장하지 않고 React memory에만 둡니다.
- Mobile에서는 drag를 끄고 viewport 안에 고정합니다.

## Visual state contract

| 상태      | 의미                   | 필수 표현                                       |
| --------- | ---------------------- | ----------------------------------------------- |
| `idle`    | 사용자의 행동을 기다림 | 정지 pose + “쉬는 중”                           |
| `typing`  | 사용자가 질문 작성 중  | 귀 기울이는 pose + “듣는 중”                    |
| `working` | provider 응답 대기     | working pose + 움직이는 stripe + “답변 작성 중” |
| `done`    | 새 답변 도착           | 완료 pose + “답변 도착”                         |
| `error`   | 사용자의 조치 필요     | 오류 pose + 복구 문장                           |

3D asset은 이 상태 이름을 파일 contract로 사용합니다. 예를 들어
`public/pet/working@1x.webp`, `working@2x.webp` 또는 상태별 sprite sheet를 둡니다. Asset이 없어도 emoji
placeholder, 상태 문장과 stripe만으로 기능이 완성되어야 합니다.

## Product constraints

- 기본은 접힌 상태이며 콘텐츠와 simulation을 가리지 않습니다.
- 사용자는 `/ai`에서 완전히 끄거나 위치를 초기화할 수 있습니다.
- 외부 desktop pet과의 충돌은 감지할 수 없으므로 자동 회피를 주장하지 않습니다.
- Desktop drag는 viewport 밖으로 나가지 않게 clamp합니다.
- `prefers-reduced-motion`이면 pose와 stripe animation을 중단합니다.
- 답변은 계속 Beta로 표시하고 simulation과 공식 문서를 대체하지 않습니다.
