# Tasks（タスク）

## Now（現在）

- [x] 1. RepositoryのCI lifecycle正本とroot導線を確認する。
- [x] 2. Bash / PowerShell verifyのsemantic contractを確認する。
- [x] 3. `gh pr checks --watch` のregistration race / fail-fast範囲を確認する。
- [x] 4. Codex `exec_command` のlong-running live session経路を確認する。
- [x] 5. `codex exec resume` 案を調査し、今回の要件には過剰と判断する。
- [x] 6. Codex MCP `tool_timeout_sec` とstdio MCP server設定を確認する。
- [x] 7. 公式MCP TypeScript SDK v2 stableと既存Zod 4の利用方針を確認する。
- [x] 8. 保存Plan / Run PLANをMCP方式へ更新する。
- [x] 9. MCP再レビューを反映し、ローカルGitによるRepository identity固定、subdirectory起動、optional MCP startup grace、GitHub認証env継承、poll中PR guard、read-only GET、run識別、`gh` timeout、tool approval、dependency起動前提、waiter利用不能時のfail-closed、長時間smoke契約を確定する。
- [x] 10. `AGENTS.md` のL3対象であることとrollback planを提示し、ユーザーの明示承認を確認する。未承認なら実装を開始しない。
- [x] 11. official MCP SDK exact versionを確定し、`@modelcontextprotocol/server` / test専用 `@modelcontextprotocol/client` を同じexact v2 stable versionで追加して、lockfile / `mcp:ci-wait` script / project MCP config（startup grace・timeouts・GitHub auth env継承）を更新する。
- [x] 12. 公式SDK v2の `serveStdio` を使い、serverが受信したrequest-scoped AbortSignalをsleep / `gh` child processへ伝播する `wait_for_required_ci` MCP serverを実装する。
- [x] 13. CI waiter contract testとMCP integration testを実装する。stdio integrationはtest専用 `@modelcontextprotocol/client` の `Client` / `StdioClientTransport` を使い、tool listing / mocked tool call / request cancellationを検証する。独自MCP clientは実装しない。
- [x] 14. fresh Codex processで、既に終端状態のexact HEADに対して `scripts/codex-safe.*` と `scripts/codex-task.*` の両経路から `wait_for_required_ci` を実callする。どちらか一方でも失敗したらblockerとして停止する。
- [x] 15. runtime gate通過後だけimplementation harnessとBash / PowerShell verifyをMCP契約へ同期する。
- [x] 16. focused testとRepository標準verifyを実行する。
- [ ] 17. Run Artifactをfinal commit前状態へ更新し、commit / push / PR本文を実装結果へ同期する。
- [ ] 18. dependency install後のfresh Codex processでPR #182 latest headへ `wait_for_required_ci` を1回callし、必要なら360秒smokeも実行して長時間待機を検証する。installed Codexからcancelした際のserver側AbortSignal伝播は実測できた範囲を記録し、未伝播／未確認でもこの点単独ではblockerにしない。repairでMCP execution surfaceを変更した場合はfresh Codex processを起動し直して再検証する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskのcommit / push / PR / CI lifecycle: `docs/reference/codex-implementation-harness.md`
- failure時の原因分類・repair: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- Git branch / refspec / recovery: `docs/reference/git-branch-safety.md`

## Discovered（発見事項）

- `scripts/verify` と `scripts/verify.ps1` が現在のpolling禁止文言をliteralで固定している。
- `gh pr checks --watch` はcheck 0件では待機せず、`--fail-fast` はRepository必須CI以外のcheckにも反応する。
- 通常 `exec_command` はlong-running commandをlive session化し得るため、shell側のwatchだけではAgent pollingを除去できない。
- Codexはstdio MCP serverとserver単位の `tool_timeout_sec` をサポートする。既定値はversion依存として扱い、今回の契約は明示値 `6000` に固定する。
- Repository `.codex/config.toml` には現在MCP server定義がない。
- RepositoryにMCP SDK dependencyはないが、既存Zod 4.4.3は公式MCP TypeScript SDK v2のschemaに利用できる。production serverとstdio integration testには別packageが必要なため、`@modelcontextprotocol/server` とtest専用 `@modelcontextprotocol/client` を同じexact versionで追加する。
- 公式SDKを使えばstdio serverをprotocol手書きなしで実装できる。
- `resume` は今回の目的には不要。1回のMCP callを長時間保持する方針へ変更した。
- `repository` はtool入力から外す。Repository identityはMCP server process起動時に `git remote get-url origin` からローカルに1回だけ導出してprocess内へ固定し、startup中にGitHub APIを呼ばず、tool call中にGit remoteを再解決しない。PRの `base.repo.full_name` も固定Repositoryと照合する。
- 各 `gh` 子processは30秒timeout + `GH_PROMPT_DISABLED=1` とし、1回のCLI hangでoverall timeoutが機能しなくなる状態を防ぐ。
- `wait_for_required_ci` はread-only annotationsを付け、このtoolだけ `approval_mode = "approve"` に固定する。
- MCP server登録、tool approval、GitHub credential利用、Harness変更は `AGENTS.md` のL3に該当するため、実装前に明示承認とrollback planが必要。
- tool catalogへの掲載だけでは不十分。`codex-safe` と `codex-task` の両方から実tool callが成立することをHarness切替前のruntime gateにする。
- workflow runは `ci.yml` / `native-ci.yml` を直接指定し、exact head + pull_request event + PR番号が一致したrunだけを採用する。
- GitHub accessは `gh api --method GET` に統一し、`-f` / `-F` 使用時も暗黙POSTへ切り替えない。
- run statusは `status != completed` を一律待機、`completed + success` を成功、`completed + non-success` を失敗とする。
- MCP dependency追加後は `pnpm install --frozen-lockfile` 済みのfresh Codex processでstartup / tool catalogを検証する。
- MCP起動は `node --run mcp:ci-wait` とし、Repository root / subdirectoryの両方でroot package scriptを解決できることを確認する。
- optional MCPの初回tool catalog登録は `mcp_optional_startup_grace_ms = 5000` / `startup_timeout_sec = 5` で検証する。
- registration / completionの各pollでPR base Repository / OPEN state / exact headを共通guardとして再確認する。
- `GH_TOKEN` / `GITHUB_TOKEN` はMCP `env_vars` で名前だけ継承し、secret値は保存・ログ出力しない。
- 360秒smokeは長時間callのsanity checkであり、90分保持の実証には使わない。
- `wait_for_required_ci` がfresh Codex processのtool catalogに存在しない、またはMCP startupが失敗した場合はblockerとし、Agent側のGitHub pollingへfallbackしない。setup修復後はfresh Codex processで再確認する。
- MCP SDK v2のrequest-scoped `ctx.mcpReq.signal` をsleep / `gh` child processへ伝播し、serverがcancellationを受信した場合の追加pollを停止する。installed Codexからstdio MCP requestへのcancel伝播は固定前提にせずruntimeで確認する。未伝播／未確認でもoverall timeout 90分があるため、この点単独ではblockerにしない。
- `.codex/config.toml`、`mcp:ci-wait` script、MCP SDK / lockfile、`scripts/mcp/ci-wait-server.mjs` のいずれかをrepair・変更した後はfresh Codex processでtool availability / 実callを再確認する。Product codeだけのrepairではこの理由による再起動は不要。
- 2026-09-24 23:34 JST時点ではPR #182 branchはlatest `main` に対してbehind 0だった。
- 2026-09-25 08:43 JST時点ではmainがその後1 commit進みbehind 1。今回のmain側変更はapplication/domain境界の実装・文書で、`package.json` / `pnpm-lock.yaml` / MCP対象ファイルは含まれないため、このPlan修正では追加mergeを行わない。実装開始時にbase差分を再確認する。
- `output/` は`.gitignore`で生成物として扱われ、challenge patch適用済みtraining-copyのtestがsource test discoveryへ混入していた。Repository共通Vitest `test.exclude` に`**/output/**`を追加し、既存ignored outputを残したまま`test:unit` 13 files / 66 testsがPASSした。

## Blocked（ブロック中）

- 現在blockerなし。以前のverify失敗は共通test discoveryの除外漏れが原因であり、ユーザー承認を受けた`vitest.config.ts` 1行の追加後、同じworkspace上のRepository標準verify全体がPASSした。
- 残作業: Task 17のRun Artifact最終確定・commit / push・PR metadata同期、およびTask 18の最新headでのMCP CI waitと条件該当時のsmoke。
- Progress: 89% (16/18)
