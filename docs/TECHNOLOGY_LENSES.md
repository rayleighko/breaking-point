# Technology lenses

각 랩은 하나의 장애 pattern을 특정 framework에 가두지 않습니다. `현실에서는` 섹션에서 다음 순서로
현업 구현을 연결합니다.

1. **Generic pattern** — 제한된 자원, queue, backpressure처럼 vendor와 무관한 model
2. **Application stack** — TypeScript, React/Next.js, NestJS, PostgreSQL에서 보이는 형태
3. **Container platform** — Docker process와 Kubernetes Pod/Deployment/HPA에서 책임지는 범위
4. **Serverless** — instance 관리가 사라졌을 때 concurrency와 downstream limit이 어디로 이동하는지
5. **AWS mapping** — 같은 pattern을 구현하는 managed service와 선택 기준
6. **Overload ownership** — 누가 queue 상한, timeout, retry, load shedding을 소유하는지

TypeScript는 maintainer가 가장 빠르게 검증할 수 있는 첫 reference implementation입니다. 핵심 model은
특정 언어에 결합하지 않습니다. 구현 비교가 교육적으로 의미 있을 때 Go, Kotlin, Java recipe를 붙여
runtime, concurrency model과 ecosystem의 차이를 드러냅니다.

모든 lens를 억지로 채우지 않습니다. 관련 없는 제품 이름은 태그를 늘리기 위해 추가하지 않습니다.
AWS는 정답이 아니라 하나의 구체적인 implementation입니다. 다른 cloud에서도 pattern이 어떻게
대응되는지 추론할 수 있게 쓰는 것이 목표입니다.
