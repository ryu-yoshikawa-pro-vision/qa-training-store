import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
const crossBrowserWorkflow = readFileSync(".github/workflows/cross-browser-smoke.yml", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  packageManager?: string;
  devDependencies?: Record<string, string>;
};
const allWorkflows = readdirSync(".github/workflows")
  .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
  .map((file) => readFileSync(join(".github/workflows", file), "utf8"))
  .join("\n");

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
  it("runs Format check before Markdown lint in the style job", () => {
    const style = jobBlock("style-quality", "code-quality");
    const format = stepBlock(style, "Format check");
    const markdown = stepBlock(style, "Markdown lint");
    const skills = stepBlock(style, "Skill package validation");
    const specification = stepBlock(style, "Specification and Agentic QA validation");
    const impact = stepBlock(style, "Specification impact summary");

    expect(format).toContain("pnpm run format:check");
    expect(markdown).toContain("pnpm run lint:markdown");
    expect(skills).toContain("pnpm run validate:skills");
    expect(specification).toContain("pnpm run validate:spec");
    expect(impact).toContain("pnpm run summarize:spec-impact");
    expect(impact).toContain("SPEC_IMPACT_EVENT_NAME");
    expect(style.indexOf("Markdown lint")).toBeGreaterThan(style.indexOf("Format check"));
    expect(style.indexOf("Skill package validation")).toBeGreaterThan(
      style.indexOf("Markdown lint"),
    );
    expect(style.indexOf("Specification and Agentic QA validation")).toBeGreaterThan(
      style.indexOf("Skill package validation"),
    );
    expect(style.indexOf("Specification impact summary")).toBeLessThan(
      style.indexOf("Format check"),
    );
    expect(style).not.toMatch(/run: pnpm run lint$/m);
    expect(style).not.toMatch(/run: pnpm run typecheck$/m);
  });

  it("runs code checks in the separate code-quality job", () => {
    const code = jobBlock("code-quality", "codex-artifact-sanitization");
    const lint = stepBlock(code, "Lint");
    const typecheck = stepBlock(code, "Typecheck");
    const manifest = stepBlock(code, "Validate image manifest");
    const security = stepBlock(code, "Security check");

    expect(lint).toContain("pnpm run lint");
    expect(typecheck).toContain("pnpm run typecheck");
    expect(manifest).toContain("pnpm run validate:image-manifest");
    expect(security).toContain("pnpm run security:check");
    expect(code.indexOf("Typecheck")).toBeGreaterThan(code.indexOf("Lint"));
    expect(code.indexOf("Validate image manifest")).toBeGreaterThan(code.indexOf("Typecheck"));
    expect(code.indexOf("Security check")).toBeGreaterThan(code.indexOf("Validate image manifest"));
    expect(code).not.toContain("pnpm run format:check");
    expect(code).not.toContain("pnpm run lint:markdown");
  });

  it("splits verification, preview deployment, and the final validate gate", () => {
    const verify = jobBlock("verify", "deploy-preview");
    const preview = jobBlock("deploy-preview", "validate");
    const validate = jobBlock("validate", "deploy-production");
    const production = jobBlock("deploy-production");

    expect(verify).toContain("if: always()");
    for (const dependency of [
      "dependency-review",
      "style-quality",
      "code-quality",
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

  it("requires both style-quality and code-quality in the final verify gate", () => {
    const verify = jobBlock("verify", "deploy-preview");

    expect(verify).toContain("      - style-quality");
    expect(verify).toContain("      - code-quality");
    expect(verify).toContain("STYLE_QUALITY_RESULT: ${{ needs.style-quality.result }}");
    expect(verify).toContain("CODE_QUALITY_RESULT: ${{ needs.code-quality.result }}");
    expect(verify).toContain('require_success "style-quality" "$STYLE_QUALITY_RESULT"');
    expect(verify).toContain('require_success "code-quality" "$CODE_QUALITY_RESULT"');
  });

  it("never lets the final gate accept only one of the two quality jobs", () => {
    const verify = jobBlock("verify", "deploy-preview");

    expect(verify).not.toContain('require_success "quality"');
    expect(verify).not.toContain("needs.quality.result");
    expect(workflow).not.toContain("  quality:");
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
    expect(validate).toContain(
      'if [[ "$PR_HEAD_REPO_FULL_NAME" == "$REPOSITORY" && "$PR_AUTHOR_LOGIN" != "dependabot[bot]" ]]; then',
    );
    expect(validate).toContain('require_success "deploy-preview" "$DEPLOY_PREVIEW_RESULT"');
    expect(validate).toContain('elif [[ "$PR_AUTHOR_LOGIN" == "dependabot[bot]" ]]; then');
    expect(validate).toContain('elif [[ "$PR_HEAD_REPO_FULL_NAME" != "$REPOSITORY" ]]; then');
    expect(validate).toContain('require_skipped "deploy-preview" "$DEPLOY_PREVIEW_RESULT"');
    expect(validate).toContain(
      'elif [[ "$EVENT_NAME" == "push" || "$EVENT_NAME" == "schedule" || "$EVENT_NAME" == "workflow_dispatch" ]]; then',
    );
  });

  it("keeps Automation and Production artifacts identical across consumers", () => {
    const automationBuild = jobBlock("build-automation", "build-production");
    expect(automationBuild).toContain("pnpm run build:spec");
    expect(automationBuild).toContain("path: output/spec-site");
    expect(automationBuild).toContain("name: spec-site-automation");
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

  it("installs Chromium without system dependencies in Chromium-only jobs", () => {
    const chromiumJobs = [
      ["e2e-chromium", "ui-review"],
      ["ui-review", "production-smoke"],
      ["production-smoke", "extended-e2e"],
      ["deploy-preview", "validate"],
      ["deploy-production", undefined],
    ] as const;

    for (const [jobName, nextJobName] of chromiumJobs) {
      const job = jobBlock(jobName, nextJobName);
      const install = stepBlock(job, "Install Chromium");

      expect(install).toContain("run: pnpm exec playwright install chromium");
      expect(job).not.toContain("pnpm exec playwright install --with-deps chromium");
    }
  });

  it("keeps extended-e2e as a mobile-Chromium-only job", () => {
    const extended = jobBlock("extended-e2e", "verify");
    const chromium = stepBlock(extended, "Install Chromium");

    expect(extended).toContain("name: Extended E2E (mobile-chromium)");
    expect(extended).not.toContain("strategy:");
    expect(extended).not.toContain("matrix:");
    expect(extended).not.toContain("matrix.browser");
    expect(extended).not.toContain("matrix.command");
    expect(extended).not.toContain("firefox");
    expect(extended).not.toContain("webkit");
    expect(extended).not.toContain("Install browser with system dependencies");
    expect(chromium).not.toContain("if:");
    expect(chromium).toContain("run: pnpm exec playwright install chromium");
    expect(chromium).not.toContain("--with-deps");
    expect(extended).toContain("run: pnpm run test:e2e:mobile");
    expect(extended).not.toContain("pnpm exec playwright install --with-deps");
    expect(extended).toContain('PLAYWRIGHT_USE_PREBUILT_DIST: "true"');
    expect(extended).not.toContain("EXPO_PUBLIC_BUILD_SHA");
    expect(extended).toContain(
      "name: playwright-mobile-chromium-${{ github.run_id }}-${{ github.run_attempt }}",
    );
  });

  it("keeps Cross Browser Smoke isolated and aligned with CI toolchain", () => {
    const nodeVersion = workflow.match(/^  NODE_VERSION: "([^"]+)"$/m)?.[1] ?? "";
    const pnpmVersion = workflow.match(/^  PNPM_VERSION: "([^"]+)"$/m)?.[1] ?? "";
    const packagePnpmVersion = packageJson.packageManager?.match(/^pnpm@(.+)$/)?.[1] ?? "";
    const packagePlaywrightVersion = packageJson.devDependencies?.["@playwright/test"] ?? "";
    const containerVersion =
      crossBrowserWorkflow.match(/image: mcr\.microsoft\.com\/playwright:v([^\s-]+)-noble/)?.[1] ??
      "";
    const jobsStart = crossBrowserWorkflow.indexOf("jobs:\n");
    const jobs = crossBrowserWorkflow.slice(jobsStart);
    const checkoutStart = crossBrowserWorkflow.indexOf("- uses: actions/checkout@");
    const nextStep = crossBrowserWorkflow.indexOf("\n      -", checkoutStart + 1);
    const checkout = crossBrowserWorkflow.slice(
      checkoutStart,
      nextStep === -1 ? undefined : nextStep,
    );
    const smokeStart = crossBrowserWorkflow.indexOf("      - name: Run Cross Browser Smoke");
    const uploadStart = crossBrowserWorkflow.indexOf(
      "\n      - name: Upload Playwright artifacts on failure",
      smokeStart + 1,
    );
    const smokeStep = crossBrowserWorkflow.slice(
      smokeStart,
      uploadStart === -1 ? undefined : uploadStart,
    );

    expect(crossBrowserWorkflow).toContain("name: Cross Browser Smoke");
    expect(crossBrowserWorkflow).toContain("schedule:");
    expect(crossBrowserWorkflow).toContain("workflow_dispatch:");
    expect(crossBrowserWorkflow).not.toContain("\n  push:");
    expect(crossBrowserWorkflow).not.toContain("\n  pull_request:");
    expect(crossBrowserWorkflow).toContain("permissions:\n  contents: read");
    expect(crossBrowserWorkflow).not.toContain("strategy:");
    expect(crossBrowserWorkflow).not.toContain("matrix:");
    expect(jobs.match(/^  [a-z0-9-]+:$/gm)).toEqual(["  cross-browser-smoke:"]);
    expect(crossBrowserWorkflow).toContain("timeout-minutes: 30");
    expect(crossBrowserWorkflow).toContain("image: mcr.microsoft.com/playwright:v1.62.0-noble");
    expect(containerVersion).toBe(packagePlaywrightVersion);
    expect(crossBrowserWorkflow).toContain(`NODE_VERSION: "${nodeVersion}"`);
    expect(crossBrowserWorkflow).toContain(`PNPM_VERSION: "${pnpmVersion}"`);
    expect(pnpmVersion).toBe(packagePnpmVersion);
    expect(checkout).toContain("persist-credentials: false");
    expect(crossBrowserWorkflow).toContain('PLAYWRIGHT_USE_PREBUILT_DIST: "true"');
    expect(crossBrowserWorkflow).toContain("EXPO_PUBLIC_BUILD_SHA: ${{ github.sha }}");
    expect(crossBrowserWorkflow.match(/pnpm run build:web/g)).toHaveLength(1);
    expect(smokeStep.match(/pnpm exec playwright test/g)).toHaveLength(1);
    expect(smokeStep).toContain("e2e/web/smoke.spec.ts");
    expect(smokeStep).toContain("--project=firefox-smoke");
    expect(smokeStep).toContain("--project=webkit-smoke");
    expect(crossBrowserWorkflow).not.toContain("playwright install");
    expect(crossBrowserWorkflow).not.toContain("--with-deps");
    expect(crossBrowserWorkflow).toContain(
      "name: playwright-cross-browser-${{ github.run_id }}-${{ github.run_attempt }}",
    );
    expect(crossBrowserWorkflow).toContain("path: output/playwright");
    expect(crossBrowserWorkflow).toContain("if-no-files-found: warn");
    expect(crossBrowserWorkflow).toContain("retention-days: 14");
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
    const checkoutMatches = [
      ...workflow.matchAll(/- uses: actions\/checkout@[0-9a-f]{40}(?=\s|$)/g),
    ];
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

  it("pins every remote workflow action to a strict 40-character commit SHA", () => {
    const remoteUses = [...allWorkflows.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)/gm)]
      .map((match) => match[1])
      .filter((ref): ref is string => ref !== undefined && !ref.startsWith("./"));

    expect(remoteUses.length).toBeGreaterThan(0);
    for (const ref of remoteUses) {
      expect(ref).toMatch(/@[0-9a-f]{40}(?=\s|$)/);
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
