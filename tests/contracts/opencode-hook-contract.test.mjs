import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import plugin from "../../.opencode/plugins/git-safety/index.js";
import { POLICY_MATRIX } from "../../.codex/hooks/pre_tool_use_policy.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

async function registerPlugin() {
  const hooks = [];
  const tools = [];
  await plugin.setup({
    tool: {
      async hook(name, callback) {
        hooks.push({ name, callback });
      },
      async transform(callback) {
        const editor = {
          list: () => tools,
          add(tool) {
            tools.push(tool);
          },
          update() {},
          remove() {},
          namespace() {},
        };
        callback(editor);
        return { dispose: async () => {} };
      },
    },
  });
  return { hooks, tools };
}

async function registerHook() {
  const { hooks } = await registerPlugin();
  expect(hooks).toHaveLength(1);
  expect(hooks[0].name).toBe("execute.before");
  return hooks[0].callback;
}

async function registerTools() {
  const { tools } = await registerPlugin();
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  expect(byName.has("guarded_shell")).toBe(true);
  expect(byName.has("guarded_git")).toBe(true);
  return byName;
}

const CONTEXT_INDEPENDENT_DENIALS = POLICY_MATRIX.filter(
  (item) => item.expected === "deny" && ["G1", "G7", "N1", "N3", "N4"].includes(item.id),
);

describe("OpenCode V2 Codex safety policy adapter", () => {
  it("registers one pre-execution hook and two guarded execution tools", async () => {
    expect(plugin.id).toBe("qa-training-store.git-safety");
    const callback = await registerHook();
    expect(typeof callback).toBe("function");
    const tools = await registerTools();
    for (const name of ["guarded_shell", "guarded_git"]) {
      expect(typeof tools.get(name).execute).toBe("function");
      expect(tools.get(name).options).toEqual({ codemode: true });
    }
  });

  it("denies representative commands from the shared Codex policy matrix", async () => {
    const callback = await registerHook();
    expect(CONTEXT_INDEPENDENT_DENIALS.length).toBeGreaterThan(5);

    for (const item of CONTEXT_INDEPENDENT_DENIALS) {
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

  it("refuses dangerous commands in guarded_shell before any execution", async () => {
    const tools = await registerTools();
    const guardedShell = tools.get("guarded_shell");
    for (const item of CONTEXT_INDEPENDENT_DENIALS) {
      await expect(guardedShell.execute({ command: item.command }), `${item.id}`).rejects.toThrow(
        /Shell safety policy denied/,
      );
    }
  });

  it("fails closed on invalid guarded_shell and guarded_git input", async () => {
    const tools = await registerTools();
    for (const input of [undefined, null, {}, { command: 1 }, { command: "  " }]) {
      await expect(tools.get("guarded_shell").execute(input)).rejects.toThrow(
        /invalid command input/,
      );
    }
    for (const args of [undefined, null, [], "git status", [1, 2]]) {
      await expect(tools.get("guarded_git").execute({ args })).rejects.toThrow(/non-empty array/);
    }
  });

  it("refuses dangerous git argument arrays in guarded_git before any execution", async () => {
    const tools = await registerTools();
    const guardedGit = tools.get("guarded_git");
    const dangerous = [
      ["reset", "--hard", "HEAD"],
      ["push", "--force", "origin", "feature"],
      ["clean", "-fd"],
      ["branch", "-D", "old-feature"],
    ];
    for (const args of dangerous) {
      await expect(guardedGit.execute({ args }), args.join(" ")).rejects.toThrow(
        /Shell safety policy denied/,
      );
    }
  });

  it("uses the V2 auto-discovered plugin directory instead of an unsupported file path", () => {
    expect(fs.existsSync(path.join(repositoryRoot, ".opencode/plugins/git-safety/index.js"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(repositoryRoot, ".opencode/plugins/git-safety.mjs"))).toBe(
      false,
    );
    const source = fs.readFileSync(path.join(repositoryRoot, "opencode.jsonc"), "utf8");
    const config = JSON.parse(source.replace(/,(\s*[}\]])/gu, "$1"));
    expect(config.plugins).toBeUndefined();
  });

  it("denies built-in shell by default with no allow exceptions, even under autoaccept", () => {
    const source = fs.readFileSync(path.join(repositoryRoot, "opencode.jsonc"), "utf8");
    const config = JSON.parse(source.replace(/,(\s*[}\]])/gu, "$1"));
    const rules = config.permissions;
    expect(Array.isArray(rules)).toBe(true);
    expect(rules[0]).toEqual({ action: "shell", resource: "*", effect: "deny" });
    expect(rules.filter((rule) => rule.action === "shell" && rule.effect === "allow")).toHaveLength(
      0,
    );
    expect(rules.filter((rule) => rule.action === "shell" && rule.effect === "ask")).toHaveLength(
      0,
    );
    expect(rules).toContainEqual({ action: "external_directory", resource: "*", effect: "ask" });
    expect(rules).toContainEqual({ action: "read", resource: "*.env", effect: "deny" });
    expect(rules).toContainEqual({ action: "read", resource: "*.env.*", effect: "deny" });
    expect(rules).toContainEqual({ action: "read", resource: "*.env.example", effect: "allow" });
  });
});
