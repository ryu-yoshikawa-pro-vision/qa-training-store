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

describe("Phase 1 CI deployment boundaries", () => {
  it("keeps deployed smoke out of validate and validates a production build after automation E2E", () => {
    expect(validate).not.toContain("DEPLOYED_BASE_URL");
    expect(validate).not.toContain("Deployed smoke");
    expect(validate).toContain("Production web build validation");
    expect(validate.indexOf("Production web build validation")).toBeGreaterThan(
      validate.indexOf("Accessibility smoke"),
    );
  });

  it("smokes the exact preview deployment after the deploy step", () => {
    expect(preview).toContain("github.event_name == 'pull_request'");
    expect(preview).toContain("needs.validate.outputs.cloudflare_available == 'true'");
    expect(preview).toContain("id: deploy");
    expect(preview).toContain("steps.deploy.outputs.deployment-url");
    expect(preview.indexOf("Smoke deployed preview")).toBeGreaterThan(
      preview.indexOf("Deploy Cloudflare Preview"),
    );
  });

  it("smokes the exact production deployment after a production build and deploy", () => {
    expect(production).toContain("github.ref == 'refs/heads/main'");
    expect(production).toContain("needs.validate.outputs.cloudflare_available == 'true'");
    expect(production).toContain("EXPO_PUBLIC_BUILD_KIND: production");
    expect(production).toContain("steps.deploy.outputs.deployment-url");
    expect(production.indexOf("Smoke deployed production")).toBeGreaterThan(
      production.indexOf("Deploy Cloudflare Production"),
    );
  });
});
