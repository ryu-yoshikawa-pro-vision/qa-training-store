# Plan

## Objective

- 既存Plan `docs/plans/2026-09-12_220014_codex-hook-quality-gates.md` のTask 6を、textlint v15の公式Node APIとユーザー指定の6個の候補ruleへ接続し、dry-run結果に基づきproduction採用を確定する。
- Task 7〜9の開始時baseline、fingerprint比較、rename/move、PostToolUse、Stop、local/CI比較、Windows/Unix経路を維持する。

## Scope

- In:
  - `textlint`とproduction採用rule packageをdevDependencyとして追加し、lockfileへ固定する。
  - root `.textlintrc.json`をstandard日本語ruleの正本として追加する。
  - custom scannerを維持したまま、textlint結果を既存Violation/fingerprint形式へ統合する。
  - repository rootを基準にtextlint設定を解決し、process-local linter cacheを使う。
  - textlint候補ruleのconfig、baseline、新規差分、rename、nested cwd、failure境界を既存contractへ追加する。
  - Plan、正本文書のうち実装と食い違う箇所、Run Artifact、PR本文を更新する。
  - dry-run、focused/aggregate検証、commit/push、PRの最新head CI確認を行う。
- Out:
  - preset、prh、AI/形態素/辞書判定、style ruleの追加。
  - `.codex/text-quality-rules.json`へのtextlint rule複製。
  - baseline/rename/session manager/framework/Hook trust/runtime compactの再設計。
  - 既存Markdown全件の修正、Product code・Playwright・AGENTS.md・SessionStartの変更。

## Assumptions

- Node.js 22.20.0のlocal環境とCI Node.js 24は、確認済みのtextlint要求Node.js `>=20.18.0`を満たす。
- `lint:text`は既存の`check-text-quality-changes.mjs`入口を維持し、textlint統合をその内部へ伝播する。
- textlintが返す問題範囲から元本文の安定したmatchを取得できないruleは、無理にproductionへ残さず除外する。
- 今回ユーザーが具体的に確定した6 ruleの採否は、dry-run/contractの結果に従って最終確定する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。依存、rule、非目標、完了条件、PR/Issue状態は依頼本文と既存Planで指定されている。
- 仮定してよい細部: 現在のESM/Node実行環境に合わせ、必要なscan呼び出しだけをasync化する。既存命名へ合わせて統合関数名を決める。
- 未回答の重要質問: なし。実装中に判明するAPI差異やruleの範囲取得不能は未完了事項として記録する。

## Hypotheses

- H1: textlint v15の`loadTextlintrc`/`createLinter`/`lintText`でroot固定の設定読込とprocess-local reuseを実装できる。
- H2: ユーザー指定6候補ruleのうち、Markdown parserの既存責務と競合せず、各messageからstable matchを復元できるruleだけをproduction採用できる。
- H3: textlint初期化/scan failureを既存QualityUnavailableへ流すだけで、PostToolUse fail-open・Stop fail-close/stop_hook_active契約を維持できる。

## Research Plan

- Round 1 Query: 既存scanner、comparison、Hook、contract、CI、Plan、Node/CI version、package metadata、公式textlint API/rule仕様を確認する。
- Round 2 Query: dependency追加後の実API型/descriptor、6 ruleの実message/範囲、tracked Markdown dry-run、failure/性能/Windows経路を確認する。
- Exit Criteria:
  - H1〜H3をコード・package・contract/dry-runで支持または反証できる。
  - 6候補ruleごとの違反数、対象file数、代表例、誤検知、採否をRun/PRへ記録できる。
  - production config failure、fingerprint、baseline/rename、Hook/CI契約に未確認を残さない（TTY由来のcompact runtimeは従来どおり別残件）。

## Approach

- 既存Planを再作成せず、まず依存と公式APIを固定し、scannerのcustom/textlint責務を最小差分で分離する。
- `scanText`/`scanFile`のcustom経路は残し、textlint descriptor/linterをmodule-local lazy cacheとして初回scan時だけ構築する。
- `lintText`の結果をpath/line/rule_id/message/replacementへ正規化し、問題範囲から本文matchを取得して既存の`rule_id:sha256(normalizedMatch)` fingerprintを使う。
- custom ruleとのrule ID衝突はconfiguration errorとし、設定欠落・破損・load/scan failureはquality check unavailableへ流す。
- 設定探索はrepository rootの絶対`.textlintrc.json`を正式APIのpath optionで指定し、cwdを変更しない。
- 標準フロー: `PLAN -> 公式/metadata確認 -> TASKS -> 依存追加 -> 実装 -> contract/dry-run -> 全検証 -> PR/CI -> REPORT`。

## Definition of Done

- dry-runで採用した5個の個別ruleだけが`.textlintrc.json`に有効化され、preset/prh/未承認ruleは入っていない。`no-unmatched-pair`はinline code等の誤検知を理由に除外する。
- textlint findingsがcustom findingsと統合され、既存baseline/fingerprint/rename/PostToolUse/Stop/CI比較を壊さない。
- config failureがsilent PASSにならず、nested cwd・Windows/Unix Hook経路をcontractで検証できる。
- rule単体、正常文、Markdown/code/URL/identifier、baseline/new/count/rename、failureのcontractがPASSする。
- tracked Markdown dry-runのrule別結果と採否を保存し、既存Markdownは一括修正しない。
- focused、Hook、lint/typecheck/test、verify、git diff check、push後のWeb CI/Mobile App CIを確認する。
- commit/push済み、PR #146 OPEN、Issue #134 OPEN、PR本文に現行実装・dry-run・CI・compact runtime未確認を反映する。

## Risks / Unknowns

- rule packageごとのmessage range/対象範囲が異なり、stable matchを取得できない可能性がある。該当ruleはproductionから外す。
- textlint Markdown parserがcode/URL/identifierを対象にする場合、推測で除外せず公式仕様とfixtureで採否を判断する。
- CI Node 24とlocal Node 22の差によるAPI/性能差があり得る。package enginesと両方の主要検証結果を記録する。
- textlint初期化は既存custom scannerより重い可能性がある。process-local cacheを確認し、代表経路の実測値をRunへ記録する。
- interactive Codexの`/hooks`/`/compact` runtimeはTTY制約により今回も未確認となる可能性がある。未確認をPASS扱いしない。

## Thinking Log

- 2026-09-14 22:15 JST: 新しい実装タスクとしてRun `20260914-221555-JST`を初期化した。指定branchとlocal/remote headは`310d5d1...`で一致し、作業treeはRun Artifactだけが未追跡である。
- 2026-09-14 22:20 JST: PR/IssueはOPEN、既存PlanはTask 6のproduction rule未確定を残している。textlint未導入で、既存scannerはcustom literal/regex専用として維持できる形だった。
- 2026-09-14 22:22 JST: textlint latest `15.8.0`のengineは`>=20.18.0`で、local Node 22.20.0/CI Node 24と互換。公式APIは`loadTextlintrc`、`createLinter`、linterの`lintText`を使用する方針で固定した。
- 2026-09-14 23:04 JST: 6候補をfixtureとtracked Markdownで確認し、`no-unmatched-pair`がinline code内の正常なPowerShell quote等を誤検知したためproductionから除外。残る5 ruleを`.textlintrc.json`へ採用した。
