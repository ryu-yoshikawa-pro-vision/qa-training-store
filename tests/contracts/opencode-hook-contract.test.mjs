import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import plugin from "../../.opencode/plugins/git-safety/index.js";
import { evaluateCommand, POLICY_MATRIX } from "../../.codex/hooks/pre_tool_use_policy.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

async function registerPlugin(pluginToRegister = plugin) {
  const hooks = [];
  const tools = [];
  await pluginToRegister.setup({
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

async function registerTools(pluginToRegister = plugin) {
  const { tools } = await registerPlugin(pluginToRegister);
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

  it.skipIf(process.platform === "win32")(
    "allows standard Bash scripts and lets unknown scripts reach execution",
    async () => {
      const canonicalRoot = fs.realpathSync.native(repositoryRoot);
      const standardCommands = [
        "bash scripts/verify --help",
        "bash scripts/new-run.sh --help",
        "bash scripts/collect-run-artifacts.sh --run-id 20261125-120000-JST --strict",
      ];
      const rootAnchor = `cd -- "${canonicalRoot}" && `;
      for (const command of standardCommands) {
        expect(
          evaluateCommand(`${rootAnchor}${command}`, undefined, canonicalRoot),
          command,
        ).toBeNull();
      }

      const guardedShell = (await registerTools()).get("guarded_shell");
      const result = await guardedShell.execute({ command: standardCommands[0] });
      expect(result.content).toContain("usage: bash scripts/verify");

      const unknownScriptError = await guardedShell
        .execute({ command: "bash scripts/unknown-standard-script.sh" })
        .catch((error) => error);
      expect(unknownScriptError).toBeInstanceOf(Error);
      expect(unknownScriptError.message).toContain("No such file or directory");
      expect(unknownScriptError.message).not.toMatch(/Shell safety policy denied/);
    },
  );

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
    await expect(guardedGit.execute({ args: ["push", "--all", "origin"] })).rejects.toThrow(
      /Shell safety policy denied \[G10\]: G10: bulk push destinations cannot be determined safely\./,
    );
  });

  it("runs guarded_git in a copied fixture checkout against a local bare remote", async () => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-guarded-git-fixture-"));
    let remoteRoot;
    let isolatedHome;
    const originalEnvironment = new Map();
    const rememberEnvironment = (name) => {
      if (!originalEnvironment.has(name)) originalEnvironment.set(name, process.env[name]);
    };

    try {
      remoteRoot = fs.mkdtempSync(path.join(os.tmpdir(), "opencode guarded-git-bare-"));
      isolatedHome = fs.mkdtempSync(path.join(os.tmpdir(), "opencode guarded-git-home-"));
      for (const name of Object.keys(process.env)) {
        if (name.startsWith("GIT_")) {
          rememberEnvironment(name);
          delete process.env[name];
        }
      }
      for (const [name, value] of Object.entries({
        HOME: isolatedHome,
        USERPROFILE: isolatedHome,
        XDG_CONFIG_HOME: path.join(isolatedHome, "xdg"),
      })) {
        rememberEnvironment(name);
        process.env[name] = value;
      }
      fs.mkdirSync(process.env.XDG_CONFIG_HOME, { recursive: true });

      const fixturePluginPath = path.join(
        fixtureRoot,
        ".opencode",
        "plugins",
        "git-safety",
        "index.js",
      );
      const fixturePolicyPath = path.join(
        fixtureRoot,
        ".codex",
        "hooks",
        "pre_tool_use_policy.mjs",
      );
      fs.mkdirSync(path.dirname(fixturePluginPath), { recursive: true });
      fs.mkdirSync(path.dirname(fixturePolicyPath), { recursive: true });
      fs.copyFileSync(
        path.join(repositoryRoot, ".opencode", "plugins", "git-safety", "index.js"),
        fixturePluginPath,
      );
      fs.copyFileSync(
        path.join(repositoryRoot, ".codex", "hooks", "pre_tool_use_policy.mjs"),
        fixturePolicyPath,
      );
      fs.writeFileSync(path.join(fixtureRoot, "package.json"), JSON.stringify({ type: "module" }));

      const git = (cwd, args) =>
        execFileSync("git", args, {
          cwd,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }).trim();
      git(fixtureRoot, ["config", "--global", "--add", "safe.directory", fixtureRoot]);
      git(fixtureRoot, ["config", "--global", "--add", "safe.directory", remoteRoot]);
      git(fixtureRoot, ["init", "--quiet"]);
      git(remoteRoot, ["init", "--bare", "--quiet", remoteRoot]);
      git(fixtureRoot, ["symbolic-ref", "HEAD", "refs/heads/feature/safe"]);
      git(fixtureRoot, ["config", "user.name", "OpenCode Contract"]);
      git(fixtureRoot, ["config", "user.email", "opencode-contract@example.invalid"]);
      fs.writeFileSync(path.join(fixtureRoot, "tracked.txt"), "baseline content\n");
      git(fixtureRoot, ["add", "tracked.txt"]);
      git(fixtureRoot, ["commit", "--quiet", "-m", "fixture baseline"]);
      git(fixtureRoot, ["remote", "add", "origin", remoteRoot]);
      git(fixtureRoot, ["config", "push.followTags", "false"]);
      git(fixtureRoot, ["config", "remote.origin.mirror", "false"]);
      git(fixtureRoot, ["push", "--quiet", "origin", "HEAD:refs/heads/main"]);
      git(remoteRoot, ["symbolic-ref", "HEAD", "refs/heads/main"]);
      git(fixtureRoot, [
        "push",
        "--quiet",
        "origin",
        "refs/heads/feature/safe:refs/heads/feature/safe",
      ]);
      git(fixtureRoot, ["fetch", "--quiet", "origin"]);
      git(fixtureRoot, ["symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main"]);
      expect(git(fixtureRoot, ["symbolic-ref", "refs/remotes/origin/HEAD"])).toBe(
        "refs/remotes/origin/main",
      );
      expect(git(fixtureRoot, ["branch", "--list", "main"])).toBe("");

      const fixtureLoaderPath = path.join(fixtureRoot, "load-fixture-plugin.cjs");
      fs.writeFileSync(fixtureLoaderPath, "module.exports = (moduleUrl) => import(moduleUrl);\n");
      const loadFixtureModule = createRequire(import.meta.url)(fixtureLoaderPath);
      const fixturePlugin = (await loadFixtureModule(pathToFileURL(fixturePluginPath).href))
        .default;
      const tools = await registerTools(fixturePlugin);
      const guardedGit = tools.get("guarded_git");
      const rootResult = await guardedGit.execute({ args: ["rev-parse", "--show-toplevel"] });
      expect(path.resolve(rootResult.content.trim())).toBe(
        path.resolve(fs.realpathSync.native(fixtureRoot)),
      );
      const statusResult = await guardedGit.execute({ args: ["status", "--short", "--branch"] });
      expect(statusResult.content).toContain("## feature/safe");
      await guardedGit.execute({ args: ["fetch", "origin"] });

      fs.writeFileSync(path.join(fixtureRoot, "tracked.txt"), "guarded Git integration result\n");
      await guardedGit.execute({ args: ["add", "tracked.txt"] });
      expect(git(fixtureRoot, ["diff", "--cached", "--name-only"])).toBe("tracked.txt");
      await guardedGit.execute({ args: ["commit", "-m", "guarded Git integration commit"] });
      await guardedGit.execute({ args: ["push", "origin", "HEAD:refs/heads/feature/safe"] });

      const featureRef = "refs/heads/feature/safe";
      const localHead = git(fixtureRoot, ["rev-parse", "HEAD"]);
      const remoteFeatureSha = git(fixtureRoot, ["--git-dir", remoteRoot, "rev-parse", featureRef]);
      expect(remoteFeatureSha).toBe(localHead);
      expect(
        git(fixtureRoot, ["--git-dir", remoteRoot, "show", "-s", "--format=%s", featureRef]),
      ).toBe("guarded Git integration commit");
      expect(git(fixtureRoot, ["--git-dir", remoteRoot, "show", `${featureRef}:tracked.txt`])).toBe(
        "guarded Git integration result",
      );

      const stateBeforeDeniedLocalBranchCreation = {
        head: git(fixtureRoot, ["rev-parse", "HEAD"]),
        currentBranch: git(fixtureRoot, ["branch", "--show-current"]),
        index: git(fixtureRoot, ["write-tree"]),
        localMainBranch: git(fixtureRoot, ["branch", "--list", "main"]),
        remoteRefs: git(fixtureRoot, [
          "--git-dir",
          remoteRoot,
          "for-each-ref",
          "--format=%(refname) %(objectname)",
        ]),
      };
      expect(
        evaluateCommand(
          `cd -- "${path.resolve(fs.realpathSync.native(fixtureRoot))}" && git branch main`,
          undefined,
          fixtureRoot,
        ),
      ).toMatchObject({ id: "G10", reason: expect.stringMatching(/protected branch/) });
      await expect(guardedGit.execute({ args: ["branch", "main"] })).rejects.toThrow(
        /Shell safety policy denied \[G10\].*protected branch/,
      );
      expect({
        head: git(fixtureRoot, ["rev-parse", "HEAD"]),
        currentBranch: git(fixtureRoot, ["branch", "--show-current"]),
        index: git(fixtureRoot, ["write-tree"]),
        localMainBranch: git(fixtureRoot, ["branch", "--list", "main"]),
        remoteRefs: git(fixtureRoot, [
          "--git-dir",
          remoteRoot,
          "for-each-ref",
          "--format=%(refname) %(objectname)",
        ]),
      }).toEqual(stateBeforeDeniedLocalBranchCreation);

      const stateBeforeDeniedPush = {
        head: git(fixtureRoot, ["rev-parse", "HEAD"]),
        index: git(fixtureRoot, ["write-tree"]),
        mainRef: git(fixtureRoot, ["--git-dir", remoteRoot, "rev-parse", "refs/heads/main"]),
        featureRef: remoteFeatureSha,
      };
      await expect(
        guardedGit.execute({ args: ["push", "origin", "HEAD:refs/heads/main"] }),
      ).rejects.toThrow(/Shell safety policy denied \[G10\].*protected branch/);
      expect({
        head: git(fixtureRoot, ["rev-parse", "HEAD"]),
        index: git(fixtureRoot, ["write-tree"]),
        mainRef: git(fixtureRoot, ["--git-dir", remoteRoot, "rev-parse", "refs/heads/main"]),
        featureRef: git(fixtureRoot, ["--git-dir", remoteRoot, "rev-parse", featureRef]),
      }).toEqual(stateBeforeDeniedPush);
    } finally {
      for (const [name, value] of originalEnvironment) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
      fs.rmSync(fixtureRoot, { force: true, recursive: true });
      if (remoteRoot) fs.rmSync(remoteRoot, { force: true, recursive: true });
      if (isolatedHome) fs.rmSync(isolatedHome, { force: true, recursive: true });
    }
  });

  it.skipIf(process.platform === "win32")(
    "uses PATH-selected Git for policy context and guarded_git",
    async () => {
      const originalPath = process.env.PATH;
      const markerName = "OPENCODE_TEST_PATH_SHADOW_GIT_MARKER";
      const originalPathName = "OPENCODE_TEST_PATH_SHADOW_GIT_ORIGINAL_PATH";
      const originalEnvironment = new Map(
        [
          markerName,
          originalPathName,
          ...Object.keys(process.env).filter((name) => name.startsWith("GIT_")),
        ]
          .concat("PATH")
          .map((name) => [name, process.env[name]]),
      );
      const shadowRoot = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-git-path-shadow-"));
      const markerPath = path.join(shadowRoot, "invoked");

      try {
        if (typeof originalPath !== "string" || originalPath.length === 0) {
          throw new Error("PATH is required to run the local Git fixture.");
        }
        for (const name of Object.keys(process.env)) {
          if (name.startsWith("GIT_")) delete process.env[name];
        }

        const fakeGitPath = path.join(shadowRoot, "git");
        fs.writeFileSync(
          fakeGitPath,
          [
            "#!/bin/sh",
            `printf '%s\\n' "$*" >> "$${markerName}"`,
            `PATH="$${originalPathName}"`,
            "export PATH",
            'exec git "$@"',
            "",
          ].join("\n"),
          { mode: 0o755 },
        );
        process.env.PATH = [shadowRoot, originalPath].join(path.delimiter);
        process.env[markerName] = markerPath;
        process.env[originalPathName] = originalPath;
        fs.writeFileSync(markerPath, "");
        expect(process.env.PATH.split(path.delimiter)[0]).toBe(shadowRoot);

        const canonicalRoot = fs.realpathSync.native(repositoryRoot);
        const rootAnchor = `cd -- "${canonicalRoot}" && `;
        expect(
          evaluateCommand(`${rootAnchor}git status --short --branch`, undefined, canonicalRoot),
        ).toBeNull();
        const policyInvocations = fs.readFileSync(markerPath, "utf8").split(/\r?\n/u);
        expect(
          policyInvocations.some((invocation) => invocation.includes("rev-parse --show-toplevel")),
        ).toBe(true);

        fs.writeFileSync(markerPath, "");
        const guardedGit = (await registerTools()).get("guarded_git");
        const result = await guardedGit.execute({ args: ["status", "--short", "--branch"] });
        expect(result.content).toMatch(/^## /mu);
        const guardedGitInvocations = fs.readFileSync(markerPath, "utf8").split(/\r?\n/u);
        expect(
          guardedGitInvocations.some((invocation) =>
            invocation.includes("rev-parse --show-toplevel"),
          ),
        ).toBe(true);
        expect(guardedGitInvocations).toContain("status --short --branch");
      } finally {
        for (const [name, value] of originalEnvironment) {
          if (value === undefined) delete process.env[name];
          else process.env[name] = value;
        }
        fs.rmSync(shadowRoot, { force: true, recursive: true });
      }
    },
    60000,
  );

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
