import { defineCollection, z } from 'astro:content';

import { glob } from 'astro/loaders';

const labs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/labs' }),
  schema: z.object({
    title: z.string(),
    /** 한 줄 요약. 목록과 카드에 노출된다. */
    subtitle: z.string(),
    /** 로드맵 순서 */
    order: z.number(),
    stage: z.enum(['기초 체력', '한계 다루기', '무너짐 막기', '보고 고치기']),
    level: z.enum(['입문', '중급', '심화']),
    minutes: z.number(),
    /** 이 랩에서 답하는 질문 — 목록에서 이것만 봐도 감이 오게 */
    question: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const topicKinds = [
  'CS 기초',
  '개념',
  '시스템',
  '운영',
  '개발 방식',
  'Product',
  'Design',
  'AI Engineering',
] as const;

const topics = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/topics' }),
  schema: z.object({
    name: z.string(),
    kind: z.enum(topicKinds),
    oneLiner: z.string(),
    description: z.string(),
    signals: z.array(z.string()),
    related: z.array(z.string()).default([]),
    relations: z
      .array(
        z.object({
          slug: z.string(),
          type: z.enum(['선행 개념', '함께 보기', '비교하기', '구분하기', '적용 사례']),
          note: z.string(),
        }),
      )
      .default([]),
    keywords: z.array(z.string()).default([]),
    context: z
      .object({
        standing: z.enum([
          '국제 표준',
          '보편적 개념',
          '업계 실무 용어',
          'Vendor 동작',
          '조직 사례',
          '관점',
        ]),
        attribution: z.string().optional(),
        note: z.string(),
      })
      .optional(),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string().url(),
          type: z.enum(['원전', '공식 문서', '대학 강의', '회사 사례', '참고 자료']),
        }),
      )
      .default([]),
  }),
});

export const collections = { labs, topics };
