# Plan

## Objective

- Issue #93のCurrent `main`相当Baselineを実Browserで確認し、現象を再現できた場合だけ初回Rating Anchor navigationのRoot Causeを最小修正する。再現不能時はsource変更なしで停止する。

## Scope

- In: `ProductDetailView`のRating Anchor、`#reviews` target、Product DetailのWeb layout／Sticky Header／fragment／focus、既存Playwright／Component／a11y回帰。
- Out: Review機能、Rating表示形式、Product Detail全体の再設計、generic hash／scroll framework、dependency、無関係なfailure。

## Assumptions

- Issue本文を正本とし、Normative Specificationの`BR-STOREFRONT-003`、`AC-STOREFRONT-003`、UI Accessibilityを補助Oracleとする。
- `origin/main`との差分がProduct Detail経路にないことを確認できれば、作業branch HEADをIssue #93のCurrent `main`相当と扱う。rebase／mergeは行わない。
- 既存のPlaywright Chromium setupと`default` Scenarioを使用する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。Issueが完了判定と停止条件を指定済み。
- 仮定してよい細部: 主ViewportはDesktop 1440x1000、補助ViewportはMobile 390x844。
- 未回答の重要質問: 実際に初回操作が失敗するか、失敗時のRoot Cause分類。

## Hypotheses

- H1: Rating Anchorまたは`#reviews` targetが初回操作時にDOMへ成立していない／hydrate差し替えが起きている。
- H2: Native Anchorはtargetへ移動しているが、画像・Review非同期描画などのlayout shiftで位置が変わっている。
- H3: Sticky Headerがtargetを覆っているだけで、navigation自体は成立している。
- H4: Router、focus、上位event処理が初回のnative navigationを阻害している。
- H5: 上記のいずれも発生せず、Current状態ではIssue現象を再現できない。

## Research Plan

- Round 1 Query: Issue本文、仕様、Git／origin差分、Rating→Anchor→target→layout経路、既存E2E／a11yを確認する。
- Round 2 Query: Charter／BEFORE Snapshot後、fresh ChromiumでMouse 1回、Keyboard Enter 1回、direct `#reviews`を独立操作し、DOM／URL／Viewport／Focus／Consoleを比較する。
- Round 3 Query: 再現時だけ、操作直後・非同期安定後・reload後の位置とDOM lifecycleを追加観測してRoot Causeを一つに絞る。
- Exit Criteria:
  - 4 Coverage Itemの観測とEvidenceが完了する。
  - H1〜H4の支持／反証、またはH5の再現不能根拠が記録される。
  - 実装修正を行う場合は原因と修正の一対一対応、Regression、全指定Validationが確認できる。

## Approach

- Issue／仕様／コード／テストを先に読み、QA Charterを検証する。
- Charter検証後かつ最初のRuntime interaction前にBEFORE Snapshotを取得する。
- Runtime QA中はProduct Codeを変更しない。再現結果を確定してから、必要ならRepair workflowへ明示的に切り替える。
- 修正時はnative Anchor semanticsを維持する最小差分を選び、固定待機や強制scrollを追加しない。
- 標準フロー: `PLAN -> Charter/BEFORE -> Runtime QA -> Root Cause -> minimal fix -> targeted validation -> full validation -> self-review -> commit/push/PR`

## Definition of Done

- 再現時: 初回Mouse／Keyboard、direct `#reviews`、fragment、target位置、Sticky Header、focus、既存Product Detail機能を修正後に確認し、Regression Testと全指定ValidationがPASSする。commit／push／PRを作成する。
- 再現不能時: Browser／version、Viewport、起動方法、操作、Mouse／Keyboard／direct hash結果、fragment、target位置、console／runtime evidence、追加再現条件をRunへ記録し、source変更・commit・push・PRを行わない。

## Risks / Unknowns

- Anchor移動、layout shift、sticky遮蔽、Router／hydration阻害を同じ「見えない」にまとめず、DOM／URL／位置の時系列で切り分ける。
- Dev server起動やBrowser binary不足はruntime blockerとして記録し、Product Codeを推測変更しない。
- `origin/main`の#108／#111は関連surface外だが、差分一覧をEvidenceとして保存する。

## Thinking Log

- 2026-09-04 JST: branch `fix/issue-93-rating-review-anchor`は指定どおり、初期working treeはcleanだった。HEAD `cf5b7b0`は`origin/main`より2コミット後方だが関連Product Detail経路のdiffはない。
- 2026-09-04 JST: sourceにはnative `<a href="#reviews">`、`<section id="reviews" tabIndex={-1}>`、sticky Headerが存在する。Root Causeは未確定であり、Runtime再現前の変更は禁止する。
- 2026-09-04 JST: client navigation後の初回Mouse／KeyboardではExpo Router webのhash-only path resetによりtargetがunmountされ、direct hashでは非同期target生成後にfragment位置が復元されないことを確認した。修正はtarget mount後focusとHeader向け`scroll-margin-top`、Regressionは観測可能なPlaywright E2Eとする。
