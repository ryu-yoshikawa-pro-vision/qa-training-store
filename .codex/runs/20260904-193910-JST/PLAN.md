# Plan

## Objective

- PR #112のレビュー指摘に限定し、既存のIssue #93修正を小さく明確にする。
- MobileにはReview Anchor用の追加`scroll-margin-top`を適用せず、DesktopのSticky Header向けoffsetだけを残す。
- E2Eから実装依存のfocus／`tabIndex` assertionを除き、ユーザーが観測できる契約を維持する。

## Scope

- In:
  - `src/presentation/styles/global.css`のReview Section offset適用範囲。
  - `e2e/web/phase1-required.spec.ts`の既存3件のhelper契約。
  - Issue #93に関するProject Context、既存計画、Run内PR本文、PR #112本文。
  - 新しいrepair Runの記録とvalidation。
- Out:
  - `ProductDetailView`のhash-gated `focus()`、Rating Anchor、`#reviews` target。
  - Header本体、Router、Review機能、Mobile layout、test framework、依存関係。
  - 新しいMobile E2E、component test、generic helper、CodeRabbit再レビュー起動。

## Assumptions

- レビュー指摘とユーザー指示が変更仕様の正本であり、Root Causeの再設計は不要。
- 既存のDesktop Chromium E2EとRepositoryのvalidationを再利用する。
- 過去Runの証跡は履歴として保持し、現行実装を表すRun内PR本文・Project Contextは更新する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。削除対象、維持対象、検証条件が明示されている。
- 仮定してよい細部: Desktop offsetは既存値`112px`を維持し、`@media (min-width: 900px)`で限定する。
- 未回答の重要質問: なし。

## Findings Triage

- `must_fix`: Mobile `scroll-margin-top: 176px`を削除し、Desktopのみに限定する。
- `must_fix`: E2E helperの`activeId`／`targetTabIndex`取得とassertionを削除する。
- `reject`: `focus()`のproduction変更、Anchor方式の変更、追加のscroll workaroundは今回のレビュー指摘に含めない。
- `defer`: Headerの後段レスポンシブ定義の整理、新規Mobile coverage、magic numberの変数化。

## Research Plan

- Round 1 Query: Git／PR／Issue／規約、現在のCSS cascade、E2E helper、現行文書を確認する。
- Round 2 Query: scoped patchを適用し、targeted E2E、required validation、diff／scope／sanitizerを確認する。
- Exit Criteria:
  - MobileにReview用`scroll-margin-top`がなく、Desktopの`112px`だけが残る。
  - E2Eの3ケース、URL／viewport／Desktop Header境界assertionが維持される。
  - `ProductDetailView`のhash-gated `focus()`が変更されていない。
  - PR本文と関連文書が現行実装と一致し、指定validationがPASSする。

## Approach

- `repair-loop`の1 iterationとして、許可ファイルを先に固定し、レビュー指摘の最小patchを適用する。
- 変更後は最寄りのE2Eから順に全validationを実行し、最終diffとPR状態を確認する。
- 標準フロー: `findings triage -> scoped repair -> targeted validation -> full validation -> diff review -> commit/push/PR update`

## Definition of Done

- `global.css`で900px未満にReview Anchor用offsetが適用されない。
- E2Eから`activeId === "reviews"`と`tabIndex === -1`の固定がなく、Mouse／Keyboard／directの3テストが残る。
- `ProductDetailView`のhash-gated `focus()`、plain Anchor、`href="#reviews"`、`id="reviews"`が維持される。
- PROJECT_CONTEXT、既存計画、Run内PR本文、PR #112本文が現行実装に整合する。
- targeted E2E、指定full validation、`git diff --check`、sanitizerがPASSする。
- 変更をcommit／pushし、既存PR #112を更新する。mergeは行わない。

## Risks / Unknowns

- CSSに同一セレクタの後段レスポンシブ定義があるため、Header自体を変更せず、今回の指定どおりReview offsetだけを限定する。
- E2E assertion削減がbehavioral coverageを弱めないよう、URL、target viewport、Desktop Header境界を残す。
- PR本文更新後にGitHub CIが新headで再実行されるため、未完了状態を成功と報告しない。

## Thinking Log

- 2026-09-04 JST: branchは指定どおり、working treeはclean、PR #112はOPEN・非Draft。レビュー指摘は2件の`must_fix`として確定した。
- 2026-09-04 JST: `ProductDetailView`のhash-gated `focus()`とAnchor／targetは維持する。CSSは共通定義をDesktop media queryへ移し、Mobile overrideを削除する。
