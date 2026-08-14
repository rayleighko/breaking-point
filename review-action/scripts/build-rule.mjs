import { appendFileSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const supportedProfiles = new Set(['typescript', 'go', 'python']);

function readRuleDocument(path) {
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  if (!parsed || !Array.isArray(parsed.rules)) {
    throw new Error(`${path} must contain a rules array.`);
  }

  for (const [index, entry] of parsed.rules.entries()) {
    if (!entry || typeof entry.path !== 'string' || typeof entry.rule !== 'string') {
      throw new Error(`${path} rules[${index}] must contain string path and rule values.`);
    }
    if (entry.profile !== undefined && typeof entry.profile !== 'string') {
      throw new Error(`${path} rules[${index}].profile must be a string.`);
    }
  }

  return parsed;
}

function readRuleFile(path) {
  return readRuleDocument(path).rules;
}

export function parseProfiles(value) {
  const profiles = [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
  if (profiles.length === 0) {
    throw new Error('At least one review profile is required.');
  }

  for (const profile of profiles) {
    if (!supportedProfiles.has(profile)) {
      throw new Error(
        `Unsupported review profile: ${profile}. Supported profiles: ${[...supportedProfiles].join(', ')}.`,
      );
    }
  }

  return profiles;
}

export function resolveWorkspaceFile(workspace, requestedPath, fieldName) {
  if (!requestedPath) return null;
  if (isAbsolute(requestedPath)) {
    throw new Error(`${fieldName} must be relative to GITHUB_WORKSPACE.`);
  }

  const workspaceRoot = resolve(workspace);
  const candidatePath = resolve(workspaceRoot, requestedPath);
  const lexicalPath = relative(workspaceRoot, candidatePath);
  if (lexicalPath === '..' || lexicalPath.startsWith(`..${sep}`)) {
    throw new Error(`${fieldName} must stay inside GITHUB_WORKSPACE.`);
  }

  const realWorkspaceRoot = realpathSync(workspaceRoot);
  const rulePath = realpathSync(candidatePath);
  const pathFromWorkspace = relative(realWorkspaceRoot, rulePath);
  if (pathFromWorkspace === '..' || pathFromWorkspace.startsWith(`..${sep}`)) {
    throw new Error(`${fieldName} symlinks must stay inside GITHUB_WORKSPACE.`);
  }
  return rulePath;
}

export function resolveProjectRule(workspace, projectRule) {
  return resolveWorkspaceFile(workspace, projectRule, 'project_rule');
}

export function parseKnowledgePacks(value) {
  return [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function readKnowledgePack(path) {
  const pack = readRuleDocument(path);
  if (pack.schema_version !== 1) {
    throw new Error(`${path} schema_version must be 1.`);
  }
  for (const field of ['name', 'version']) {
    if (typeof pack[field] !== 'string' || !pack[field].trim()) {
      throw new Error(`${path} ${field} must be a non-empty string.`);
    }
  }
  if (!pack.source || typeof pack.source !== 'object') {
    throw new Error(`${path} source must describe the pack provenance.`);
  }
  for (const field of ['url', 'revision', 'license', 'reviewed_at']) {
    if (typeof pack.source[field] !== 'string' || !pack.source[field].trim()) {
      throw new Error(`${path} source.${field} must be a non-empty string.`);
    }
  }
  if (!/^(?:[a-f\d]{40}|[a-f\d]{64}|sha256:[a-f\d]{64})$/i.test(pack.source.revision)) {
    throw new Error(`${path} source.revision must be a full commit SHA or SHA-256 content hash.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pack.source.reviewed_at)) {
    throw new Error(`${path} source.reviewed_at must use YYYY-MM-DD.`);
  }
  return pack;
}

function inheritRule(entry, profileRules, baseFallback, label) {
  const inheritedRule = entry.profile
    ? profileRules.get(entry.profile)?.[0]?.rule
    : baseFallback.rule;
  if (entry.profile && !inheritedRule) {
    throw new Error(`${label} profile ${entry.profile} must be included in the profiles input.`);
  }
  return inheritedRule;
}

export function buildPolicy({
  actionPath,
  workspace,
  tempDirectory,
  profiles,
  projectRule,
  knowledgePacks = '',
}) {
  const selectedProfiles = parseProfiles(profiles);
  const profileRules = new Map(
    selectedProfiles.map((profile) => [
      profile,
      readRuleFile(resolve(actionPath, 'rules', `${profile}.json`)),
    ]),
  );
  const baseRules = readRuleFile(resolve(actionPath, 'rules', 'base.json'));
  const baseFallback = baseRules.find((entry) => entry.path === '**');
  if (!baseFallback) throw new Error('base.json must contain a ** fallback rule.');

  const rules = [];
  const projectRulePath = resolveProjectRule(workspace, projectRule);

  if (projectRulePath) {
    for (const entry of readRuleFile(projectRulePath)) {
      const inheritedRule = inheritRule(entry, profileRules, baseFallback, 'Project rule');
      rules.push({
        path: entry.path,
        rule: `${inheritedRule}\n\nProject policy: ${entry.rule}`,
      });
    }
  }

  const packs = parseKnowledgePacks(knowledgePacks).map((packPath) => {
    const resolvedPath = resolveWorkspaceFile(workspace, packPath, 'knowledge_packs');
    return readKnowledgePack(resolvedPath);
  });
  const packIds = new Set();
  for (const pack of packs) {
    const packId = `${pack.name}@${pack.version}`;
    if (packIds.has(packId)) throw new Error(`Duplicate knowledge pack: ${packId}.`);
    packIds.add(packId);
    for (const entry of pack.rules) {
      const inheritedRule = inheritRule(
        entry,
        profileRules,
        baseFallback,
        `Knowledge pack ${packId}`,
      );
      rules.push({
        path: entry.path,
        rule: `${inheritedRule}\n\nKnowledge pack ${packId}: ${entry.rule}`,
      });
    }
  }
  for (const profile of selectedProfiles) rules.push(...profileRules.get(profile));
  rules.push(...baseRules);

  mkdirSync(tempDirectory, { recursive: true });
  const outputPath = resolve(tempDirectory, 'engineering-review-policy.json');
  writeFileSync(outputPath, `${JSON.stringify({ rules }, null, 2)}\n`, 'utf8');
  return { outputPath, packs: [...packIds], profiles: selectedProfiles, rules };
}

function writeActionOutput(path, name, value) {
  appendFileSync(path, `${name}=${value}\n`, 'utf8');
}

function main() {
  const actionPath =
    process.env.GITHUB_ACTION_PATH ?? resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const tempDirectory = resolve(
    process.env.RUNNER_TEMP ?? process.cwd(),
    'engineering-review-action',
  );
  const profiles = process.env.REVIEW_PROFILES ?? 'typescript,go,python';
  const projectRule = process.env.REVIEW_PROJECT_RULE ?? '';
  const knowledgePacks = process.env.REVIEW_KNOWLEDGE_PACKS ?? '';
  const result = buildPolicy({
    actionPath,
    workspace,
    tempDirectory,
    profiles,
    projectRule,
    knowledgePacks,
  });

  if (process.env.GITHUB_OUTPUT) {
    writeActionOutput(process.env.GITHUB_OUTPUT, 'rule_path', result.outputPath);
    writeActionOutput(process.env.GITHUB_OUTPUT, 'profiles', result.profiles.join(','));
    writeActionOutput(process.env.GITHUB_OUTPUT, 'knowledge_packs', result.packs.join(','));
  }
  process.stdout.write(
    `Prepared ${result.rules.length} review rules for ${result.profiles.join(', ')} with ${result.packs.length} knowledge pack(s).\n`,
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) main();
