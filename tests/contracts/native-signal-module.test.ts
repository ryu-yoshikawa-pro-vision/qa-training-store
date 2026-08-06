import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Native signal module resolution", () => {
  it("keeps the platform implementation independent from its own platform alias", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/test-controls/native-signals.native.ts"),
      "utf8",
    );

    expect(source).toContain('from "./native-signal-names"');
    expect(source).not.toContain('from "./native-signals"');
  });
});
