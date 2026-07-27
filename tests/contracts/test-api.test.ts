import { isTestApiBuild } from "@/test-controls/test-api.web";

describe("web test API build boundary", () => {
  it.each(["local", "automation"])("is enabled for %s builds", (buildKind) => {
    expect(isTestApiBuild(buildKind)).toBe(true);
  });

  it.each(["public", "production", "preview", ""])("is not exposed for %s builds", (buildKind) => {
    expect(isTestApiBuild(buildKind)).toBe(false);
  });
});
