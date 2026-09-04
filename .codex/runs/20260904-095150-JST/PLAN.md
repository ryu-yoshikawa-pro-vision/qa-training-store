# Issue #94 Admin Side Navigation Label overflow 対応計画

## Objective

- `Scenario Shop Admin`の正式名称を維持し、Admin Side Navigationの既存幅を変更せず、Label側の制約だけを最小修正して1024px以上で完全表示する。

## Scope

- In:
  - `AdminShell`のWordmark内Label wrapperのCSS。
  - 既存のAdminShell Component/UI testによる正式名称・配置・overflow回帰確認。
  - 変更前後の1024px/1280px Browser確認、通常の静的検証・Build・既存E2E。
- Out:
  - Side Navigation幅、Admin Shell grid/Main領域、表示名称、Navigation構造、共通デザインシステム全体。

## Assumptions

- Issueの直接原因は、`.admin-wordmark`の`white-space: nowrap`がLabel wrapperへ継承され、wrapperに`min-width: 0`とwrap指定がないことと仮定する。Browser計測で確定する。
- 既存の明確なAdminShell構造とPlaywright/Vitest構成を再利用し、新しいテスト基盤は導入しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: 対象Label wrapperへの局所CSS追加、既存testへの最小assertion追加。
- 未回答の重要質問: なし。

## Hypotheses

- H1（主仮説）: `white-space: normal`、`min-width: 0`、必要時の`overflow-wrap`を対象Labelへ適用すれば、正式名称を折り返してsidebar内に収められる。
- H2（反証条件）: Label wrapperだけでは収まらず、親の別制約や実効幅定義が原因なら、追加の幅変更はせず、実測結果を根拠に変更範囲を再評価する。

## Research Plan

- Round 1 Query: AdminShell、dictionary、global.css、既存Component/Playwright test、Issue #94を確認する。
- Round 2 Query: 変更前後を1024px/1280pxで実ブラウザ計測し、Label全文表示・境界内・水平overflowなし・Nav/Main維持を確認する。
- Exit Criteria:
  - H1/H2の支持または反証をcomputed styleとgeometryで記録する。
  - 変更がLabel側に限定され、IssueのDoDを満たす検証結果がある。

## Approach

- Issue/規約を正本としてrepo mappingと変更前再現を行う。
- 既存CSSの対象Label wrapperへ最小差分を適用する。
- 既存Component testとPlaywright/静的ゲートを実行し、失敗時は最初の異常からboundedに修正・再検証する。
- self-review後、指定branchのcommit、push、OPEN PR作成・URL確認まで行う。

## Definition of Done

- `Scenario Shop Admin`が1024px/1280pxで欠けず、LabelとNav/Mainが重ならず、文書水平overflowがない。
- Side Navigation幅宣言、Admin Shell layout、表示名称を変更していない。
- 必要なtest、format/lint/typecheck/build/関連E2Eが成功し、`git diff --check`も成功している。
- Issue #94をClosesするPR URLを取得し、commit SHAとともにREPORTへ記録している。

## Risks / Unknowns

- 既存CSS内には初期`248px`と後段の`256px`、1024〜1100pxの`232px`宣言がある。今回の差分ではこれらを変更せず、検証値として扱う。
- `overflow-wrap`だけでは継承したnowrapを解除できない可能性があるため、対象Labelのcomputed `white-space`を確認する。

## Thinking Log

- 2026-09-04 09:55 JST: `AdminShell`のLabelは`content.brand.adminName`から描画され、共通`.admin-wordmark`のnowrapと内側wrapperの制約不足を確認した。幅変更・ellipsisはIssueのNon-goalなので採用しない。
- 2026-09-04 10:00 JST: 変更前Web Buildは成功。1024pxの実測では実効Shell/sidebarが232pxで、Label wrapperがnowrap・min-width autoだった。後段の幅宣言は既存差分として保持し、Label側の検証へ進む。
