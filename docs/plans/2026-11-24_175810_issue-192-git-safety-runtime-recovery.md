# Git安全性診断と通常操作の復旧計画

## 0. 依頼概要

- 依頼内容: G10の診断を改善し、Codex sandboxとの原因区別、通常のGit CLI復旧手順、迂回防止、OpenCode共通契約、回帰検証を整備する。
- 背景: PR #199 / #229で、G10の実行前拒否と`.git`へのsandbox書込み拒否が続けて発生し、PR #229ではGitHub APIによるcommit/ref更新が代替経路に使われた。
- 期待成果: 現行のGit安全判定を維持しながら、承認された通常Git操作が実際に動作することを隔離fixtureと対象Codex実行経路で確認する。Issue #192を再利用し、新しい専用PRへ結果をまとめる。

## 1. ゴール / 完了条件

- ゴール: G10診断・読み取り専用環境診断・復旧文書・契約テストを、CodexとOpenCodeで一貫させる。
- 完了条件:
  - G10 ID、許可/拒否結果、G1-G9/N1-N4、protected branch、force-push、destructive-operationの契約を維持する。
  - G10のroot anchor不足、相対path、別checkout、Git/root/branch context未解決を安全な静的reasonで区別する。既存reasonで十分なpush曖昧性・protected branch・禁止形式はdecision IDと診断をテストで固定する。
  - `diagnose:hooks`はcheckout、Git directory/common directory、Git version、worktreeと設定上のHook状態を読み取り専用で示し、runtime・trust・sandbox/approval状態を推測せず未確認と表示する。
  - Git safety referenceへエラー分類、anchor付き例、checkout移行、復旧、API迂回禁止を反映し、実装と例の整合を取る。
  - OpenCodeは既存の`evaluateCommand()`、guarded tools、built-in shell deny、fail-closedを維持する。
  - 隔離fixtureでHook判定と実際のGit add/commit/fetch/local bare remote pushを確認し、拒否ケースでfixtureのHEAD/index/refが不変であることを確認する。
  - Hook/diagnostics/OpenCodeの契約テスト、品質ゲート、独立セキュリティレビュー、PR必須CIを確認する。
  - Git commit/pushはanchor付きの通常Git CLIだけを使い、GitHub APIによるcommit/ref更新やforce pushを行わない。

## 2. 現状理解と前提

- GitHub mainと`origin/main`は`b8beb9f05db93acd509ca4c35741a7dbab1b4ccd`。PR #199/#229は触らない。
- Issue #192はOPENでG10のcheckout contextを扱う。PR #227は既にmainへmerge済みで、OpenCodeの共通判定adapterを含む。重複Issueを作らずIssue #192を関連Issueとして再利用する。
- 作業branch `fix/issue-192-git-safety-runtime-recovery` は確認済みmainから通常Git CLIで作成済み。既存のPR #229用未追跡Run資料は保全し、stage対象にしない。
- 現行G10は直接Hook checkout rootへのliteral absolute anchorを要求する。decisionの範囲・評価順は変更しない。reasonだけを十分な範囲で具体化し、同じcheckoutへrealpath解決する既存許可も変えない。
- project `.codex/config.toml`は`sandbox_mode = "workspace-write"`、`approval_policy = "on-request"`、network access=true。ユーザーは`approval_policy`だけを変更することを明示承認した。Codex 0.172.0 CLIのhelpには`--approve-for-me`と`--ask-for-approval on-request`がある。managed toolの承認付き実行でanchor付きGit操作は成功したが、この設定変更だけで`.git`へのruntime書込みが可能になったとは扱わない。
- OpenCodeの既定ログ先への起動は`EROFS`で失敗したが、XDG config/data/log pathを`/tmp`へ設定した起動で`opencode v2.3.0`を確認した。Plugin entrypointのロード、`guarded_git`によるstatus、組み込みshell経由の危険操作拒否を観測した。live `guarded_git` add/commit/push、trust、現在のsession permissionは未確認で、実Git経路はOpenCode contract testのlocal bare remoteで検証する。
- `.codex/config.toml`ではユーザー承認済みの`approval_policy`変更だけを行い、`workspace-write`、network access、`writable_roots`、Hook設定は維持する。rollbackは同じ一項目を`never`に戻す。AGENTS.mdは別途追記予定との指示に従い変更しない。

## 3. 非目標

- 製品SUT、QA教材、Expo、PR #199/#229、main、既存PR #227への変更。
- G10などの安全判定緩和、Hook無効化、bypass、`.git`の権限変更。
- GitHub API/GitHub MCP/REST/GraphQL/Git library経由のcommit、tree/blob作成、branch/ref更新。
- PR #199またはPR #229のmerge/close、force push、branch削除。
- Codex/OpenCode全体のHookまたはGit framework再設計。

## 4. 影響範囲

- 安全性レイヤー: `.codex/hooks/pre_tool_use_policy.mjs`、必要に応じ既存のWindows companion/共通Hook契約。
- 診断・契約: `scripts/diagnose-codex-hooks.mjs`、Codex Hook / diagnostics / OpenCode contract tests。
- 運用文書: `docs/reference/git-branch-safety.md`、必要最小限の`codex-safety-harness.md`、`codex-implementation-harness.md`、`opencode-v2-safety.md`。
- CI: 既存Hook diagnostics、Codex Windows Hook、contracts、quality/security workflow。既存gateは削除・skipしない。

## 5. 変更方針

1. 現行main・Issue #192、checkout/Git/worktree、Codex/OpenCode runtime情報、公式設定仕様を照合する。
2. 変更前の`diagnose:hooks`、`test:hooks`とdecision matrix結果を記録する。
3. G10 reasonを分類して静的文言だけを改善する。path、command全文、remote URL、token、環境変数、生payloadをreasonへ含めない。Hook判定は追加のGit変更操作・shell実行をしない。
4. 既存診断CLIへread-only Git/checkout情報を追加し、オフライン診断とruntime検証を明確に分ける。trust・sandbox・approvalはCLIの表示/利用者確認が必要な未確認項目として扱う。
5. Git safety referenceに拒否原因の分類と停止/復旧手順を集約し、他のreferenceは正本への参照と短い境界説明だけを追加する。
6. 既存testsへreasonとno-mutationのassertionsを追加し、隔離temporary repoとlocal bare remoteで実際のGit CLI経路を検証する。
7. OpenCode adapterとWindows/WSL契約の回帰を確認する。実OpenCodeやWindows/WSL hostが使えない場合は未確認と記録し、CI証拠と混同しない。
8. 独立セキュリティレビュー後、対象ファイルを明示してstageし、anchor付き通常Git CLIでcommit/pushし、PR #192を参照する新規PRの最新HEAD CIを確認する。

## 6. 検証方法

- Baseline / focused: `pnpm run diagnose:hooks`、`pnpm run test:hooks`。
- After change: `pnpm run test:hooks`、`pnpm run test:contracts`、追加した隔離Git CLI fixture。
- Quality/security: `pnpm run format:check`、`pnpm run lint:markdown`、`pnpm run lint:text`、`pnpm run lint:text:all`、`pnpm run lint`、`pnpm run typecheck`、`pnpm run security:check`、`git diff --check`、`pnpm run verify`。
- CI: 新PRの最新HEADでCodex Hook contract、Windows Hook contract、OpenCode Hook contract、diagnostics、security/quality、Web/Mobileおよび他の必須checkを確認する。
- 成功判定: 正のGit CLI fixtureがadd/commit/local pushを実際に行い、negative fixtureは対象状態を変更しない。decision matrixのallow/deny IDがbaselineと一致し、要求されたCIが最新HEADで成功する。

## 7. リスクと未解決論点

- reason評価順に手を加えると同じ拒否で優先理由が変わり得るため、拒否時点とdecision IDは固定し、理由生成だけに絞る。
- `diagnose:hooks`は設定ファイル検査であり、runtime発火・trust・sandbox実効状態を証明しない。表示と文書の両方で境界を明示する。
- `workspace-write`では`.git`保護が別途作用する。`on-request`の設定値だけで実効runtime設定や`.git`書込み可否を証明しない。通常Git CLIのadd/commit/pushを承認付きで実行し、通った範囲を記録する。
- OpenCodeのlive add/commit/pushは未確認であり、隔離contract testと分けて報告する。Codex CLIはLinux/WSL2を通常実行環境とし、Windows Nativeの対話runtime検証は通常受入対象にしない。Windows固有Hook/PowerShell経路は既存Windows CI contractで確認する。

## 8. 成果物

- 既存Issue #192を参照するmain基点の専用branch/PR。
- G10 diagnostics、read-only hook diagnosis、Git recovery/anti-bypass guidance、contract testとRun Artifact。

## 9. 備考

- Harness improvement target: 安全性レイヤー、診断・実行レイヤー、Git safety reference。Strictness: `strict`。
- Evidence: PR #229 Run `runs/20261124-150110-JST/REPORT.md`にあるG10拒否とGitHub API代替経路、現在のproject sandbox設定、Codex CLI 0.172.0、今回のanchor付きbranch作成成功。
- owner decision: ユーザーの本依頼により、この範囲の診断・文書・テスト・Hook変更は実装対象。Codex approval/sandbox設定の永続変更は別途明示承認が必要。
