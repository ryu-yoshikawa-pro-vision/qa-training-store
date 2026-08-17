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

## Follow-up Repair

- 2026-08-17 12:55 JST: ユーザーの追加指示を受け、前回の残存failureを再調査した。原因はtemporary cloneの内容ではなく、rootのESLint／VitestがGit管理外の`.artifacts`まで探索していたことだった。
- 追加方針: temporary cloneを変更・削除せず、`eslint.config.js`と`vitest.config.ts`で`.artifacts/**`だけを探索除外する。これは無視対象の作業成果物を品質Gateへ混入させないための最小の共有設定修正である。
- 追加検証のExit Criteria: `pnpm run lint`、`pnpm run test:contracts`、`pnpm run verify`がexit 0となり、既存のHook／PowerShell／Bash検証も再確認できること。

## Follow-up Repair — 2026-08-17 14:54 JST

- Input findings: PR #30最新レビューで指定された、通常Git表現のdeny漏れとVitest default exclude置換の2テーマ。
- Triage: 2テーマとも安全性・正しさ・品質Gateに直結するため`must_fix`。env／wrapper／Git parser全体、依存、無関係なCodeRabbit指摘は`defer`／`reject`。
- Allowed files: `.codex/hooks/pre_tool_use_policy.mjs`、`tests/contracts/codex-hook-contract.test.ts`、`vitest.config.ts`、active Run Artifact。
- Repair plan: 操作別short-option patternを拡張し、`--force-create=<branch>`と`HEAD`／`@`のcurrent branch解決を追加する。Contract Matrixとcontext testを追加し、Vitestは`configDefaults.exclude`へ`.artifacts/**`だけを追加する。
- Validation exit criteria: focused Hook Contract、format／lint／typecheck／security／全Contract／`pnpm run verify`、Windows／Bash verify、diff checkが成功すること。
- User instruction: このiterationでは品質Gate成功後に新規commitを作成し、feature branchへ通常pushする。新PRは作成しない。

## Follow-up Repair — 2026-08-17 15:23 JST

- Input findings: G5の`git switch -f`／`--force`／`-qf`と、`git checkout -Btarget`／`-qBtarget`のdeny漏れ。
- Triage: 5表現のdenyと既存allow回帰の維持を`must_fix`とし、Git parser化、short option全網羅、wrapper／env／sudo、Vitest設定、依存追加、無関係な整理は`defer`／`reject`。
- Allowed files: `.codex/hooks/pre_tool_use_policy.mjs`、`tests/contracts/codex-hook-contract.test.ts`、active Run Artifactのみ。
- Repair plan: switch専用の`-f` bundle／`--force`判定と、checkout専用のattached `-B`判定を追加し、focused regression tableへ指定5ケースを追加する。
- Validation exit criteria: focused Contract、Required Gate、Windows verify、diff checkが全て成功し、変更ファイルが実装2ファイルとactive Run Artifactだけであること。

## Follow-up Repair — 2026-08-17 19:26 JST

- Input findings: CodeRabbit再レビューで、`mv -if`など最終的にforceが有効になる上書きモード順序のN2判定漏れと、active Runの`evaluation.json`におけるscope_controlの評価単位の曖昧さが指摘された。
- Triage: effective forceの安全判定とscope証跡の誤解防止を`must_fix`とする。shell／Git parser化、過去Run Artifact全面修正、D1／D2のcheckbox化、protected operation共通化、docstring、依存追加、無関係な指摘は`defer`／`reject`。
- Allowed files: `.codex/hooks/pre_tool_use_policy.mjs`、`tests/contracts/codex-hook-contract.test.ts`、`.codex/runs/20260817-073746-JST/evaluation.json`、`.codex/runs/20260817-073746-JST/REPORT.md`、active Runの`PLAN.md`のみ。
- Repair plan: `mv`専用の小さなeffective-mode helperで`f`／`i`／`n`と対応long optionの最後のモードだけを評価し、focused regressionへ指定deny／allowを追加する。`evaluation.json`のscope_controlは最新repair iterationのproduct差分とactive Run累積`run.json.changed_files`を明示的に分離する。
- Validation exit criteria: Node syntax、focused Hook Contract、direct N2 behavior、Required Gate、Windows verify、diff／artifact sanitizer／evaluation schema validationが成功し、D1／D2と非対象ファイルを変更しないこと。

## Follow-up Repair — 2026-08-17 20:12 JST

- Input findings: `evaluateMvForce()`が`-T`／`-b`／`--verbose`などの通常optionを見つけると後続のforce option走査を終了し、`--`以降もoptionとして扱う残存漏れ。active Runの`evaluation.json`が前回N2 iterationの実績を参照している。
- Triage: 通常option前置後のeffective force検出、`--`境界、N2代表case、focused regression、最新validation実績へのevaluation同期を`must_fix`とする。GNU getopt完全実装、shell／Git parser化、wrapper／env／sudo、過去Run整理、CodeRabbit再レビュー、D1／D2変更、dependency、unrelated refactorは`defer`／`reject`。
- Allowed files: `.codex/hooks/pre_tool_use_policy.mjs`、`tests/contracts/codex-hook-contract.test.ts`、`.codex/runs/20260817-073746-JST/PLAN.md`、`REPORT.md`、`evaluation.json`のみ。`TASKS.md`は変更しない。
- Repair plan: `mv`専用helperで未知の短／長optionをmode変更なしで読み飛ばし、`--`でmode走査を停止する。N2代表caseを1件だけmatrixへ追加し、focused regressionへ指定3 denyと`--` false-positive回帰を追加する。全Validation後にevaluationの5 dimensionsを最新実績へ同期する。
- Exit criteria: focused Contract、Required Gate、Windows verify、CI確認可能な範囲、diff／artifact sanitizer／evaluation schema validationが成功し、通常commit／push後にHEADとupstreamが一致すること。CodeRabbitへの再レビュー依頼は行わない。
