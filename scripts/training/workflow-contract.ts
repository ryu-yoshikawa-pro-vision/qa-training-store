import { parse } from "yaml";

export const APPROVED_TRAINING_ACTIONS = new Set([
  "actions/checkout@11d5960a326750d5838078e36cf38b85af677262",
  "pnpm/action-setup@b906affcce14559ad1aafd4ab0e942779e9f58b1",
  "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020",
  "actions/setup-java@cf277c60eb25467037889841efdb72551f06f6c3",
  "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
]);

export const APPROVED_TRAINING_RUNNERS = new Set(["ubuntu-24.04"]);

const REPOSITORY_TRAINING_COMMANDS = new Set([
  "pnpm run validate:curriculum",
  "pnpm run build:web",
  "pnpm run training:web:baseline",
  "pnpm run training:web:expected-failure",
  "pnpm run training:native:baseline",
]);

const ALLOWED_SETUP_COMMANDS = [
  /^pnpm install --frozen-lockfile --ignore-scripts$/,
  /^pnpm exec playwright install --with-deps chromium$/,
  /^pnpm exec expo prebuild --clean --platform android --no-install$/,
];

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(workflowName: string, message: string): never {
  throw new Error(`Training workflow validation failed: ${workflowName}: ${message}`);
}

function scalarStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(scalarStrings);
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...scalarStrings(child)]);
}

function assertForbiddenBoundary(workflowName: string, workflow: RecordValue): void {
  const scalars = scalarStrings(workflow);
  for (const value of scalars) {
    if (/\$\{\{\s*secrets\b/i.test(value) || /\bsecrets\s*(?:\.|\[)/i.test(value)) {
      fail(workflowName, "secrets context is forbidden");
    }
    if (/\b(?:cloudflare|wrangler|deploy-production)\b/i.test(value)) {
      fail(workflowName, "production deploy tooling is forbidden");
    }
    if (/\b(?:production[-_\s]+deploy|deploy[-_\s]+production)\b/i.test(value)) {
      fail(workflowName, "production deploy wording is forbidden");
    }
    if (/\bself-hosted\b/i.test(value)) fail(workflowName, "self-hosted runners are forbidden");
  }

  const visit = (value: unknown, key?: string): void => {
    if (key === "environment") fail(workflowName, "environment is forbidden");
    if (key === "permissions") {
      if (!isRecord(value)) fail(workflowName, "permissions must be an object");
      for (const [permission, setting] of Object.entries(value)) {
        if (typeof setting === "string" && /write/i.test(setting)) {
          fail(workflowName, `write permission is forbidden: ${permission}: ${setting}`);
        }
      }
    }
    if (Array.isArray(value)) {
      value.forEach((child) => visit(child));
      return;
    }
    if (isRecord(value)) {
      Object.entries(value).forEach(([childKey, child]) => visit(child, childKey));
    }
  };
  visit(workflow);
}

function normalizeCommand(command: string): string {
  return command
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(pnpm|npm|yarn|npx|bunx)\.cmd\b/, "$1");
}

function commandCandidates(run: string): string[] {
  const candidates: string[] = [];
  const commandPattern =
    /(?:^|(?:\r?\n)|(?:&&|\|\||[;&|]))\s*((?:pnpm(?:\.cmd)?\b|npm(?:\.cmd)?\b|yarn(?:\.cmd)?\b|npx(?:\.cmd)?\b|bunx(?:\.cmd)?\b|node(?:\.exe)?\b)[^\r\n;&|]*)/gim;
  for (const match of run.matchAll(commandPattern)) {
    const command = match[1];
    if (command !== undefined) candidates.push(normalizeCommand(command));
  }
  return candidates;
}

function assertAllowedRun(workflowName: string, run: string): void {
  if (/(?:^|(?:\r?\n)|[;&])\s*(?:curl|wget)\b[^\r\n]*(?:\|)\s*(?:bash|sh|zsh)\b/i.test(run)) {
    fail(workflowName, "remote script execution through a shell pipe is forbidden");
  }
  for (const command of commandCandidates(run)) {
    if (REPOSITORY_TRAINING_COMMANDS.has(command)) continue;
    if (ALLOWED_SETUP_COMMANDS.some((pattern) => pattern.test(command))) continue;
    if (/^pnpm exec\b/.test(command)) {
      fail(workflowName, `unapproved pnpm exec command: ${command}`);
    }
    if (/^pnpm run\b/.test(command)) {
      fail(workflowName, `unapproved repository command: ${command}`);
    }
    if (/^(?:npx|node(?:\.exe)?)\b/.test(command)) {
      fail(workflowName, `unapproved command runner: ${command}`);
    }
    if (/^pnpm install\b/.test(command)) {
      fail(workflowName, `unapproved pnpm install command: ${command}`);
    }
    fail(workflowName, `unapproved command: ${command}`);
  }
}

function assertRootPermissions(workflowName: string, workflow: RecordValue): void {
  const permissions = workflow.permissions;
  if (!isRecord(permissions)) fail(workflowName, "root permissions must be { contents: read }");
  const entries = Object.entries(permissions);
  if (entries.length !== 1 || entries[0]?.[0] !== "contents" || entries[0]?.[1] !== "read") {
    fail(workflowName, "root permissions must be exactly contents: read");
  }
}

export function validateTrainingWorkflow(workflowName: string, text: string): void {
  let parsed: unknown;
  try {
    parsed = parse(text);
  } catch (error) {
    fail(workflowName, `invalid YAML: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isRecord(parsed)) fail(workflowName, "workflow must be a YAML object");
  assertRootPermissions(workflowName, parsed);
  assertForbiddenBoundary(workflowName, parsed);

  const jobs = parsed.jobs;
  if (!isRecord(jobs) || Object.keys(jobs).length === 0)
    fail(workflowName, "jobs must contain at least one job");

  for (const [jobName, job] of Object.entries(jobs)) {
    if (!isRecord(job)) fail(workflowName, `job ${jobName} must be an object`);
    if (typeof job.uses === "string")
      fail(workflowName, `job ${jobName} uses an external reusable workflow`);
    const runner = job["runs-on"];
    if (typeof runner !== "string" || !APPROVED_TRAINING_RUNNERS.has(runner)) {
      fail(workflowName, `job ${jobName} must use an approved GitHub-hosted runner: ubuntu-24.04`);
    }
    const steps = job.steps;
    if (!Array.isArray(steps)) fail(workflowName, `job ${jobName} steps must be an array`);
    for (const [stepIndex, step] of steps.entries()) {
      if (!isRecord(step)) fail(workflowName, `job ${jobName} step ${stepIndex} must be an object`);
      if (step.uses !== undefined) {
        if (typeof step.uses !== "string" || !APPROVED_TRAINING_ACTIONS.has(step.uses)) {
          fail(workflowName, `unapproved action: ${String(step.uses)}`);
        }
        if (step.uses === "actions/checkout@11d5960a326750d5838078e36cf38b85af677262") {
          const checkoutOptions = step.with;
          if (!isRecord(checkoutOptions) || checkoutOptions["persist-credentials"] !== false) {
            fail(workflowName, `job ${jobName} checkout must set persist-credentials: false`);
          }
        }
      }
      if (step.run !== undefined) {
        if (typeof step.run !== "string") fail(workflowName, "step run must be a scalar string");
        assertAllowedRun(workflowName, step.run);
      }
    }
  }

  if (workflowName === "training-native-ci.yml") {
    for (const required of [
      'MAESTRO_SHA256: "b3e561161904fb391875ca5834d5b22cf0b01c052dd1b408ad83e30d8f8951b3"',
      "sha256sum --check",
      "MAESTRO_SHA256",
    ]) {
      if (!text.includes(required)) fail(workflowName, `missing checksum contract: ${required}`);
    }
  }
}
