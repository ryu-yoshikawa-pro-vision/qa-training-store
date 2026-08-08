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
  it("runs the Markdown quality gate before code linting", () => {
    const quality = jobBlock("quality", "codex-artifact-sanitization");
    const format = stepBlock(quality, "Format check");
    const markdown = stepBlock(quality, "Markdown lint");
    const lint = stepBlock(quality, "Lint");

    expect(format).toContain("pnpm run format:check");
    expect(markdown).toContain("pnpm run lint:markdown");
    expect(lint).toContain("pnpm run lint");
    expect(quality.indexOf("Markdown lint")).toBeGreaterThan(quality.indexOf("Format check"));
    expect(quality.indexOf("Lint")).toBeGreaterThan(quality.indexOf("Markdown lint"));
  });

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
    expect(preview).toContain("github.event_name == 'pull_request'");
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

  it("prevents intentional skips from propagating while blocking failed deploy prerequisites", () => {
    const preview = jobBlock("deploy-preview", "validate");
    const production = jobBlock("deploy-production");

    // PRs allow extended-e2e=skipped through verify, then evaluate Preview explicitly.
    expect(preview).toContain("always()");
    expect(preview).toContain("github.event_name == 'pull_request'");
    expect(preview).toContain("needs.verify.result == 'success'");
    expect(preview).toContain("needs.build-automation.result == 'success'");
    expect(preview).toContain("      - verify");
    expect(preview).toContain("      - build-automation");

    // On main Push, deploy-preview=skipped is accepted by validate and must not skip Production.
    expect(production).toContain("always()");
    expect(production).toContain("github.event_name == 'push'");
    expect(production).toContain("github.ref == 'refs/heads/main'");
    expect(production).toContain("needs.validate.result == 'success'");
    expect(production).toContain("needs.build-production.result == 'success'");
    expect(production).toContain("      - validate");
    expect(production).toContain("      - build-production");
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
      const deployment = stepBlock(
        job,
        job === preview ? "Deploy Cloudflare Preview" : "Deploy Cloudflare Production",
      );
      expect(credentials).toContain("CLOUDFLARE_API_TOKEN");
      expect(credentials).toContain("CLOUDFLARE_ACCOUNT_ID");
      expect(credentials).toContain("Cloudflare credentials are required.");
      expect(credentials).toContain("exit 1");
      expect(deployment).toContain("apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}");
      expect(deployment).toContain("accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}");
      expect(job).not.toContain("\n      CLOUDFLARE_API_TOKEN:");
      expect(job).not.toContain("\n      CLOUDFLARE_ACCOUNT_ID:");
    }
    expect(workflow).not.toContain("cloudflare_available");
    expect(workflow).not.toContain("needs.validate.outputs");
  });

  it("keeps checkout credentials disabled and avoids leaking Cloudflare secrets to unrelated steps", () => {
    const checkoutMatches = [...workflow.matchAll(/- uses: actions\/checkout@v4/g)];
    expect(checkoutMatches.length).toBeGreaterThan(0);
    for (const match of checkoutMatches) {
      const start = match.index!;
      const nextStep = workflow.indexOf("\n      -", start + match[0].length);
      const checkout = workflow.slice(start, nextStep === -1 ? undefined : nextStep);
      expect(checkout).toContain("persist-credentials: false");
    }

    for (const [jobName, nextJobName, artifactStep, smokeStep] of [
      ["deploy-preview", "validate", "Download automation artifact", "Smoke deployed preview"],
      ["deploy-production", undefined, "Download production artifact", "Smoke deployed production"],
    ] as const) {
      const job = jobBlock(jobName, nextJobName);
      for (const stepName of [
        "Install dependencies",
        artifactStep,
        "Install Chromium",
        smokeStep,
      ]) {
        expect(stepBlock(job, stepName)).not.toContain("CLOUDFLARE_");
      }
    }
  });

  it("validates the untrusted Preview branch and reuses the declared UI Review stage", () => {
    const preview = jobBlock("deploy-preview", "validate");
    const uiReview = jobBlock("ui-review", "production-smoke");

    expect(stepBlock(preview, "Validate Preview branch name")).toContain("^[A-Za-z0-9._/-]+$");
    expect(uiReview).toContain(
      "path: output/ui-review/${{ env.UI_REVIEW_STAGE }}/${{ matrix.viewport }}",
    );
    expect(uiReview).toContain(
      "name: ui-review-${{ matrix.project }}-${{ github.run_id }}-${{ github.run_attempt }}",
    );
    expect(uiReview).toContain("if-no-files-found: warn");
    expect(uiReview).toContain("retention-days: 14");
  });
});
