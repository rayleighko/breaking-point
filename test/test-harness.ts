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
  'docs/AI_HARNESS.md': ['docs/DECISIONS.md', 'CHANGELOG.md', 'HANDOFF.md'],
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

console.log('PASS  AI harness adapter, project skill과 contribution template reference');
