import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import plugin from "../../.opencode/plugins/git-safety.mjs";
import { POLICY_MATRIX } from "../../.codex/hooks/pre_tool_use_policy.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

async function registerHook() {
  const registrations = [];
  await plugin.setup({
    tool: {
      async hook(name, callback) {
        registrations.push({ name, callback });
      },
    },
  });

  expect(registrations).toHaveLength(1);
  expect(registrations[0].name).toBe("execute.before");
  return registrations[0].callback;
}

describe("OpenCode V2 Codex safety policy adapter", () => {
  it("registers one pre-execution hook", async () => {
    expect(plugin.id).toBe("qa-training-store.git-safety");
    const callback = await registerHook();
    expect(typeof callback).toBe("function");
  });

  it("denies representative commands from the shared Codex policy matrix", async () => {
    const callback = await registerHook();
    const cases = POLICY_MATRIX.filter(
      (item) => item.expected === "deny" && ["G1", "G7", "N1", "N3", "N4"].includes(item.id),
    );
    expect(cases.length).toBeGreaterThan(5);

    for (const item of cases) {
      expect(
        () => callback({ tool: "shell", input: { command: item.command } }),
        `${item.id}: ${item.command}`,
      ).toThrow(/Shell safety policy denied/);
    }
  });

  it("allows read-only and non-destructive commands from the same matrix", async () => {
    const callback = await registerHook();
    for (const item of POLICY_MATRIX.filter(
      (entry) => entry.expected === "allow" && ["A1", "A2", "A13"].includes(entry.id),
    )) {
      expect(() => callback({ tool: "shell", input: { command: item.command } })).not.toThrow();
    }
  });

  it("denies malformed shell input rather than skipping policy evaluation", async () => {
    const callback = await registerHook();
    for (const input of [undefined, null, {}, [], { command: 1 }, { command: "  " }]) {
      expect(() => callback({ tool: "shell", input })).toThrow(/invalid command input/);
    }
  });

  it("checks the mapped bash alias while ignoring unrelated tool events", async () => {
    const callback = await registerHook();
    expect(() => callback({ tool: "bash", input: { command: "rm sentinel.txt" } })).toThrow(
      /Shell safety policy denied/,
    );
    expect(() => callback({ tool: "read", input: { command: "rm sentinel.txt" } })).not.toThrow();
  });

  it("keeps unverified shell permissions approval-gated and secrets inaccessible", () => {
    const source = fs.readFileSync(path.join(repositoryRoot, "opencode.jsonc"), "utf8");
    const config = JSON.parse(source.replace(/,(\s*[}\]])/gu, "$1"));
    const rules = config.permissions;
    expect(Array.isArray(rules)).toBe(true);
    expect(rules[0]).toEqual({ action: "shell", resource: "*", effect: "ask" });
    expect(rules).toContainEqual({ action: "external_directory", resource: "*", effect: "ask" });
    expect(rules).toContainEqual({ action: "read", resource: "*.env", effect: "deny" });
    expect(rules).toContainEqual({ action: "read", resource: "*.env.*", effect: "deny" });
    expect(rules).toContainEqual({ action: "read", resource: "*.env.example", effect: "allow" });
    expect(rules.filter((rule) => rule.action === "shell" && rule.effect === "allow").length).toBe(
      6,
    );
  });
});
