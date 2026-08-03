/**
 * 로드맵·프로세스 페이지에서 쓰는 시스템/운영 구조 설명.
 * UI는 이 데이터를 그리기만 하고, 학습 콘텐츠의 “정답 아키텍처”로 주장하지 않는다.
 */

export interface SystemLayer {
  id: string;
  name: string;
  role: string;
  /** GLOBAL_STANDARD 성격 */
  standing: 'de facto practice' | 'vendor boundary' | 'project contract';
  examples: string[];
}

export interface DeliveryStep {
  id: string;
  name: string;
  detail: string;
}

/** 랩 개념 → 이 repository 운영에 대응되는 감각 */
export interface LabOpsLink {
  concept: string;
  labSlug?: string;
  opsAnalogy: string;
}

export const SYSTEM_LAYERS: SystemLayer[] = [
  {
    id: 'shell',
    name: 'Static learning shell',
    role: '랩 본문, Wiki, 로드맵을 build time HTML로 제공합니다.',
    standing: 'de facto practice',
    examples: ['Astro', 'GitHub Pages', 'Pagefind index'],
  },
  {
    id: 'islands',
    name: 'Interaction islands',
    role: 'simulation, chart, challenge, Pet Coach처럼 상호작용만 React로 올립니다.',
    standing: 'project contract',
    examples: ['ConnectionPoolLab', 'QueueSenseLab', 'P50P99Lab', 'PetCoach'],
  },
  {
    id: 'model',
    name: 'Deterministic model',
    role: 'Scenario와 seed로 같은 결과를 내는 browser model입니다. production benchmark가 아닙니다.',
    standing: 'project contract',
    examples: ['src/lib/engine.ts', 'Scenario JSON', 'challenge scripts'],
  },
  {
    id: 'gateway',
    name: 'Isolated AI gateway',
    role: 'API key와 provider 호출만 분리합니다. 학습 shell과 runtime을 섞지 않습니다.',
    standing: 'vendor boundary',
    examples: ['Cloudflare Worker', 'OpenRouter', 'model allowlist'],
  },
];

export const DELIVERY_STEPS: DeliveryStep[] = [
  { id: 'orient', name: 'Orient', detail: 'contract와 roadmap item을 읽고 범위를 닫습니다.' },
  { id: 'feature', name: 'feature/*', detail: '한 사용자 결과만 담은 브랜치에서 구현합니다.' },
  { id: 'verify', name: 'Verify', detail: 'pnpm quality와 UI evidence로 통과를 판정합니다.' },
  { id: 'review', name: 'Review', detail: 'Standards와 Spec 축을 분리해 검토합니다.' },
  {
    id: 'develop',
    name: 'develop',
    detail: 'rebase로 통합합니다. Pages에는 아직 올리지 않습니다.',
  },
  {
    id: 'release',
    name: 'release → main',
    detail: 'rebase로 공개하고 Actions·URL로 관측합니다.',
  },
];

export const LAB_OPS_LINKS: LabOpsLink[] = [
  {
    concept: '이용률과 Queue',
    labSlug: 'queue-sense',
    opsAnalogy: 'CI·리뷰 대기열에 여유 없이 쌓이면 머지 지연이 수직으로 튑니다.',
  },
  {
    concept: 'p50과 p99',
    labSlug: 'p50-p99',
    opsAnalogy: '평균 빌드 시간은 괜찮어도 느린 PR 꼬리가 배포 체감을 망칩니다.',
  },
  {
    concept: '커넥션 풀 / 공유 자원',
    labSlug: 'connection-pool',
    opsAnalogy: '에이전트·CI·리뷰어를 늘려도 공통 contract와 quality gate가 병목이면 소용없습니다.',
  },
  {
    concept: 'Timeout과 overload',
    opsAnalogy: 'PR과 release에 시간 예산을 두고, 빨간 CI에서는 merge circuit을 엽니다.',
  },
  {
    concept: 'Evidence / tracing',
    opsAnalogy: '대화가 아니라 test output, Scenario, Pages URL로 결과를 추적합니다.',
  },
];
