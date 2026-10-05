# Plan（計画）

## 目的

- PR #188 で GitHub Codespaces + OpenCode Zen + Codex CLI の開発環境を実装・検証する。
- plain Codespace → B→C checkpoint → candidate SHA → Full Rebuild → Fresh Create → final exact-head CI → credential / Codespace cleanupまで同じPRで完了する。

## 対象範囲

- In:
  - baseline main / PR head、control shell、canonical machineの固定。
  - OpenCode / Codexのlatest non-prerelease stable、target node install戦略、GitHub CLI Feature。
  - 本Runは公式catalogでFreeと確認できるOpenCode Zen modelだけを使う。Free modelのkeyless実行、root `AGENTS.md`自動適用、`.agents/skills/**` native discoveryを確認する。
  - Codex beta device auth、effective `CODEX_HOME`、Hook / subagent / `ci_wait`。
  - dotfilesを各create直前だけ一時OFFにし、作成後すぐ復元。
  - candidate SHAでFull Rebuild / Fresh Create、両環境内の`pnpm run verify`とtracked clean確認。
  - Fresh CreateでGit identity / remote / push dry-run。
  - final exact HEADのwaiter、Codex logout、Codespace stop。
  - Repository-wide quality gate failureに対する既存repair-loop。
- Out:
  - Repository側のFree / paid model制御、model固定、pricing / usage監査。本Run内のsmokeはFree-onlyとする。
  - OpenCodeへCodex Safety Harness相当を追加すること。
  - process単位のSecret broker。
  - Native toolchainのCodespaces移行。
  - 新規MCP / CI workflow。
  - merge / Codespace自動delete。

## 確定前提

- OpenCode modelはユーザー管理。本Runではユーザー方針に従い、公式catalogでFreeと確認したZen modelだけを使用する。既存選択model `muse-spark-1.3-contributor-free` をsmokeに使用する。
- OpenCode smoke processから`OPENCODE_API_KEY`を除外する。Personal Secret acceptanceは検証対象にせず、Secret設定を変更しない。
- OpenCodeはupstream default permissionを利用する。
- root `AGENTS.md`のRepository-wide規約はOpenCodeにも適用し、Codex固有のHook / wrapper / native delegation / `ci_wait`はCodexだけに適用する。
- OpenCodeは`.agents/skills/feature-plan`をnative `skill` toolからloadできることを確認する。
- `OPENCODE_API_KEY`はCodespace-wide envであり他processから参照可能。値を出力・保存しないことを境界にする。
- target devcontainerはofficial GitHub CLI Featureを持ち、`ci_wait`が使うGitHub APIへCodespaces `GITHUB_TOKEN`で接続できることを確認する。
- Codex device-code authenticationはbetaだが今回のremote/headless正規経路とする。利用不能時は公式fallbackへ進まずBlocker。
- effective `CODEX_HOME`をlogin / trust / smoke / subagent / `ci_wait`で統一する。
- Full Rebuildでは`/workspaces`と`<TEMP_ROOT>`のpersistを考慮し、Rebuild自体をauth zero-stateの証明にしない。
- validation-only Codex credentialは最終利用後に`codex logout`で削除する。
- Repository-wide gate failureは`docs/reference/repair-loop.md`へ従う。

## 進め方

- 詳細は `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md` を正本とする。
- control preflight → canonical machine → plain Codespace → B→C checkpoint → devcontainer / AGENTS / README → candidate → Phase B Codespaceをff-only同期 → Full Rebuild → Fresh Create → final記録 / push → Fresh Codespaceをfinal HEADへff-only同期 → waiter → cleanup。
- create前のdotfiles変更は短時間に限定し、`--status`と補助evidenceで未適用を確認後すぐ復元する。
- repairが環境影響ファイルへ及んだ場合はnew candidateでFull Rebuild / Fresh Createをやり直す。

## 完了条件

- canonical PlanのDoDを満たす。
- OpenCodeのRepository instructions / native Skill discoveryがPhase B / E-2 / E-3で成立する。
- target devcontainerの`gh`とrequired GitHub API connectivityが成立する。
- Full Rebuild / Fresh Createで`pnpm run verify`とtracked cleanが成立する。
- Fresh CreateでGit write credentialをdry-runで確認する。
- exact final HEADの`Web CI` / `Mobile App CI`がsuccessする。
- validation Codex credentialをlogoutしCodespaceをstopする。
- dotfiles設定が元状態である。
- merge / Codespace deleteは行わない。

## 判断記録

- `AGENTS.md`はOpenCode用に複製せず、Repository Agentへの適用境界だけ最小修正する。
- target GitHub CLIは`ghcr.io/devcontainers/features/github-cli:1`を使用する。
- canonical machineは利用可能な最小Linux machine。同じmachineをPhase B / Fresh Createで使用し、locationは契約外。
- OpenCode auth config sourceはFree-only keyless利用のため「なし」に固定する。root `opencode.json`は作成しない。
- READMEは通常利用者向け情報と正本リンクに絞り、validation内部契約を複製しない。
- Full Rebuild後の`pnpm install --frozen-lockfile`再実行は削除し、postCreate成功 + `pnpm run verify`で確認する。
- ファイル分割は行わない。candidate → Full Rebuild → Fresh Create → final CI → cleanupを単一正本で追う。

## 2026-10-05 current checkpoint

- Task 19–23 complete. Task 24 remains open because default parallel Vitest integration / repository-contract commands timed out on this Windows shell, while both suites passed using temporary `--no-file-parallelism --maxWorkers=1` flags. Individual test timeout values and test logic remain unchanged.
- Only remaining human decision before Task 24 can be completed: approve the L2 `package.json` workflow change to persist those flags in `test:integration` and `test:repository`. Approval is required by `AGENTS.md` §8. After approval, rerun the full `pnpm run verify`; then resume Task 25 if it passes.
- No candidate commit / push. Phase B Codespace stays at fixed baseline HEAD `0d554416d2e31eeda89f705dbe2a3db79492a3b6`; do not sync it before Task 26.

## 2026-10-05 17:37 JST checkpoint

- Task 19–24 complete. User approved the L2 change limited to package.json scripts test:integration and test:repository, adding --no-file-parallelism --maxWorkers=1; test logic, assertions, skip conditions, and timeout values remain unchanged.
- Both changed scripts passed individually; pnpm run verify passed all configured gates. Task 24 is complete.
- Next: Task 25 candidate commit / normal push. Recheck latest PR head and branch before mutation; freeze the candidate after push. Phase B Codespace remains at baseline 0d554416d2e31eeda89f705dbe2a3db79492a3b6 until Task 26.