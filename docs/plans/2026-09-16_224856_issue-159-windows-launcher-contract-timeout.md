# Issue #159 Windows launcher contract test timeout 対応計画

## 0. 依頼概要

- 依頼内容: Windowsローカルでtimeoutするlogging launcher contractとStop launcher fallback contractを、Issue #159の前提と現行`origin/main`を基準に調査・修正・検証する。
- 背景: loggingは同一sessionで5イベント、Stop fallbackは4 failure condition×6 caseの同期launcherを実行する。単一processの異常か正常起動の累積かは未確定である。
- 期待成果: 原因をprocess単位の実測で説明し、contractとHook semanticsを維持した必要最小限の修正、Windowsローカル検証、既存CI確認を完了する。

## 1. ゴール / 完了条件

- ゴール: Issue #159の2件について、修正前の再現境界・launcher invocation・fixture/cleanup・ローカル/CI差を確認し、原因に対応した変更だけを入れる。
- 完了条件（DoD）:
  - 指定branch、最新`origin/main`、clean status、依存条件をRun Artifactへ記録する。
  - 修正前のfocused/file単体結果と、logging 5回・Stop fallback各scenarioの診断実測を記録する。
  - timeoutが累積か単一process異常か、loggingとStopが同一原因か別原因かを判定する。
  - production Hookを変更する場合は単一launcherまたはHookの異常を実測で示す。test-onlyの場合はproduction変更を行わない。
  - 必要な回帰testを維持または追加し、temporaryなtiming/debug codeは最終差分から除去する。
  - focused、対象2 file、`scripts/verify.ps1 -HookContracts`、`pnpm run test:contracts` 3回、`pnpm run verify`、指定lint/diff checkを実行する。
  - 最新commitの既存Web CI / Mobile App CIとWindows jobを確認し、未確認事項を明記する。

## 2. 現状理解と前提

- Current understanding:
  - `issue-159-windows-launcher-contract-timeout`は固有commitを持たず、`HEAD`を`origin/main`（`b9087bd93df12a26e7a28a6bd3fe0aebc77acf3d`）へfast-forward同期した。
  - logging対象testは`runConfiguredLoggingHook()`からWindows設定commandを5回同期実行し、同一JSONLのevent順序を確認する。test-local timeoutは`15000ms`。
  - Stop対象testは`runConfiguredQualityHook()`をmissing Hook、repository root failure、non-zero Hook、module load failureについて、inactive・invalid state 2種・active・malformed 2種の計6回ずつ、最大24回同期実行する。test-local timeoutは`30000ms`。
  - 現行launcherは`.codex/config.toml`の`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ...`で、logging/StopのHookと`ComSpec`経路を使う。
  - 修正前の指定focused実行はこの環境では現時点でPASSした。Issue当時のtimeoutが再現しない可能性を含め、複数回測定して扱う。
  - 診断計測3回ではlogging 5 invocation合計が約1.805–1.806秒、Stop 24 invocation合計が約10.671–10.719秒。全invocationはstatus 0、signalなし、error codeなしで、Stopのfailure condition別合計は約2.106–3.138秒。fixture作成は約0.285–0.320秒、cleanupは約0.018–0.021秒だった。
  - Issue本文に記録された修正前のfile wall timeはlogging 22.444秒（test-local 15秒）、Stop 63.663秒（test-local 30秒）。現在のprocess単位実測では単一launcher異常はなく、正常な同期launcher累積に対するtest aggregate headroom不足と判定する。
- Assumptions:
  - 現在のWindows環境で直接測定できるものを事実とし、Defender、scheduler、filesystem、runner差は実測なしに原因と断定しない。
  - 診断用のtest helper変更は一時的に許容し、測定後に除去する。
  - GitHub Actions確認にPRが必要な場合、既存branch/PR状態を確認した上でRepository harnessの条件に従う。
- Non-goals:
  - global timeout、retry、skip、flaky指定、assertion削除、contract削減、production Hookの一般最適化。
  - `PreToolUse` policy、matcher、fail-closed semantics、logging redaction/fallback、Stop active/inactive semanticsの変更。
  - PR #155範囲、Skill description、Trigger Eval dataset/runner/evaluator、AGENTS.md routingの変更。
  - 新しいprocess framework、依存関係、汎用wrapperの追加。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。Issue本文、対象branch、完了条件、変更禁止範囲が明示されている。
- 仮定してよい細部: 原因に応じたtest-local timeout値、または共通launcher修正の具体的な最小形は実測後に決定する。
- 未回答の重要質問: 修正前測定で単一process異常が確認されるか、CIとlocalの差をどの境界まで実測できるか。

## 4. 影響範囲

- Impacted areas: Windows configured launcher、logging/Stop contract test helper、test-local timeout、CI Windows contract job、Run Artifact。
- Files to inspect:
  - `tests/contracts/codex-hook-contract.test.ts`
  - `tests/contracts/codex-text-quality.test.ts`
  - `.codex/config.toml`
  - `.codex/hooks/log_event.mjs`
  - `.codex/hooks/text_quality_gate.mjs`
  - `.codex/hooks/pre_tool_use_policy_windows.ps1`
  - `scripts/verify`, `scripts/verify.ps1`
  - `.github/workflows/ci.yml`
  - `docs/adr/0020-codex-windows-logging-hook-launcher.md`
  - `docs/adr/0021-codex-current-shell-hook-launcher-compatibility.md`
  - `docs/adr/0026-codex-text-quality-gate.md`

## 5. 変更方針

- Change strategy:
  1. 修正前のfocused/file単体を同一commandで再確認し、timeout・exit code・Vitest所要時間を記録する。
  2. Node/PowerShell/ComSpec/Git/pnpm等の環境値を記録し、test helperの外側からlauncher invocationを無害なメタデータだけで計測する。
  3. launcher合計とfixture/cleanupがtest時間を説明できるかを確認し、必要な場合だけ内部境界を追加計測する。
  4. 累積ならcontract意味を保つ対象test-localの最小変更（logging 30秒、Stop 90秒）、単一process異常なら共通原因の最小修正を選ぶ。production runtime timeoutとの関係も確認する。
  5. 回帰検証を実行し、診断専用コードを除去してRun Artifactへ測定値と判断を保存する。
- 実行タスク:
  - [x] 1. Issue、branch、main差分、関連コード/ADR/CI、Runを固定する。
  - [x] 2. 修正前focused/file単体とWindows環境情報を取得する。
  - [x] 3. logging 5 invocation、Stop fallback各scenario、fixture/cleanupの時間を測定する。
  - [x] 4. 原因を分類し、必要最小限の実装・回帰testを行う。
  - [x] 5. temporary計測を除去してローカル品質ゲートを完走する。
  - [ ] 6. commit/push後、最新headの必須CIを確認する。

## 6. 検証方法

- Validation plan:
  - 修正前後で指定focused combined、logging単体、Stop単体を同一条件で比較する。
  - 修正後に対象2 fileのfocused実行、`.\scripts\verify.ps1 -HookContracts`、`pnpm run test:contracts` 3回連続、`pnpm run verify`を実行する。
  - `pnpm run lint:markdown`、`pnpm run lint:text`、`git diff --check`、Run Artifact sanitizer Write/Checkを実行する。
  - GitHub Actionsの最新headについてWindows Hook contract、Vitest contracts、Web CI全体、Mobile App CIを確認する。
- 成功判定: 対象contractが指定条件でPASSし、5/24回のsemantics・redaction・fallbackが維持され、品質ゲートと必須CIが最新headで成功すること。未実行はPASSと記録しない。

## 7. リスクと未解決論点

- Risks:
  - 現在非再現のままtimeoutだけを変更すると、実原因を隠す。
  - 5回/24回の正常な累積を単一launcher異常と誤認するとproduction変更が過剰になる。
  - `EncodedCommand`をbase64文字列として直接編集するとlauncher契約を壊す。
  - 診断ログへpayload、secret、session ID、absolute path、stdout/stderr本文を混入させない。
- Open questions:
  - localと`windows-latest`で実測可能なprocess/fixture境界差。
  - timeout変更が必要な場合の正常分布と余裕幅。
  - CI確認に利用できる既存PRの有無。

## 8. 成果物

- 変更ファイル: 実測で必要と判定された対象test/config/Hookのみ、およびRun Artifact。
- 付随ドキュメント: 本Plan、同一Runの`PLAN.md`/`TASKS.md`/`REPORT.md`。

## 9. 備考

- ADRは維持すべき契約と変更理由の確認に使い、現行`origin/main`の実装を優先する。
- `main`への直接commit/push、merge、force push、branch削除、Issue closeは行わない。
