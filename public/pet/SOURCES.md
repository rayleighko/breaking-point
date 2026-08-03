# Breaking Point Cat assets

사용자가 2026-08-03에 ChatGPT image generation으로 제작해 프로젝트에 제공한 asset입니다.

| 파일            | 상태          | 원본 역할                    |
| --------------- | ------------- | ---------------------------- |
| `launcher.webp` | 접힌 launcher | 정면의 중립 pose             |
| `idle.webp`     | 쉬는 중       | 앉아서 기다리는 pose         |
| `typing.webp`   | 듣는 중       | 고개를 기울인 pose           |
| `working.webp`  | 답변 작성 중  | laptop을 사용하는 pose       |
| `done.webp`     | 답변 도착     | 눈을 감고 웃는 pose          |
| `error.webp`    | 확인 필요     | 앞발을 들고 땀을 흘리는 pose |

- 원본: 1024×1024 transparent PNG
- 배포본: `cwebp -q 88 -m 6 -alpha_q 100`으로 변환
- 공통 생성 조건과 상태 contract: [`docs/PET_COACH.md`](../../docs/PET_COACH.md)
- 외부 상표나 제3자 logo를 포함하지 않습니다. terminal glyph는 일반적인 prompt symbol입니다.
