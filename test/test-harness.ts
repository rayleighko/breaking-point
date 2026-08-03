import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const requiredReferences: Record<string, string[]> = {
  'CLAUDE.md': ['AGENTS.md', 'docs/AI_HARNESS.md'],
  '.cursor/rules/breaking-point-core.mdc': ['AGENTS.md', 'docs/AI_HARNESS.md'],
  '.github/copilot-instructions.md': ['AGENTS.md', 'skills/breaking-point-maintainer/SKILL.md'],
  'AGENTS.md': ['docs/AI_HARNESS.md', 'skills/breaking-point-maintainer/SKILL.md'],
  'CONTENT_GUIDE.md': ['docs/GLOBAL_STANDARD.md', 'docs/KNOWLEDGE_SOURCES.md'],
  'README.md': ['docs/GLOBAL_STANDARD.md'],
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

console.log('PASS  AI harness adapter와 project skill reference');
