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
- [x] 9. MCP再レビューを反映し、Repository固定・`gh` timeout・tool approval・300秒超smoke契約を確定する。
- [ ] 10. official MCP SDK exact versionを確定しdependency / lockfile / project MCP configを更新する。
- [ ] 11. `wait_for_required_ci` MCP serverを実装する。
- [ ] 12. CI waiter contract testとMCP integration testを実装する。
- [ ] 13. implementation harnessとBash / PowerShell verifyをMCP契約へ同期する。
- [ ] 14. focused testとRepository標準verifyを実行する。
- [ ] 15. Run Artifactをfinal commit前状態へ更新し、commit / push / PR本文を同期する。
- [ ] 16. PR #182 latest headで `wait_for_required_ci` を1回callし、実CIの長時間待機を検証する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskのcommit / push / PR / CI lifecycle: `docs/reference/codex-implementation-harness.md`
- failure時の原因分類・repair: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- Git branch / refspec / recovery: `docs/reference/git-branch-safety.md`

## Discovered（発見事項）

- `scripts/verify` と `scripts/verify.ps1` が現在のpolling禁止文言をliteralで固定している。
- `gh pr checks --watch` はcheck 0件では待機せず、`--fail-fast` はRepository必須CI以外のcheckにも反応する。
- 通常 `exec_command` はlong-running commandをlive session化し得るため、shell側のwatchだけではAgent pollingを除去できない。
- Codexはstdio MCP serverとserver単位の `tool_timeout_sec` をサポートする。upstream既定tool timeoutは300秒。
- Repository `.codex/config.toml` には現在MCP server定義がない。
- RepositoryにMCP SDK dependencyはないが、既存Zod 4.4.3は公式MCP TypeScript SDK v2のschemaに利用できる。
- 公式SDKを使えばstdio serverをprotocol手書きなしで実装できる。
- `resume` は今回の目的には不要。1回のMCP callを長時間保持する方針へ変更した。
- `repository` はtool入力から外し、project-scoped MCP serverの固定cwdから導出する。MCP serverがCodex sandbox外の `gh` 認証を使って任意Repositoryを読む境界を作らない。
- 各 `gh` 子processは30秒timeout + `GH_PROMPT_DISABLED=1` とし、1回のCLI hangでoverall timeoutが機能しなくなる状態を防ぐ。
- `wait_for_required_ci` はread-only annotationsを付け、このtoolだけ `approval_mode = "approve"` に固定する。
- `tool_timeout_sec=6000` の実効性は300秒超で確認する。実CIが5分以内なら360秒の一時smokeを使う。

## Blocked（ブロック中）

- なし。次はMCP dependency / config / server実装。Progress: 56% (9/16)。
