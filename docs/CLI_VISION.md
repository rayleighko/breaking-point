# Local Lab CLI vision

`bp`는 사용자가 infrastructure를 직접 조립하지 않아도 Breaking Point의 local lab을 반복 실행하게 하는
도구입니다. 처음에는 문서의 명령을 복사해 실행하고, 반복되는 절차가 확인된 뒤에 CLI로 자동화합니다.

## 목표 경험

```bash
# 실행 전에 필요한 Docker, port와 예상 자원 사용량만 확인합니다.
bp lab doctor connection-pool

# 기본 Scenario를 내려받아 수정합니다.
bp scenario init queueing.v1 --output spike.json

# 실제 container와 부하를 실행하고 결과를 저장합니다.
bp lab run connection-pool --scenario spike.json --output run.bp-result

# 결과를 local Playground에서 시각화합니다.
bp result open run.bp-result

# 민감 정보를 제거한 Issue 초안을 만듭니다.
bp result report run.bp-result
```

## Lab manifest

각 local lab은 application language와 무관한 manifest를 가집니다.

```yaml
apiVersion: breaking-point.dev/v1alpha1
kind: LocalLab
metadata:
  name: connection-pool
spec:
  scenarioEngine: queueing.v1
  implementations:
    - id: typescript
      runtime: node
      composeProfile: typescript
    - id: go
      runtime: go
      composeProfile: go
    - id: rust
      runtime: rust
      composeProfile: rust
  limits:
    cpu: '2'
    memory: 2Gi
    duration: 3m
  collector:
    format: bp-result.v1
```

TypeScript, Go와 Rust 구현은 동일한 Scenario와 관찰 contract를 사용합니다. Kotlin과 Java는 JVM runtime
특성을 비교할 필요가 생길 때 같은 manifest의 implementation으로 추가합니다.

## Safety contract

- 기본 target은 loopback과 CLI가 만든 Docker network로 제한합니다.
- 외부 host에 부하를 보내려면 명시적인 flag와 확인이 필요합니다.
- CPU, memory, duration, request rate에 기본 상한을 둡니다.
- 종료와 실패 시 자신이 만든 container와 network만 정리합니다.
- secret, environment variable 전체와 request body는 결과 bundle에 넣지 않습니다.
- image digest, CLI version, OS, CPU architecture와 실행 시간을 기록합니다.
- 결과마다 `model`, `local measurement`, `hosted measurement` 중 provenance를 표시합니다.

## Package boundary

초기에는 repository 안의 pnpm workspace로 시작합니다.

```text
packages/
├── contracts/       # Scenario, manifest, result schema
├── cli/             # bp 명령 parsing과 orchestration
├── lab-runner/      # Docker lifecycle과 process execution
└── result-reader/   # Playground와 CLI가 함께 쓰는 result parser
labs/
└── connection-pool/
    ├── lab.yaml
    ├── compose.yaml
    └── implementations/
        ├── typescript/
        ├── go/
        └── rust/
```

지금 당장 기존 `src/simulation`을 package로 옮기지는 않습니다. CLI proof of concept가 실제로 같은 contract를
사용하는 것이 확인된 뒤 `packages/contracts`로 추출해야 불필요한 abstraction을 피할 수 있습니다.

## 단계별 delivery

1. 문서로 Docker Compose lab을 한 번 완성하고 사용자가 막히는 지점을 기록합니다.
2. `doctor`, `run`, `down`만 제공하는 repository-local script를 만듭니다.
3. `bp-result.v1` schema와 Playground import를 구현합니다.
4. `packages/cli`로 추출하고 unit/integration test와 fixture를 고정합니다.
5. package 배포 방식은 실제 외부 사용자가 생긴 뒤 결정합니다.

CLI 자체의 기술 선택은 distribution과 유지보수로 판단합니다. 첫 구현은 기존 codebase와 contract를 공유하기
쉬운 TypeScript가 적합하지만, CLI architecture와 lab implementation은 특정 language에 종속되지 않습니다.
