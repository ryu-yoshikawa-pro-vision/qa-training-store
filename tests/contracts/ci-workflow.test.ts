import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
const validate = workflow.slice(
  workflow.indexOf("  validate:"),
  workflow.indexOf("  deploy-preview:"),
);
const preview = workflow.slice(
  workflow.indexOf("  deploy-preview:"),
  workflow.indexOf("  deploy-production:"),
);
const production = workflow.slice(workflow.indexOf("  deploy-production:"));

function stepBlock(job: string, stepName: string) {
  const start = job.indexOf(`      - name: ${stepName}`);
  const next = job.indexOf("\n      - name:", start + 1);
  return job.slice(start, next === -1 ? undefined : next);
}

describe("Phase 1 CI deployment boundaries", () => {
  it("keeps deployed smoke out of validate and validates a production build after automation E2E", () => {
    expect(validate).not.toContain("DEPLOYED_BASE_URL");
    expect(validate).not.toContain("Deployed smoke");
    expect(validate).toContain("Production web build validation");
    expect(validate.indexOf("Production web build validation")).toBeGreaterThan(
      validate.indexOf("Accessibility smoke"),
    );
  });

  it("runs the focused Mobile staff boundary E2E for pull requests and every validate event", () => {
    const boundaryStep = stepBlock(validate, "Mobile staff boundary E2E");

    expect(boundaryStep).toContain("run: pnpm run test:e2e:mobile-boundary");
    expect(boundaryStep).not.toContain("if:");
    expect(validate.indexOf("Mobile staff boundary E2E")).toBeGreaterThan(
      validate.indexOf("Accessibility smoke"),
    );
    expect(stepBlock(validate, "Mobile Chromium E2E")).toContain(
      "if: ${{ github.event_name != 'pull_request' }}",
    );
  });

  it("smokes the exact preview deployment after the deploy step", () => {
    expect(preview).toContain("github.event_name == 'pull_request'");
    expect(preview).toContain("needs.validate.outputs.cloudflare_available == 'true'");
    expect(preview).toContain("id: deploy");
    expect(preview).toContain("steps.deploy.outputs.deployment-url");
    expect(preview.indexOf("Validate preview deployment URL")).toBeGreaterThan(
      preview.indexOf("Deploy Cloudflare Preview"),
    );
    expect(preview.indexOf("Smoke deployed preview")).toBeGreaterThan(
      preview.indexOf("Validate preview deployment URL"),
    );
    expect(stepBlock(preview, "Validate preview deployment URL")).toContain(
      'if [[ -z "$DEPLOYED_BASE_URL" ]]',
    );
  });

  it("smokes the exact production deployment after a production build and deploy", () => {
    expect(production).toContain("github.ref == 'refs/heads/main'");
    expect(production).toContain("needs.validate.outputs.cloudflare_available == 'true'");
    expect(production).toContain("EXPO_PUBLIC_BUILD_KIND: production");
    expect(production).toContain("steps.deploy.outputs.deployment-url");
    expect(production.indexOf("Validate production deployment URL")).toBeGreaterThan(
      production.indexOf("Deploy Cloudflare Production"),
    );
    expect(production.indexOf("Smoke deployed production")).toBeGreaterThan(
      production.indexOf("Validate production deployment URL"),
    );
    expect(stepBlock(production, "Validate production deployment URL")).toContain(
      'if [[ -z "$DEPLOYED_BASE_URL" ]]',
    );
  });
});
