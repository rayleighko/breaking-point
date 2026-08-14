import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildPolicy, parseProfiles, resolveProjectRule } from '../scripts/build-rule.mjs';

const actionPath = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('merges project rules before selected language and base policies', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'engineering-review-'));
  const workspace = resolve(root, 'workspace');
  const output = resolve(root, 'output');
  mkdirSync(resolve(workspace, '.review'), { recursive: true });
  writeFileSync(
    resolve(workspace, '.review/project.json'),
    JSON.stringify({
      rules: [
        {
          path: 'src/domain/**',
          rule: 'Preserve the domain invariant.',
          profile: 'typescript',
        },
      ],
    }),
  );

  try {
    const result = buildPolicy({
      actionPath,
      workspace,
      tempDirectory: output,
      profiles: 'go,typescript,go',
      projectRule: '.review/project.json',
    });

    assert.deepEqual(result.profiles, ['go', 'typescript']);
    assert.equal(result.rules[0].path, 'src/domain/**');
    assert.match(result.rules[0].rule, /floating promises/);
    assert.match(result.rules[0].rule, /Project policy: Preserve the domain invariant/);
    assert.equal(result.rules[1].path, '**/*.go');
    assert.match(result.rules[2].path, /ts/);
    assert.equal(result.rules.at(-1).path, '**');
    assert.deepEqual(JSON.parse(readFileSync(result.outputPath, 'utf8')), { rules: result.rules });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('provides TypeScript, Go, and Python profiles', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'engineering-review-'));
  try {
    const result = buildPolicy({
      actionPath,
      workspace: root,
      tempDirectory: resolve(root, 'output'),
      profiles: 'typescript,go,python',
      projectRule: '',
    });
    const paths = result.rules.map((rule) => rule.path);
    assert.ok(paths.includes('**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'));
    assert.ok(paths.includes('**/*.go'));
    assert.ok(paths.includes('**/*.py'));
    assert.ok(paths.includes('**/*.{json,yml,yaml,toml}'));
    assert.ok(!paths.some((path) => path.includes('mdx')));
    assert.match(result.rules.find((rule) => rule.path === '**/*.go').rule, /goroutine leaks/);
    assert.match(result.rules.find((rule) => rule.path === '**/*.py').rule, /mutable defaults/);
    const commonRule = result.rules.find((rule) => rule.path === '**').rule;
    assert.match(commonRule, /smallest useful verification/);
    assert.match(commonRule, /regardless of the author's seniority/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('requires project rule profiles to be enabled', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'engineering-review-'));
  const projectRule = resolve(root, 'project.json');
  writeFileSync(
    projectRule,
    JSON.stringify({
      rules: [{ path: '**/*.py', rule: 'Preserve API behavior.', profile: 'python' }],
    }),
  );

  try {
    assert.throws(
      () =>
        buildPolicy({
          actionPath,
          workspace: root,
          tempDirectory: resolve(root, 'output'),
          profiles: 'typescript',
          projectRule: 'project.json',
        }),
      /profile python must be included/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects unsupported profiles and project rules outside the workspace', () => {
  assert.throws(() => parseProfiles('typescript,ruby'), /Unsupported review profile: ruby/);
  assert.throws(() => resolveProjectRule('/tmp/workspace', '../policy.json'), /must stay inside/);
  assert.throws(() => resolveProjectRule('/tmp/workspace', '/tmp/policy.json'), /must be relative/);
});

test('rejects a project rule symlink that escapes the workspace', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'engineering-review-'));
  const workspace = resolve(root, 'workspace');
  const outsideRule = resolve(root, 'outside.json');
  mkdirSync(workspace);
  writeFileSync(outsideRule, JSON.stringify({ rules: [] }));
  symlinkSync(outsideRule, resolve(workspace, 'policy.json'));

  try {
    assert.throws(() => resolveProjectRule(workspace, 'policy.json'), /symlinks must stay inside/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('pins the upstream reviewer and exposes the security-sensitive inputs', () => {
  const metadata = readFileSync(resolve(actionPath, 'action.yml'), 'utf8');
  assert.match(metadata, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
  assert.match(metadata, /alibaba\/open-code-review@a0b49d5bec7a7ec38ec8b98c59775f56bf46b932/);
  assert.match(metadata, /default: 1\.7\.16/);
  assert.match(metadata, /github_token:/);
  assert.match(metadata, /project_rule:/);
});
