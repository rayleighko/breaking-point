/**
 * 전체 로드맵. 여기가 이 프로젝트의 목차이자 진행 상황판이다.
 * 랩을 하나 완성하면 status 를 'done' 으로 바꾸고 slug 를 채운다.
 */

export type Status = 'done' | 'writing' | 'planned';

export interface RoadmapItem {
  title: string;
  /** 이 랩이 답하는 질문. 목차만 봐도 뭘 배우는지 알 수 있게. */
  question: string;
  status: Status;
  /** 완성된 경우 콘텐츠 slug */
  slug?: string;
  /** 이 랩에서 만들 시뮬레이터 한 줄 설명 */
  sim: string;
}

export interface Stage {
  name: string;
  goal: string;
  items: RoadmapItem[];
}

export const ROADMAP: Stage[] = [
  {
    name: '0. CS 문제 해결의 기초',
    goal: '자료구조와 알고리즘을 암기 문제가 아니라 실제 system의 비용과 순서를 설명하는 도구로 익힌다.',
    items: [
      {
        title: 'Complexity와 측정',
        question: '입력이 10배가 될 때 어떤 구현은 왜 100배 느려질까?',
        status: 'planned',
        sim: '입력 크기와 연산 수 곡선을 실제 browser 실행 시간과 나란히 비교',
      },
      {
        title: '탐색 알고리즘',
        question: '순서가 있다는 사실 하나가 탐색 범위를 어떻게 절반씩 줄이나?',
        status: 'planned',
        sim: 'Linear Search와 Binary Search가 확인한 칸과 실제 연산 횟수를 나란히 표시',
      },
      {
        title: 'Array와 Hash Table',
        question: '빠른 lookup은 어떤 memory와 collision 비용을 치르는가?',
        status: 'planned',
        sim: '중복 요청을 선형 탐색과 idempotency key map으로 판별하며 비용 비교',
      },
      {
        title: 'Queue와 Stack',
        question: '처리 순서 하나가 fairness와 memory 사용량을 어떻게 바꾸나?',
        status: 'planned',
        sim: 'FIFO worker queue와 LIFO 작업 복구를 workload별로 실행',
      },
      {
        title: 'Tree와 Graph',
        question: '한 service의 변경과 장애가 어디까지 퍼지는지 어떻게 찾나?',
        status: 'planned',
        sim: 'dependency graph를 순회해 blast radius, cycle과 배포 순서 찾기',
      },
      {
        title: 'Graph 경로 탐색',
        question: '가장 가까운 연결과 가장 저렴한 경로는 왜 같은 문제가 아닌가?',
        status: 'planned',
        sim: 'BFS, DFS와 Dijkstra의 frontier·방문 순서·누적 비용을 단계별 비교',
      },
      {
        title: '정렬, 탐색과 Priority Queue',
        question: '모든 일을 순서대로 처리하는 것이 언제 불공정한가?',
        status: 'planned',
        sim: 'job scheduler의 정책을 바꾸며 throughput, starvation과 p99 비교',
      },
    ],
  },
  {
    name: '1. 기초 체력',
    goal: '부하가 걸리면 시스템이 왜, 어떤 순서로 무너지는지에 대한 감각을 만든다.',
    items: [
      {
        title: '커넥션 풀 고갈',
        question: '트래픽이 2배가 되면 왜 응답시간은 2배가 아니라 20배가 될까?',
        status: 'done',
        slug: 'connection-pool',
        sim: '창구/대기줄 애니메이션 + 이용률 계산기 + 스파이크 챌린지',
      },
      {
        title: 'Queue의 감각',
        question: '이용률 70%와 95%는 뭐가 그렇게 다른가?',
        status: 'done',
        slug: 'queue-sense',
        sim: '이용률 슬라이더를 올리며 대기시간 곡선이 수직으로 꺾이는 걸 관찰',
      },
      {
        title: 'p50과 p99',
        question: '평균 응답시간은 멀쩡한데 왜 사용자는 느리다고 할까?',
        status: 'done',
        slug: 'p50-p99',
        sim: '같은 평균, 다른 분포 두 개를 나란히 놓고 체감 비교',
      },
      {
        title: '캐시 스탬피드',
        question: '캐시를 넣었는데 왜 5분마다 DB가 죽을까?',
        status: 'planned',
        sim: 'TTL 동시 만료 순간 요청이 DB로 쏟아지는 장면 + 지터/뮤텍스 적용 비교',
      },
      {
        title: '리트라이 스톰',
        question: '재시도는 왜 도움이 안 되고 불을 키우는가?',
        status: 'planned',
        sim: '백오프 없음 / 고정 / 지수+지터 세 가지를 나란히 실행',
      },
    ],
  },
  {
    name: '2. 한계 다루기',
    goal: '내 시스템이 어디서 부러지는지 숫자로 말할 수 있게 된다.',
    items: [
      {
        title: '용량 산정',
        question: '"초당 3000 요청을 버틸 수 있나요?"에 어떻게 답하나?',
        status: 'planned',
        sim: '요청 하나의 자원 소모를 입력하면 필요한 서버/커넥션/대역폭을 역산',
      },
      {
        title: '부하 테스트 제대로 하기',
        question: 'k6로 한계점을 찾고 병목을 특정하는 방법',
        status: 'planned',
        sim: '실제 실행 가능한 k6 스크립트 + 결과 해석 가이드',
      },
      {
        title: '스케일아웃의 경계',
        question: '어디까지 늘려서 해결되고, 어디부터는 안 되는가?',
        status: 'planned',
        sim: '계층별로 파드를 늘려보며 병목이 아래로 이동하는 걸 추적',
      },
      {
        title: '핫키와 편향',
        question: '샤딩했는데 왜 한 대만 죽을까?',
        status: 'planned',
        sim: '키 분포를 조절하며 샤드별 부하 불균형을 관찰',
      },
      {
        title: 'N+1과 쿼리 비용',
        question: '코드 한 줄이 어떻게 쿼리 500개가 되는가?',
        status: 'planned',
        sim: 'ORM 코드를 고르면 발생하는 쿼리 수와 총 지연을 계산',
      },
    ],
  },
  {
    name: '3. 무너짐 막기',
    goal: '한 곳의 장애가 전체로 번지지 않게 막는 장치들을 손에 익힌다.',
    items: [
      {
        title: '타임아웃 예산',
        question: '서비스가 5단계로 이어져 있을 때 각 타임아웃을 얼마로 잡나?',
        status: 'planned',
        sim: '체인의 타임아웃을 조절하며 어디서 예산이 터지는지 확인',
      },
      {
        title: '서킷 브레이커',
        question: '고장난 하위 서비스를 언제 포기해야 하나?',
        status: 'planned',
        sim: '차단기 임계값을 바꿔가며 회복 속도와 오작동을 비교',
      },
      {
        title: '백프레셔와 부하 제한',
        question: '다 받아서 다 죽느니, 일부를 거절하는 게 나은 이유',
        status: 'planned',
        sim: '무제한 수용 vs 큐 상한 vs 적응형 제한 3가지 비교',
      },
      {
        title: '벌크헤드',
        question: '느린 API 하나가 왜 전체 서비스를 멈추게 하나?',
        status: 'planned',
        sim: '스레드 풀 공유 / 분리 두 구조를 나란히 부하',
      },
      {
        title: '멱등성',
        question: '결제가 두 번 되는 건 어떻게 막나?',
        status: 'planned',
        sim: '중복 요청을 쏘면서 멱등키 유무에 따른 결과 비교',
      },
      {
        title: '동시성과 재고 초과 판매',
        question: '재고 1개에 100명이 동시에 주문하면?',
        status: 'planned',
        sim: '락 없음 / 비관적 / 낙관적 / 원자적 감소 4가지 결과 비교',
      },
      {
        title: '대기열(가상 대기실)',
        question: '티켓팅은 왜 대기열을 쓰나?',
        status: 'planned',
        sim: '대기열 유무에 따른 성공률과 사용자 경험 비교',
      },
    ],
  },
  {
    name: '4. 보고 고치기',
    goal: '터졌을 때 원인을 찾고, 안 터지게 배포하는 법.',
    items: [
      {
        title: '분산 트레이싱',
        question: '서비스 10개 중 범인을 어떻게 찾나?',
        status: 'planned',
        sim: '가짜 트레이스에서 병목 구간을 직접 찾아보는 연습',
      },
      {
        title: '무중단 스키마 변경',
        question: '1억 행 테이블에 컬럼을 어떻게 추가하나?',
        status: 'planned',
        sim: '단계별 마이그레이션 시뮬레이션 + 잘못된 순서의 결과',
      },
      {
        title: 'graceful shutdown',
        question: '배포할 때마다 왜 에러가 조금씩 나나?',
        status: 'planned',
        sim: '종료 훅 유무에 따른 처리 중 요청의 운명',
      },
      {
        title: '장애 대응',
        question: '새벽 3시에 알림이 왔다. 무엇부터 보나?',
        status: 'planned',
        sim: '증상만 주고 원인을 좁혀가는 인터랙티브 시나리오',
      },
    ],
  },
  {
    name: '5. 애플리케이션 설계',
    goal: 'React에서 PostgreSQL까지 한 요청의 lifecycle과 경계를 설명한다.',
    items: [
      {
        title: 'React state와 Server state',
        question: '무엇을 browser에 두고, 무엇을 server에서 다시 가져와야 하나?',
        status: 'planned',
        sim: 'local state / cache / server state가 어긋나는 시나리오를 비교',
      },
      {
        title: 'Next.js rendering boundary',
        question: 'SSR, RSC, Client Component는 성능과 ownership을 어떻게 바꾸나?',
        status: 'planned',
        sim: '같은 화면을 rendering 전략별 waterfall과 bundle 크기로 비교',
      },
      {
        title: 'NestJS request lifecycle',
        question: 'middleware, guard, interceptor, pipe는 어디에서 책임을 나눠야 하나?',
        status: 'planned',
        sim: '한 요청이 각 계층을 통과하며 실패·변환되는 경로 추적',
      },
      {
        title: 'API contract와 backward compatibility',
        question: 'frontend와 backend를 따로 배포해도 깨지지 않게 하려면?',
        status: 'planned',
        sim: 'schema 변경 순서에 따라 구버전 client가 깨지는지 확인',
      },
      {
        title: 'Authentication과 authorization',
        question: '로그인했다는 사실과 이 작업을 해도 된다는 판단은 왜 다른가?',
        status: 'planned',
        sim: 'session/JWT와 resource-level permission을 공격 시나리오로 비교',
      },
      {
        title: 'PostgreSQL transaction',
        question: 'transaction이 데이터는 지키는데 왜 서비스는 느려질까?',
        status: 'planned',
        sim: 'isolation level과 lock wait를 동시에 실행해 anomaly 관찰',
      },
    ],
  },
  {
    name: '6. 클라우드와 인프라',
    goal: '같은 system pattern이 Docker, Kubernetes, Serverless와 AWS에서 어디에 놓이는지 연결한다.',
    items: [
      {
        title: 'Docker process model',
        question: 'container는 VM과 무엇이 다르고, 무엇을 격리하지 못하나?',
        status: 'planned',
        sim: 'process·filesystem·network namespace와 resource limit을 시각화',
      },
      {
        title: 'Kubernetes workload model',
        question: 'Pod, Deployment, Service는 각각 어떤 실패를 처리하나?',
        status: 'planned',
        sim: 'Pod 종료·재시작·rolling update 동안 request 경로 관찰',
      },
      {
        title: 'Autoscaling과 overload',
        question: 'HPA가 늘리는 동안 들어온 요청과 DB 병목은 누가 책임지나?',
        status: 'planned',
        sim: 'CPU HPA / queue metric / load shedding을 같은 spike에 비교',
      },
      {
        title: 'Serverless concurrency',
        question: '서버가 없어졌는데 downstream은 왜 더 빨리 무너질까?',
        status: 'planned',
        sim: 'AWS Lambda concurrency가 RDS connection을 압박하는 과정과 RDS Proxy 비교',
      },
      {
        title: 'Event-driven architecture on AWS',
        question: 'SQS, SNS, EventBridge는 같은 메시징처럼 보여도 왜 선택이 다른가?',
        status: 'planned',
        sim: 'queue / pub-sub / event bus에서 fan-out, ordering, retry 경로 비교',
      },
      {
        title: 'CDN과 Edge cache',
        question: '사용자 가까이에 복사했는데 왜 Origin이 갑자기 과부하되고 오래된 화면이 보일까?',
        status: 'planned',
        sim: '지역별 요청이 Edge와 Origin으로 흐르며 hit, miss, TTL 만료, purge와 stale 응답을 비교',
      },
      {
        title: 'Terraform state와 plan',
        question: 'Infrastructure as Code가 있는데도 왜 실제 cloud와 코드가 어긋날까?',
        status: 'planned',
        sim: 'desired state, remote state, drift와 concurrent apply 충돌 관찰',
      },
      {
        title: 'Cloud cost as architecture',
        question: '같은 RPS인데 어떤 구조는 왜 10배 비쌀까?',
        status: 'planned',
        sim: 'compute, network egress, managed service 비용을 traffic pattern별 비교',
      },
      {
        title: 'Local Lab CLI',
        question: '실제 container와 부하 실험을 누구나 안전하고 재현 가능하게 실행하려면?',
        status: 'planned',
        sim: 'Scenario를 받아 Docker lab을 실행하고 evidence bundle을 Playground에서 시각화',
      },
    ],
  },
  {
    name: '7. AI와 함께 개발하기',
    goal: 'AI에게 구현을 맡겨도 architecture, evidence와 결과에 대한 ownership을 잃지 않는다.',
    items: [
      {
        title: 'Specification before prompt',
        question: '좋은 prompt보다 먼저 정해야 할 constraint와 acceptance criteria는 무엇인가?',
        status: 'planned',
        sim: '모호한 요청과 검증 가능한 spec이 만드는 구현 결과 비교',
      },
      {
        title: 'Codebase map과 change surface',
        question: '전체 코드를 외우지 않고도 변경의 영향을 어떻게 설명하나?',
        status: 'planned',
        sim: 'dependency graph에서 한 contract 변경의 downstream 영향 추적',
      },
      {
        title: 'Reviewing AI-generated code',
        question: '동작하는 코드와 merge해도 되는 코드를 어떻게 구분하나?',
        status: 'planned',
        sim: '숨은 race, security, operability 문제를 review checklist로 발견',
      },
      {
        title: 'Tests, evals, and CI',
        question: 'AI agent의 결과를 대화가 아니라 반복 가능한 evidence로 남기려면?',
        status: 'planned',
        sim: 'unit/integration/e2e/eval gate가 서로 다른 실패를 잡는 pipeline',
      },
      {
        title: 'Agent orchestration',
        question: '여러 agent에게 일을 나눌 때 속도보다 먼저 지켜야 할 것은?',
        status: 'planned',
        sim: '공유 contract 없는 병렬 작업과 bounded task orchestration 비교',
      },
      {
        title: 'Domain-grounded engineering coach',
        question: '범용 model보다 적은 context로 더 근거 있는 engineering 답변을 만들려면?',
        status: 'planned',
        sim: '전체 문서 prompt와 topic retrieval에서 token, citation coverage와 답변 정확도 비교',
      },
      {
        title: 'Wiki에서 ADR까지',
        question: 'PM의 개념과 현재 architecture를 검증 가능한 의사결정 문서로 어떻게 연결하나?',
        status: 'planned',
        sim: '질문 → 관련 topic·source 검색 → constraint 확인 → ADR 초안 → 누락 evidence 평가',
      },
      {
        title: 'Decision log와 interview narrative',
        question: 'AI와 만든 일을 몇 달 뒤 내 경험으로 설명하려면 무엇을 기록해야 하나?',
        status: 'planned',
        sim: 'incident·PR·trade-off를 STAR와 architecture narrative로 재구성',
      },
    ],
  },
  {
    name: '8. 개발 방법과 설계',
    goal: '방법론을 이름으로 외우지 않고, 어떤 문제에서 어떤 feedback과 경계를 만드는지 실험합니다.',
    items: [
      {
        title: 'TDD feedback loop',
        question: 'test를 먼저 쓰면 설계와 AI code review가 실제로 어떻게 달라질까?',
        status: 'planned',
        sim: '같은 요구사항을 test-first와 implementation-first로 진행하며 regression과 change cost 비교',
      },
      {
        title: 'DDD와 Bounded Context',
        question: '하나의 단어가 서로 다른 뜻일 때 system boundary는 어디에 그어야 하나?',
        status: 'planned',
        sim: '주문·결제·배송 model을 합치거나 분리하며 change propagation 비교',
      },
      {
        title: 'OOP와 invariant',
        question: 'class는 언제 복잡성을 감추고, 언제 복잡성을 더 만들까?',
        status: 'planned',
        sim: 'anemic data model과 behavior-owning object에서 잘못된 상태가 생기는 경로 비교',
      },
      {
        title: 'Code Smell과 Refactoring',
        question: '냄새를 발견한 뒤 언제 고치고, 언제 그대로 두어야 하나?',
        status: 'planned',
        sim: '변경 시나리오와 test를 유지하며 작은 refactoring의 비용과 효과 비교',
      },
      {
        title: 'Functional Core, Imperative Shell',
        question: '상태와 I/O를 어디까지 밀어내야 재현 가능한가?',
        status: 'planned',
        sim: '같은 simulation을 숨은 상태와 pure core로 실행해 test 안정성 비교',
      },
    ],
  },
  {
    name: '9. 함께 일하는 언어',
    goal: 'Engineering, Product와 Design이 같은 문제를 서로 다른 말로 설명할 때 의사결정의 접점을 만든다.',
    items: [
      {
        title: 'Capacity Planning과 우선순위',
        question: '팀이 감당할 수 있는 양과 system이 버틸 수 있는 양을 어떻게 함께 약속하나?',
        status: 'planned',
        sim: 'feature, 운영, interrupt의 비율을 바꾸며 WIP와 납기 예측 비교',
      },
      {
        title: 'Carrying Capacity와 Product growth',
        question: '유입은 계속되는데 활성 사용자 수는 왜 어느 지점에서 평평해질까?',
        status: 'planned',
        sim: '비가 내리고 물이 빠지는 호수에서 Inflow, Churn과 Active users의 평형점을 조작',
      },
      {
        title: 'Product metric과 기술 metric',
        question: 'p99 개선이 실제 사용자 경험과 business outcome을 바꿨는지 어떻게 아나?',
        status: 'planned',
        sim: 'latency와 error가 conversion, completion rate에 미치는 가상 funnel 비교',
      },
      {
        title: 'Atomic Design과 UI 경계',
        question: '재사용 component는 언제 일관성을 만들고 언제 domain을 숨기나?',
        status: 'planned',
        sim: '부분과 page를 동시에 바꾸며 visual consistency와 change surface 비교',
      },
      {
        title: '접근성을 품질 조건으로',
        question: '보이는 화면이 같아도 keyboard와 screen reader에서는 왜 다른가?',
        status: 'planned',
        sim: 'semantic element, focus order와 색 대비를 직접 바꾸며 사용 경로 확인',
      },
      {
        title: 'Engineering Decision Record',
        question: '결론만 남기지 않고 제약과 trade-off를 어떻게 팀의 기억으로 보존하나?',
        status: 'planned',
        sim: '같은 architecture 결정을 context 유무에 따라 재검토하는 scenario',
      },
    ],
  },
];

export const STATUS_LABEL: Record<Status, string> = {
  done: '완성',
  writing: '작성 중',
  planned: '예정',
};

export function counts() {
  const all = ROADMAP.flatMap((s) => s.items);
  return { done: all.filter((i) => i.status === 'done').length, total: all.length };
}
