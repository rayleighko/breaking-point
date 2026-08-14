import { appendFileSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const supportedProfiles = new Set(['typescript', 'go', 'python']);

function readRuleFile(path) {
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

  return parsed.rules;
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

export function resolveProjectRule(workspace, projectRule) {
  if (!projectRule) return null;
  if (isAbsolute(projectRule)) {
    throw new Error('project_rule must be relative to GITHUB_WORKSPACE.');
  }

  const workspaceRoot = resolve(workspace);
  const candidatePath = resolve(workspaceRoot, projectRule);
  const lexicalPath = relative(workspaceRoot, candidatePath);
  if (lexicalPath === '..' || lexicalPath.startsWith(`..${sep}`)) {
    throw new Error('project_rule must stay inside GITHUB_WORKSPACE.');
  }

  const realWorkspaceRoot = realpathSync(workspaceRoot);
  const rulePath = realpathSync(candidatePath);
  const pathFromWorkspace = relative(realWorkspaceRoot, rulePath);
  if (pathFromWorkspace === '..' || pathFromWorkspace.startsWith(`..${sep}`)) {
    throw new Error('project_rule symlinks must stay inside GITHUB_WORKSPACE.');
  }
  return rulePath;
}

export function buildPolicy({ actionPath, workspace, tempDirectory, profiles, projectRule }) {
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
      const inheritedRule = entry.profile
        ? profileRules.get(entry.profile)?.[0]?.rule
        : baseFallback.rule;
      if (entry.profile && !inheritedRule) {
        throw new Error(
          `Project rule profile ${entry.profile} must be included in the profiles input.`,
        );
      }
      rules.push({
        path: entry.path,
        rule: `${inheritedRule}\n\nProject policy: ${entry.rule}`,
      });
    }
  }
  for (const profile of selectedProfiles) rules.push(...profileRules.get(profile));
  rules.push(...baseRules);

  mkdirSync(tempDirectory, { recursive: true });
  const outputPath = resolve(tempDirectory, 'engineering-review-policy.json');
  writeFileSync(outputPath, `${JSON.stringify({ rules }, null, 2)}\n`, 'utf8');
  return { outputPath, profiles: selectedProfiles, rules };
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
  const result = buildPolicy({ actionPath, workspace, tempDirectory, profiles, projectRule });

  if (process.env.GITHUB_OUTPUT) {
    writeActionOutput(process.env.GITHUB_OUTPUT, 'rule_path', result.outputPath);
    writeActionOutput(process.env.GITHUB_OUTPUT, 'profiles', result.profiles.join(','));
  }
  process.stdout.write(
    `Prepared ${result.rules.length} review rules for ${result.profiles.join(', ')}.\n`,
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) main();
