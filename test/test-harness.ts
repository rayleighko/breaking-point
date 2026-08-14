import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const requiredReferences: Record<string, string[]> = {
  'CLAUDE.md': ['AGENTS.md', 'docs/AI_HARNESS.md'],
  '.cursor/rules/breaking-point-core.mdc': ['AGENTS.md', 'docs/AI_HARNESS.md'],
  '.github/copilot-instructions.md': ['AGENTS.md', 'skills/breaking-point-maintainer/SKILL.md'],
  'AGENTS.md': ['docs/AI_HARNESS.md', 'skills/breaking-point-maintainer/SKILL.md'],
  'CONTENT_GUIDE.md': ['docs/GLOBAL_STANDARD.md', 'docs/KNOWLEDGE_SOURCES.md'],
  'README.md': ['docs/GLOBAL_STANDARD.md'],
  'docs/DOMAIN_AI.md': ['docs/RETRIEVAL_COST_POLICY.md'],
  'docs/SEARCH_ARCHITECTURE.md': ['docs/RETRIEVAL_COST_POLICY.md'],
  'docs/AI_HARNESS.md': [
    'docs/DECISIONS.md',
    'CHANGELOG.md',
    'HANDOFF.md',
    'docs/AI_DEVELOPMENT_LOOP.md',
  ],
  'docs/AI_DEVELOPMENT_LOOP.md': ['docs/GITFLOW.md', 'docs/GLOBAL_STANDARD.md'],
  'docs/GITFLOW.md': ['Rebase and merge', 'docs/AI_DEVELOPMENT_LOOP.md'],
};

for (const [file, references] of Object.entries(requiredReferences)) {
  const contents = readFileSync(file, 'utf8');
  for (const reference of references) {
    assert.ok(
      contents.includes(reference),
      `${file}에서 ${reference} reference를 찾을 수 없습니다.`,
    );
  }
}

for (const skill of ['breaking-point-maintainer', 'review-learning-ux']) {
  const contents = readFileSync(`skills/${skill}/SKILL.md`, 'utf8');
  assert.ok(!contents.includes('[TODO'), `${skill} skill에 TODO placeholder가 남아 있습니다.`);
  assert.ok(
    contents.startsWith(`---\nname: ${skill}\n`),
    `${skill} frontmatter가 올바르지 않습니다.`,
  );
}

const contributionTemplates: Record<string, string[]> = {
  '.github/PULL_REQUEST_TEMPLATE.md': [
    '## Outcome',
    '## Decision and trade-offs',
    'pnpm quality',
    'Contributor ownership',
  ],
  '.github/ISSUE_TEMPLATE/bug.yml': ['Environment', 'Safety check'],
  '.github/ISSUE_TEMPLATE/lab-proposal.yml': ['Sources', 'Recall card'],
  '.github/ISSUE_TEMPLATE/knowledge-improvement.yml': ['Sources', 'Originality'],
  '.github/ISSUE_TEMPLATE/feature-proposal.yml': [
    'Cost and operation',
    'Privacy and safety',
    'Validation plan',
  ],
};

for (const [file, markers] of Object.entries(contributionTemplates)) {
  const contents = readFileSync(file, 'utf8');
  for (const marker of markers) {
    assert.ok(contents.includes(marker), `${file}에서 ${marker} 항목을 찾을 수 없습니다.`);
  }
}

const aiReviewWorkflow = readFileSync('.github/workflows/ai-review.yml', 'utf8');
assert.ok(
  aiReviewWorkflow.includes(
    'uses: rayleighko/engineering-review-action@66f5efffa411a355beebc5ba690c31154c580af5',
  ),
  'AI review Action은 검토한 immutable full SHA를 사용해야 합니다.',
);
assert.ok(
  !aiReviewWorkflow.includes('uses: ./review-action'),
  'AI review workflow가 제거된 local Action을 참조합니다.',
);
assert.ok(
  !aiReviewWorkflow.includes('actions/checkout@'),
  'credentialed caller workflow에서 별도 checkout을 실행하면 안 됩니다.',
);
assert.ok(
  aiReviewWorkflow.includes('contents: read'),
  'AI review contents 권한은 read여야 합니다.',
);
assert.ok(
  aiReviewWorkflow.includes('pull-requests: write'),
  'AI review가 comment를 작성하려면 pull-requests write 권한이 필요합니다.',
);

console.log('PASS  AI harness, contribution template와 external review Action boundary');
