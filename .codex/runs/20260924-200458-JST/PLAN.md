# Plan（計画）

## Objective（目的）

- push後のCI待機を1回のMCP tool callへ委譲し、CI待機中のAgent/LLMによる状態確認反復をなくす。
- exact HEADの `Web CI` / `Mobile App CI` が終端状態になった時だけtool resultを同じCodex turnへ返す。
- 同じbranch / PR #182でPlan修正からMCP実装、検証まで完了する。

## Scope（対象範囲）

- In:
  - project-scoped stdio MCP server
  - `wait_for_required_ci` tool
  - Codex MCP `tool_timeout_sec`
  - exact HEADの `Web CI` / `Mobile App CI` read-only監視
  - MCP SDK dependency
  - contract test
  - implementation harness / Bash / PowerShell verify同期
  - PR #182での実CI待機検証
- Out:
  - `codex exec resume`
  - Codex再起動supervisor
  - webhook / queue / daemon
  - GitHub Actions workflow変更
  - GitHub write操作
  - Product code
  - merge

## Assumptions（仮定）

- 削減対象はCI待機中のモデル推論であり、MCP server内部のGitHub API pollingは許容する。
- MCP serverはexisting `gh` authenticationをread-onlyで利用する。
- Repositoryはproject-scoped MCP serverの固定cwdから導出し、model入力にしない。
- 各 `gh` 子processは30秒でtimeoutし、`GH_PROMPT_DISABLED=1` で非対話化する。
- 公式 `@modelcontextprotocol/server` v2 stableをexact versionでdevDependencyへ追加する。
- Planの正本は `docs/plans/2026-09-24_200458_ci-wait-without-agent-polling.md` とする。

## Questions / Ambiguity（質問・曖昧性）

- ユーザーへ確認が必要な不透明点: なし。
- 実装gate:
  - project configからstdio MCP serverがinstalled Codex / Windows hostで起動すること。
  - `tool_timeout_sec=6000` が300秒を超える長時間callへ適用されること。
  - 実CIが5分以内なら360秒の一時smokeで300秒超の保持を確認すること。
  - MCP call待機中にAgentへ途中turnが戻らないこと。
  - tool result後に同じCodex turnが継続すること。
- 上記が成立しなければMCP方式を完了扱いにせずblockerとして停止する。

## Research Plan（調査計画）

- Repository: `.codex/config.toml`、implementation harness、verify、Web CI / Mobile App CI。
- Dependency: official MCP TypeScript SDK v2 stable、Node requirement、license。
- Codex: stdio MCP config、`tool_timeout_sec`、project-scoped config。
- GitHub: exact head workflow run取得とrun status / conclusion。
- Exit Criteria:
  - MCP serverの起動契約が確定する。
  - CI waiterの入力 / 出力 / timeout / failure契約が確定する。
  - model-side pollingなしを実地検証できる。

## Approach（進め方）

- 公式SDKで1 toolだけのstdio MCP serverを作る。
- MCP protocolは独自実装しない。
- GitHub操作は `gh api` read-only GETだけにし、Repositoryは固定cwdから導出する。
- 各 `gh` 呼び出しに30秒timeoutと `GH_PROMPT_DISABLED=1` を適用する。
- `wait_for_required_ci` はread-only annotationsを付け、このtoolだけ `approval_mode = "approve"` に固定する。
- tool内部でregistration waitとworkflow waitを行う。
- tool結果を受け取ったCodexがsuccess / repair-loop / blockerへ進む。
- resume / supervisorへfallbackしない。

## Definition of Done（完了条件）

- 保存PlanのDoDをすべて満たす。
- Codexから `wait_for_required_ci` を1回callできる。
- CI待機中にAgent pollingが発生しない。
- latest headの `Web CI` / `Mobile App CI` を正しく判定する。
- PR #182が実装・検証結果まで含む。
- Repository標準verifyがPASSする。

## Risks / Unknowns（リスク・未知点）

- Host側にMCP `tool_timeout_sec` より短い固定timeoutがある可能性。
- project-relative MCP server pathのWindows解決。
- MCP serverがCodex sandbox外で `gh` authへアクセスするため、Repository固定・read-only操作・子process timeoutが必要。
- MCP tool approvalを自動化するため、tool単位のapprovalとread-only annotationsを一致させる必要。
- 新規MCP SDK dependency追加。

## Thinking Log（判断記録）

- 初版の `gh pr checks --watch` shell待機はCodex `exec_command` live session pollingを残し得るため撤回した。
- supervisor + `codex exec resume` 案は、Codex processを終了・再起動する必要があり今回の要件より複雑なため撤回した。
- ユーザー想定どおり「1回のtool call内部でCIを待ち、終了時に同じLLM turnへ返す」方式を採用する。
- CodexがMCP tool単位のtimeoutを持ち、公式MCP TypeScript SDKがstdio serverを提供するため、repo-local MCP serverを実装方針とした。
