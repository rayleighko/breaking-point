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
- panel 위치는 localStorage에 저장합니다. 접힘 상태는 session마다 초기화합니다.
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
- 별도 AI page와 navigation item을 두지 않습니다. 모든 page 우측 하단 launcher와 panel 안의 control만
  사용합니다. 완전히 숨겨 복구 경로가 사라지는 상태는 두지 않고 접기만 지원합니다.
- 외부 desktop pet과의 충돌은 감지할 수 없으므로 자동 회피를 주장하지 않습니다.
- Desktop drag는 viewport 밖으로 나가지 않게 clamp합니다.
- `prefers-reduced-motion`이면 pose와 stripe animation을 중단합니다.
- 답변은 계속 Beta로 표시하고 simulation과 공식 문서를 대체하지 않습니다.

## Asset production contract

최종 asset은 배경이 투명한 동일 캐릭터·동일 camera angle로 제작합니다. 생성형 이미지 도구에는 아래
공통 조건을 고정하고 pose만 바꿉니다.

- 캐릭터: 작은 고양이형 software engineering companion, 친근하지만 유아용 mascot처럼 과장하지 않음
- 표현: 부드러운 3D clay render, 단순한 silhouette, 작은 크기에서도 읽히는 얼굴과 귀
- 색: Breaking Point의 blue accent를 목걸이 또는 작은 terminal badge에만 사용
- 배경·문자: transparent background, 그림자 최소화, 글자·logo·watermark 없음
- 구도: 정면에서 살짝 3/4, 전신, 모든 pose에서 같은 비율과 광원

필요한 파일은 다음과 같습니다.

| 파일                                | 용도                     | 권장 원본            |
| ----------------------------------- | ------------------------ | -------------------- |
| `launcher.webp`                     | 우측 하단 접힌 launcher  | 512×512, transparent |
| `idle.webp`                         | 쉬는 중                  | 512×512, transparent |
| `typing.webp`                       | 사용자의 질문을 듣는 중  | 512×512, transparent |
| `working.webp`                      | model 응답 대기          | 512×512, transparent |
| `done.webp`                         | 답변 도착                | 512×512, transparent |
| `error.webp`                        | timeout·오류             | 512×512, transparent |
| `favicon.svg` 또는 `favicon-32.png` | browser icon             | 32×32에서 식별 가능  |
| `og-pet.webp`                       | 공유 image의 보조 캐릭터 | 1200×630 canvas용    |

Animation을 넣을 때는 상태별 8~12 frame, 12fps 이하의 sprite sheet를 추가하고 frame 크기를 256×256으로
통일합니다. 정지 WebP를 먼저 승인한 다음 animation을 제작해야 캐릭터가 pose마다 달라지는 문제를 줄일 수
있습니다. 원본 prompt, seed, 사용 model과 license도 `public/pet/SOURCES.md`에 기록합니다.
