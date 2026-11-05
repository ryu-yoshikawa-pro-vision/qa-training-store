import { expect, it } from "vitest";
import { runCaptured } from "../../scripts/training/ai-assisted-qa-assessment.mjs";

const run = (source, overrides = {}) =>
  runCaptured(process.execPath, ["-e", source], {
    cwd: process.cwd(),
    timeoutMs: 3_000,
    maxBytes: 1_024,
    ...overrides,
  });

it("captures stdout, stderr, and the nonzero child exit independently", async () => {
  const result = await run(
    'process.stdout.write("answer"); process.stderr.write("diagnostic"); process.exitCode = 7;',
  );
  expect(result.stdout).toBe("answer");
  expect(result.stderr).toBe("diagnostic");
  expect(result.exitCode).toBe(7);
});

it("rejects a terminated child on timeout rather than accepting a partial response", async () => {
  await expect(run("setTimeout(() => {}, 10_000);", { timeoutMs: 200 })).rejects.toThrow(
    /exceeded the time limit/,
  );
});

it("rejects oversized stdout even when the child continues running", async () => {
  const source = 'process.stdout.write("x".repeat(2048)); setTimeout(() => {}, 10_000);';
  await expect(run(source, { maxBytes: 128 })).rejects.toThrow(/exceeded the size limit/);
});

it.skipIf(process.platform === "win32")("rejects missing executables on POSIX", async () => {
  const command = "__missing_opencode_assessment_binary__";
  await expect(
    runCaptured(command, ["--version"], {
      cwd: process.cwd(),
      timeoutMs: 1_000,
      maxBytes: 128,
    }),
  ).rejects.toThrow(/required executable could not start/);
});
