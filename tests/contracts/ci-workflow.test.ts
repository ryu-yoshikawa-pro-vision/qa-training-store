import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

function jobBlock(jobName: string, nextJobName?: string) {
  const start = workflow.indexOf(`  ${jobName}:`);
  expect(start).toBeGreaterThanOrEqual(0);

  if (nextJobName === undefined) {
    return workflow.slice(start);
  }

  const end = workflow.indexOf(`  ${nextJobName}:`, start + 1);
  expect(end).toBeGreaterThan(start);
  return workflow.slice(start, end);
}

function stepBlock(job: string, stepName: string) {
  const start = job.indexOf(`      - name: ${stepName}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = job.indexOf("\n      - name:", start + 1);
  return job.slice(start, next === -1 ? undefined : next);
}

describe("Phase 1 CI deployment boundaries", () => {
  it("splits verification, preview deployment, and the final validate gate", () => {
    const verify = jobBlock("verify", "deploy-preview");
    const preview = jobBlock("deploy-preview", "validate");
    const validate = jobBlock("validate", "deploy-production");
    const production = jobBlock("deploy-production");

    expect(verify).toContain("if: always()");
    for (const dependency of [
      "quality",
      "vitest",
      "build-automation",
      "build-production",
      "e2e-chromium",
      "ui-review",
      "production-smoke",
      "extended-e2e",
    ]) {
      expect(verify).toContain(`      - ${dependency}`);
    }
    expect(verify).not.toContain("pnpm run");

    expect(preview).toContain("      - verify");
    expect(preview).toContain("      - build-automation");
    expect(preview).toContain("if: github.event_name == 'pull_request'");
    expect(validate).toContain("if: always()");
    expect(validate).toContain("      - verify");
    expect(validate).toContain("      - deploy-preview");
    expect(production).toContain("      - validate");
    expect(production).toContain("      - build-production");
    expect(production).toContain("github.event_name == 'push'");
    expect(production).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).not.toContain("  pr-gate:");
    expect(workflow).not.toContain("PR Gate");
  });

  it("keeps the final validate gate fail-closed for PR and non-PR events", () => {
    const validate = jobBlock("validate", "deploy-production");

    expect(validate).toContain("VERIFY_RESULT: ${{ needs.verify.result }}");
    expect(validate).toContain("DEPLOY_PREVIEW_RESULT: ${{ needs.deploy-preview.result }}");
    expect(validate).toContain('require_success "verify" "$VERIFY_RESULT"');
    expect(validate).toContain('if [[ "$EVENT_NAME" == "pull_request" ]]; then');
    expect(validate).toContain('require_success "deploy-preview" "$DEPLOY_PREVIEW_RESULT"');
    expect(validate).toContain('elif [[ "$DEPLOY_PREVIEW_RESULT" != "skipped" ]]; then');
    expect(validate).toContain(
      'echo "::error title=Unexpected Preview result::deploy-preview result was ${DEPLOY_PREVIEW_RESULT}"',
    );
  });

  it("keeps Automation and Production artifacts identical across consumers", () => {
    expect(jobBlock("build-automation", "build-production")).toContain("name: web-dist-automation");
    const automationConsumers = [
      ["e2e-chromium", "ui-review"],
      ["ui-review", "production-smoke"],
      ["deploy-preview", "validate"],
    ] as const;
    for (const [jobName, nextJobName] of automationConsumers) {
      expect(jobBlock(jobName, nextJobName)).toContain("name: web-dist-automation");
    }

    expect(jobBlock("build-production", "e2e-chromium")).toContain("name: web-dist-production");
    expect(jobBlock("production-smoke", "extended-e2e")).toContain("name: web-dist-production");
    expect(jobBlock("deploy-production")).toContain("name: web-dist-production");
  });

  it("prevents deployment and smoke jobs from rebuilding downloaded artifacts", () => {
    for (const jobName of [
      "e2e-chromium",
      "ui-review",
      "production-smoke",
      "extended-e2e",
      "deploy-preview",
      "deploy-production",
    ]) {
      const job = jobBlock(
        jobName,
        jobName === "deploy-preview"
          ? "validate"
          : jobName === "deploy-production"
            ? undefined
            : jobName === "production-smoke"
              ? "extended-e2e"
              : jobName === "extended-e2e"
                ? "verify"
                : jobName === "ui-review"
                  ? "production-smoke"
                  : "ui-review",
      );
      expect(job).toContain('PLAYWRIGHT_USE_PREBUILT_DIST: "true"');
      expect(job).not.toContain("pnpm run build:web");
    }
  });

  it("validates each deployment URL before passing it to the matching smoke test", () => {
    const preview = jobBlock("deploy-preview", "validate");
    const production = jobBlock("deploy-production");

    const deploymentJobs = [
      [
        preview,
        "Deploy Cloudflare Preview",
        "Validate preview deployment URL",
        "Smoke deployed preview",
      ],
      [
        production,
        "Deploy Cloudflare Production",
        "Validate production deployment URL",
        "Smoke deployed production",
      ],
    ] as const;

    for (const [job, deployName, urlName, smokeName] of deploymentJobs) {
      expect(job).toContain("id: deploy");
      expect(job).toContain("steps.deploy.outputs.deployment-url");
      expect(job.indexOf(urlName)).toBeGreaterThan(job.indexOf(deployName));
      expect(job.indexOf(smokeName)).toBeGreaterThan(job.indexOf(urlName));
      expect(stepBlock(job, urlName)).toContain('if [[ -z "$DEPLOYED_BASE_URL" ]]');
      expect(stepBlock(job, smokeName)).toContain(
        "DEPLOYED_BASE_URL: ${{ steps.deploy.outputs.deployment-url }}",
      );
    }
  });

  it("fails explicitly when Cloudflare credentials are missing", () => {
    const preview = jobBlock("deploy-preview", "validate");
    const production = jobBlock("deploy-production");

    for (const job of [preview, production]) {
      const credentials = stepBlock(job, "Require Cloudflare credentials");
      expect(credentials).toContain("CLOUDFLARE_API_TOKEN");
      expect(credentials).toContain("CLOUDFLARE_ACCOUNT_ID");
      expect(credentials).toContain("exit 1");
    }
    expect(workflow).not.toContain("cloudflare_available");
    expect(workflow).not.toContain("needs.validate.outputs");
  });
});
