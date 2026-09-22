import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/security-dependency-fallback.yml", "utf8");

function jobBlock(jobName: string, nextJobName?: string) {
  const start = workflow.indexOf("  " + jobName + ":");
  expect(start).toBeGreaterThanOrEqual(0);
  if (nextJobName === undefined) return workflow.slice(start);
  const end = workflow.indexOf("  " + nextJobName + ":", start + 1);
  expect(end).toBeGreaterThan(start);
  return workflow.slice(start, end);
}

function stepBlock(job: string, stepName: string) {
  const start = job.indexOf("      - name: " + stepName);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = job.indexOf("\n      - name:", start + 1);
  return job.slice(start, next === -1 ? undefined : next);
}

function heredocNodeScript(block: string, occurrence = 0) {
  const marker = "node --input-type=module <<'NODE'\n";
  let start = -1;
  let from = 0;
  for (let index = 0; index <= occurrence; index += 1) {
    start = block.indexOf(marker, from);
    expect(start).toBeGreaterThanOrEqual(0);
    from = start + marker.length;
  }
  const end = block.indexOf("\n          NODE", from);
  expect(end).toBeGreaterThan(from);
  return block.slice(from, end).replace(/^ {10}/gm, "");
}

function runNodeScript(script: string, env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, ["--input-type=module"], {
    input: script,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

describe("Security dependency fallback advisory contract", () => {
  it("uses the alert-specific vulnerability and the Global Advisory response schema", () => {
    const readAlert = jobBlock("read-alert", "opencode-edit");
    const readStep = stepBlock(readAlert, "Read and sanitize public security context");
    const script = heredocNodeScript(readStep);
    const directory = mkdtempSync(join(tmpdir(), "security-fallback-read-alert-"));
    const alertFile = join(directory, "alert.json");
    const advisoryFile = join(directory, "advisory.json");
    const contextFile = join(directory, "context.json");
    const openPrsFile = join(directory, "open-prs.json");

    const alert = {
      state: "open",
      dependency: {
        package: { ecosystem: "npm", name: "example-package" },
        manifest_path: "pnpm-lock.yaml",
      },
      security_advisory: { ghsa_id: "GHSA-aaaa-bbbb-cccc" },
      security_vulnerability: {
        package: { ecosystem: "npm", name: "example-package" },
        vulnerable_version_range: ">= 1.0.0, < 1.2.3",
        first_patched_version: { identifier: "1.2.3" },
      },
    };
    const advisory = {
      ghsa_id: "GHSA-aaaa-bbbb-cccc",
      vulnerabilities: [
        {
          package: { ecosystem: "npm", name: "example-package" },
          vulnerable_version_range: "< 0.9.0",
          first_patched_version: "0.9.0",
        },
        {
          package: { ecosystem: "npm", name: "example-package" },
          vulnerable_version_range: ">= 1.0.0, < 1.2.3",
          first_patched_version: "1.2.3",
        },
      ],
    };

    try {
      writeFileSync(alertFile, JSON.stringify(alert));
      writeFileSync(advisoryFile, JSON.stringify(advisory));
      writeFileSync(openPrsFile, "[]");
      const result = runNodeScript(script, {
        ALERT_FILE: alertFile,
        ADVISORY_FILE: advisoryFile,
        CONTEXT_FILE: contextFile,
        OPEN_PRS_FILE: openPrsFile,
        API_URL: "https://api.github.com",
        REPOSITORY: "example/repository",
        GITHUB_TOKEN: "test-token",
      });

      expect(result.status).toBe(0);
      expect(JSON.parse(readFileSync(contextFile, "utf8"))).toMatchObject({
        dependency: "example-package",
        ecosystem: "npm",
        ghsa_id: "GHSA-aaaa-bbbb-cccc",
        vulnerable_range: ">= 1.0.0 < 1.2.3",
        first_patched_version: "1.2.3",
      });

      writeFileSync(
        advisoryFile,
        JSON.stringify({
          ...advisory,
          vulnerabilities: advisory.vulnerabilities.map((entry) => ({
            ...entry,
            first_patched_version: "9.9.9",
          })),
        }),
      );
      const mismatch = runNodeScript(script, {
        ALERT_FILE: alertFile,
        ADVISORY_FILE: advisoryFile,
        CONTEXT_FILE: join(directory, "mismatch-context.json"),
        OPEN_PRS_FILE: openPrsFile,
        API_URL: "https://api.github.com",
        REPOSITORY: "example/repository",
        GITHUB_TOKEN: "test-token",
      });
      expect(mismatch.status).not.toBe(0);
      expect(mismatch.stderr).toContain("needs_human:advisory_vulnerability_entry_ambiguous");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }

    expect(readAlert).toContain("alert.security_vulnerability");
    expect(readAlert).toContain("entry.package?.ecosystem === ecosystem");
    expect(readAlert).toContain("(entry.first_patched_version ?? null) === firstPatchedVersion");
    expect(readAlert).not.toContain('entry.ecosystem === "npm"');
  });

  it("rechecks the alert-specific vulnerability and Global Advisory entry before publish", () => {
    const publish = jobBlock("publish");
    const recheck = stepBlock(publish, "Recheck alert advisory and duplicate branch conditions");
    const alertScript = heredocNodeScript(recheck, 0);
    const advisoryScript = heredocNodeScript(recheck, 1);
    const directory = mkdtempSync(join(tmpdir(), "security-fallback-publish-"));
    const authFile = join(directory, "authorization.json");
    const alertFile = join(directory, "alert.json");
    const advisoryFile = join(directory, "advisory.json");
    const auth = {
      dependency: "example-package",
      ecosystem: "npm",
      ghsa_id: "GHSA-aaaa-bbbb-cccc",
      vulnerable_range: ">= 1.0.0 < 1.2.3",
      first_patched_version: "1.2.3",
    };
    const alert = {
      state: "open",
      dependency: { package: { ecosystem: "npm", name: "example-package" } },
      security_advisory: { ghsa_id: "GHSA-aaaa-bbbb-cccc" },
      security_vulnerability: {
        package: { ecosystem: "npm", name: "example-package" },
        vulnerable_version_range: ">= 1.0.0, < 1.2.3",
        first_patched_version: { identifier: "1.2.3" },
      },
    };
    const advisory = {
      ghsa_id: "GHSA-aaaa-bbbb-cccc",
      vulnerabilities: [
        {
          package: { ecosystem: "npm", name: "example-package" },
          vulnerable_version_range: "< 0.9.0",
          first_patched_version: "0.9.0",
        },
        {
          package: { ecosystem: "npm", name: "example-package" },
          vulnerable_version_range: ">= 1.0.0, < 1.2.3",
          first_patched_version: "1.2.3",
        },
      ],
    };

    try {
      writeFileSync(authFile, JSON.stringify(auth));
      writeFileSync(alertFile, JSON.stringify(alert));
      writeFileSync(advisoryFile, JSON.stringify(advisory));

      expect(runNodeScript(alertScript, { AUTH_FILE: authFile, ALERT_FILE: alertFile }).status).toBe(0);
      expect(
        runNodeScript(advisoryScript, { AUTH_FILE: authFile, ADVISORY_FILE: advisoryFile }).status,
      ).toBe(0);

      writeFileSync(
        alertFile,
        JSON.stringify({
          ...alert,
          security_vulnerability: {
            ...alert.security_vulnerability,
            vulnerable_version_range: ">= 2.0.0, < 2.1.0",
          },
        }),
      );
      const changedAlert = runNodeScript(alertScript, {
        AUTH_FILE: authFile,
        ALERT_FILE: alertFile,
      });
      expect(changedAlert.status).not.toBe(0);
      expect(changedAlert.stderr).toContain("needs_human:publish_alert_vulnerability_changed");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }

    expect(recheck).toContain("entry.package?.ecosystem === auth.ecosystem");
    expect(recheck).toContain("(entry.first_patched_version ?? null) === auth.first_patched_version");
    expect(recheck).not.toContain("entries[0].first_patched_version?.identifier");
  });

  it("keeps the workflow_dispatch alert number out of step env logs", () => {
    const readAlert = jobBlock("read-alert", "opencode-edit");
    const publish = jobBlock("publish");

    expect(workflow).not.toContain('ALERT_NUMBER: ${{ inputs.alert_number }}');
    expect(readAlert).toContain("process.env.GITHUB_EVENT_PATH");
    expect(publish).toContain("process.env.GITHUB_EVENT_PATH");
    expect(workflow).toContain("needs_human:alert_input_read_failed");
  });
});
