import type { TestControlService } from "@/test-controls/test-control-service";
import { installTestApi, isTestApiBuild } from "@/test-controls/test-api.web";

describe("web test API build boundary", () => {
  it.each(["local", "automation"])("is enabled for %s builds", (buildKind) => {
    expect(isTestApiBuild(buildKind)).toBe(true);
  });

  it.each(["public", "production", "preview", "unknown", ""])(
    "is not exposed for %s builds",
    (buildKind) => {
      expect(isTestApiBuild(buildKind)).toBe(false);
    },
  );

  it("does not install window.__TEST_API__ for production builds", () => {
    delete window.__TEST_API__;

    expect(installTestApi({} as TestControlService, "production")).toBeNull();
    expect(window.__TEST_API__).toBeUndefined();
  });
});
