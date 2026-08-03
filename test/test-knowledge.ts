import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

import { LEARNING_RESOURCES } from '../src/lib/resources.ts';

interface TopicFile {
  name: string;
  description: string;
  related: string[];
  relations?: Array<{ slug: string; type: string; note: string }>;
  keywords?: string[];
  sources?: Array<{ type: string; url: string }>;
  context?: { standing: string; attribution?: string; note: string };
}

const slugs = readdirSync('src/content/topics')
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.replace(/\.json$/, ''));
const TOPICS = slugs.map((slug) => ({
  slug,
  ...JSON.parse(readFileSync(`src/content/topics/${slug}.json`, 'utf8')),
})) as Array<TopicFile & { slug: string }>;
assert.equal(new Set(slugs).size, slugs.length, '주제 slug는 중복되면 안 됩니다.');
assert.ok(
  TOPICS.every((topic) => topic.name !== '대기행렬'),
  '사용자 표시 이름에는 직역어 대신 Queue 또는 대기열을 사용합니다.',
);

for (const topic of TOPICS) {
  for (const related of topic.related) {
    assert.ok(slugs.includes(related), `${topic.slug}의 관련 주제 ${related}가 존재해야 합니다.`);
  }

  for (const relation of topic.relations ?? []) {
    assert.ok(
      slugs.includes(relation.slug),
      `${topic.slug}의 관계 대상 ${relation.slug}가 존재해야 합니다.`,
    );
    assert.notEqual(relation.slug, topic.slug, `${topic.slug}는 자기 자신과 연결할 수 없습니다.`);
    assert.ok(
      relation.note.trim().length >= 10,
      `${topic.slug}의 관계에는 연결 이유가 필요합니다.`,
    );
  }

  for (const source of topic.sources ?? []) {
    assert.ok(source.url.startsWith('https://'), `${topic.slug} 출처는 HTTPS URL이어야 합니다.`);
  }
}

for (const slug of ['tdd', 'ddd', 'atomic-design', 'code-smell']) {
  const topic = TOPICS.find((item) => item.slug === slug);
  assert.ok(topic?.sources?.length, `${slug}에는 원전이 필요합니다.`);
  assert.ok(
    topic.sources.some((source) => source.type === '원전'),
    `${slug}에는 원전 표시가 필요합니다.`,
  );
}

const cdn = TOPICS.find((topic) => topic.slug === 'cdn');
assert.ok(cdn, 'CDN 주제가 존재해야 합니다.');
assert.ok(cdn.sources?.length === 2, 'CDN은 vendor가 다른 공식 문서로 교차 검증해야 합니다.');
assert.ok(cdn.keywords?.includes('cache hit ratio'), 'CDN 관찰 지표가 포함되어야 합니다.');

const carryingCapacity = TOPICS.find((topic) => topic.slug === 'carrying-capacity');
assert.equal(carryingCapacity?.context?.standing, '업계 실무 용어');
assert.ok(carryingCapacity?.context?.attribution?.includes('Toss PO Session'));
assert.ok(carryingCapacity?.description.includes('Inflow / Churn rate'));

assert.ok(LEARNING_RESOURCES.length >= 10, '참고 자료실의 초기 범위를 유지해야 합니다.');
for (const resource of LEARNING_RESOURCES) {
  assert.ok(resource.url.startsWith('https://'), `${resource.name}은 HTTPS URL이어야 합니다.`);
}

console.log(`knowledge: ${TOPICS.length} topics, ${LEARNING_RESOURCES.length} resources — ok`);
