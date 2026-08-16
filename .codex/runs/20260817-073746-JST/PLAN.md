# Plan

## Objective

- PR #30のレビュー結果から、実際の安全性・正しさの欠陥だけを最小差分で修正し、Required Gateと代表Windows Acceptanceを再確認する。

## Scope

- In:
  - `.codex/hooks/pre_tool_use_policy.mjs`の先頭空白、G5/G7/G9、Git context timeout、stdin UTF-8、rsync削除variantの修正。
  - `.codex/hooks/pre_tool_use_policy_windows.ps1`の並行stdout/stderr読取、有限timeout、timeout時kill、approved verb修正。
  - `scripts/codex-safe.ps1`／`scripts/verify.ps1`のexecpolicy fail-closedとPowerShell child preflight exit確認。
  - `.codex/rules/30-destructive-forbidden.rules`の明確な不足3件。
  - `tests/contracts/codex-hook-contract.test.ts`の今回のRegression追加。
  - 指定された2件の既存Run Manifestの明白な値矛盾の修正。
- Out:
  - Git parser、shell parser、wrapper／env／sudo／`git -C`等の保証拡張。
  - `codex-task`のapproval policy変更、新Dependency、framework、CI architecture、EOL再設計。
  - 過去Run Artifactの文体・監査証跡の全面整理、PRへのcommit／push。

## Assumptions

- 添付されたレビュー結果をPR #30の修正要求の正本として扱い、GitHub上の追加コメント取得は不要とする。
- 現在のHEADとEOL対策は正常な既存ベースラインとして保持する。
- Windows専用launcherテストは非Windows環境ではskipされる既存構造を維持する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。修正対象・非対象・完了条件が添付内容で明示されている。
- 仮定してよい細部: launcher timeoutはHook configの30秒未満で、5秒の短い値を採用する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `evaluateCommand()`入口で`trimStart()`し、明示された短いoptionのbundle／attached形だけを補完すれば、false positiveを増やさずレビューの回避例をdenyできる。
- H2: launcherのstdout/stderrを`ReadToEndAsync()`で同時開始し、5秒後にkillすれば、パイプ詰まりとNode無限待機を同時に解消できる。
- H3: PowerShell側で明示decisionを優先し、decision欠落時は`matchedRules == []`だけallow、それ以外をthrowすればShell側契約と一致する。

## Research Plan

- Round 1 Query: 対象実装、対象Plan、既存Contract Test、Shell側既存parser、既存Run Manifestの事実を確認する。
- Round 2 Query: 修正後にfocused test、PowerShell／Bash verify、format／lint／typecheck／security／contracts／verify、diff check、Windows代表Acceptanceを確認する。
- Exit Criteria:
  - H1〜H3を対象コードとテスト結果で支持する。
  - 添付レビューのmust-fixが残らず、非対象へscope拡張していない。

## Approach

- `code-review`で差分とレビュー要求をtriageし、`repair-loop`のbounded iterationとして修正を1回にまとめる。
- 対象ファイルだけを`apply_patch`で編集し、focused validationから全Required Gateへ進む。
- 失敗時は最初の異常を原因調査し、同一条件の無目的な再試行はしない。

## Definition of Done

- 添付レビューのmust-fix（Hook、launcher、PowerShell、verify、rules、Regression test、Run Manifest）が完了する。
- `node --check`、指定Contract Test、PowerShell／Bash verify、format／lint／typecheck／contracts／security／`pnpm run verify`、`git diff --check`がPASSする。
- Windows代表Acceptanceの実行可否と結果を記録し、Run Artifactをsanitize／schema validationする。
- 追加の不要改善、commit、pushを行わない。

## Risks / Unknowns

- Windows PowerShell 5.1でのasync stream APIとtimeout挙動が環境依存になる可能性があるため、launcherの実行テストとchild終了確認を行う。
- 既存全体Gateにベースライン／環境依存failureが出た場合は、変更差分との因果をhash・scopeで確認して分類する。
- Run Manifestのfield意味をREPORTの実績と照合し、値だけを最小修正する。

## Thinking Log

- 2026-08-17 07:37 JST: 添付レビューは修正対象と非対象を明示しているため、PR URLの外部取得やCodeRabbitコメントの機械的全採用は行わない。
- 2026-08-17 07:37 JST: 現在の作業ツリーはcleanで、PR #30相当のHook／harness実装とEOL対策はHEADに存在する。今回のRunではその上にレビュー修正だけを重ねる。
- 2026-08-17 07:37 JST: PowerShell側の現状はdecision欠落をallowへ寄せ、verifyのchild exit codeも見ていない。Shell実装が既に持つ`matchedRules == []`条件へ合わせる。
- 2026-08-17 08:28 JST: Windows Full Access代表Acceptanceを新しいHook／launcher／Rulesで一時clone＋local bare remote上に再実行し、ALLOW 4系統とDENY 5系統の実測を取得した。製品worktreeのGit stateは変更していない。
- 2026-08-17 08:30 JST: full `verify`／`test:contracts`は、`.artifacts`に保持されたEOL用temporary cloneが通常のVitest／ESLint探索へ含まれ、stale `scored-v1.json` 2件と既存lint 2件を出した。現行tracked範囲のContract 30 files／347 testsと、`.artifacts`除外ESLintはPASSしたため、無関係なcloneやglobal設定を修正せずartifact baselineとして記録する。
