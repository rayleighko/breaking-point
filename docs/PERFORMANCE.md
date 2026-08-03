# Performance model

Breaking Point의 simulation은 브라우저에서 실행되는 교육용 model입니다. production system의
benchmark가 아니며, 표시되는 RPS는 실제 network·database·runtime 비용을 측정한 값이 아닙니다.

## 현재 guardrail

- seeded simulation으로 같은 입력을 재현합니다.
- queue는 전체를 계산하되 canvas에는 최대 120개 요청만 그립니다.
- chart와 metric은 frame마다 DOM을 늘리지 않고 canvas/ref 기반으로 갱신합니다.
- engine regression test는 고부하 60초 simulation이 로컬 Node에서 3초 안에 끝나는지 확인합니다.

## UI 변경 시 확인할 것

- desktop과 375px에서 horizontal overflow가 없는가
- simulation 실행 중 input이 즉시 반응하는가
- 긴 queue에서도 main thread가 지속적으로 멈추지 않는가
- `prefers-reduced-motion`에서 불필요한 animation이 억제되는가
- browser console error와 detached timer가 없는가

정밀한 성능 작업은 browser Performance profile과 frame time을 첨부한 별도 Issue로 진행합니다.
