import { getCollection } from 'astro:content';

import { LEARNING_RESOURCES } from '@/lib/resources';
import { ROADMAP } from '@/lib/roadmap';
import type { SearchDocument } from '@/lib/search/types';

import type { APIRoute } from 'astro';

export const prerender = true;

const pages: SearchDocument[] = [
  {
    id: 'page-home',
    title: 'Breaking Point',
    url: '/',
    excerpt: '시스템이 부하 아래서 무너지는 방식을 직접 만져보며 배우는 학습 사이트입니다.',
    kind: '페이지',
    tags: ['simulation', 'software engineering'],
  },
  {
    id: 'page-playground',
    title: 'Scenario Playground',
    url: '/playground',
    excerpt: 'JSON Scenario를 입력하고 같은 seed로 재현 가능한 simulation을 실행합니다.',
    kind: '페이지',
    tags: ['JSON', 'simulation', 'local lab'],
  },
  {
    id: 'page-about',
    title: 'About Breaking Point',
    url: '/about',
    excerpt: 'Breaking Point의 학습 방향, 운영 원칙과 기여 방법을 설명합니다.',
    kind: '페이지',
    tags: ['contribution', 'software engineer'],
  },
];

export const GET: APIRoute = async () => {
  const [labs, topics] = await Promise.all([
    getCollection('labs', ({ data }) => !data.draft),
    getCollection('topics'),
  ]);

  const documents: SearchDocument[] = [
    ...pages,
    ...labs.map((lab) => ({
      id: `lab-${lab.id}`,
      title: lab.data.title,
      url: `/labs/${lab.id}`,
      excerpt: `${lab.data.subtitle} ${lab.data.question}`,
      kind: '실험실' as const,
      tags: lab.data.tags,
    })),
    ...topics.map((topic) => ({
      id: `topic-${topic.id}`,
      title: topic.data.name,
      url: `/topics/${topic.id}`,
      excerpt: `${topic.data.oneLiner} ${topic.data.description} ${topic.data.signals.join(' ')}`,
      kind: 'Wiki' as const,
      tags: [topic.data.kind, ...topic.data.keywords, ...topic.data.related],
    })),
    ...ROADMAP.flatMap((stage, stageIndex) =>
      stage.items.map((item, itemIndex) => ({
        id: `roadmap-${stageIndex}-${itemIndex}`,
        title: item.title,
        url: item.slug ? `/labs/${item.slug}` : '/roadmap',
        excerpt: `${stage.name} ${item.question} ${item.sim}`,
        kind: '로드맵' as const,
        tags: [stage.name, item.status],
      })),
    ),
    ...LEARNING_RESOURCES.map((resource, index) => ({
      id: `resource-${index}`,
      title: resource.name,
      url: '/resources',
      excerpt: `${resource.description} ${resource.useFor}`,
      kind: '자료' as const,
      tags: [resource.category, resource.access, resource.sourceRole],
    })),
  ];

  return new Response(JSON.stringify(documents), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
