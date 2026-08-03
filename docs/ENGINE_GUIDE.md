# Simulation engine guide

Simulation은 UI component 안에 계산 규칙을 넣지 않습니다. 입력, 실행, 표현을 분리해야 같은 문제를
다른 language와 runtime에서도 비교할 수 있습니다.

## Directory contract

```text
src/
├── simulation/
│   ├── schema.ts       # versioned Scenario JSON과 runtime validation
│   ├── examples.ts     # 재현 가능한 공개 예제
│   ├── registry.ts     # 지원 engine과 maturity 상태
│   ├── engines/        # 앞으로 추가할 순수 계산 model
│   └── adapters/       # Scenario를 engine config로 변환
├── lib/engine.ts       # 검증된 queueing.v1 core, 현재 adapter가 사용
└── components/playground/ # editor와 visualization, 계산 규칙은 두지 않음
```

현재 `queueing.v1`은 안정화된 `src/lib/engine.ts`를 직접 호출합니다. 동작을 바꾸지 않고 adapter가 두 개
이상 생기는 시점에만 `engines/queueing/`으로 이동합니다. directory 정리를 위한 대규모 이동보다 public
contract의 안정성을 우선합니다.

## Engine contract

새 engine은 다음 조건을 만족해야 합니다.

1. `schemaVersion`과 고유한 engine id를 가집니다.
2. 같은 Scenario와 seed에서 같은 결과를 냅니다.
3. 입력 상한을 검증하여 browser를 멈추게 하지 않습니다.
4. model이 포함한 것과 생략한 것을 결과에 명시합니다.
5. 순진한 해법이 실패하고 의도한 해법이 통과하는 test를 둡니다.
6. Scenario JSON과 결과를 Issue에 첨부해 재현할 수 있습니다.

실제 CPU, memory, network를 측정한 값은 deterministic model 결과와 섞지 않습니다. local lab 결과에는
runtime version, machine 정보, warm-up, duration과 raw measurement를 evidence로 함께 보관합니다.
