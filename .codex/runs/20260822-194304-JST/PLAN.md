# PR #42 修復計画

## Objective

- PR #42 `feat/native-catalog-storefront-authorization` の現HEADで確認できるレビュー指摘だけを、既存のG3/G4設計を維持して最小修正する。

## Scope

- In:
  - `NativeSearchWithInitial` の検索開始状態、filter/sort/page変更との同期、initialKeyword同期。
  - Search/Suggestionそれぞれのstale-result guardと、2文字未満へ戻った場合の無効化。
  - Native SQLite Catalogのcandidate relation bulk loading、bind parameter付き`IN (...)`、Detailの対象商品限定取得。
  - Guestの既知rank-restricted商品のnegative assertion。
  - Search Component Testの不足するA〜Eケース。
  - 既存 `maestro/native-search.yaml` のSearch/Suggestion代表操作への最小更新と、必要なNative validation。
  - 旧Run `20260822-150117-JST/REPORT.md` 末尾への時系列訂正。
- Out:
  - `CustomerCatalogGateway` のinterface再構成（現HEADではimport/re-exportのみで誤検知）。
  - 新しいSearch/Cancellation/Authorization framework、状態管理library、依存更新。
  - Web Search、Native Admin、Guest Checkout、Cart ownership、Expo dependency alignment。
  - 全role×全route、全rank×全test-layer、benchmark framework、seed拡張によるPagination。

## Assumptions

- PRの最新remote HEADは開始時点で`8bd9dfd`であり、作業branchとremote branchは一致している。
- `SessionIdentityResolver`、`ProductViewer`、既存Domain pricing/visibility policy、Login boundaryは変更しない。
- Searchの通常入力は検索ボタン／submitで開始し、検索済み後のfilter/sort/pageだけを自動再検索する。initial queryはmount／route変更時に自動検索する。
- MaestroのPaginationは既存seedで2ページを保証できない場合は追加せず、Component Testを正本にする。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象ファイル、修正条件、停止条件、Validation条件が指定されている。
- 仮定してよい細部: bulk relationはRepository内の小さなprivate helperとMap groupingで実装し、Detailはpoint queryを使う。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Searchの主因は`initialKeyword` effectが`search` callbackのstate依存で再評価され、未検索状態と検索済み状態を区別していないこと。小さなrefとeffect分離で解消できる。
- H2: SQLiteのN+1主因は`buildCandidates()`内のproductごとの3 queryであり、visible product IDsを一度だけbindして3 queryへまとめれば意味論を維持できる。
- H3: `getProductDetail()`の全商品scanはcandidate構築を単品point queryへ切り替えても、既存visibility/pricing/detail DTOを維持できる。

## Research Plan

- Round 1 Query: PR HEAD、review thread、指定Plan、直近Run、現行Native Search/SQLite/seed/test/Maestroを照合する。
- Round 2 Query: 修正後にfocused Component/Repository/Contract、typecheck/lint/format、Maestro preflight/runtimeを実行し、差分とRun Artifactを再確認する。
- Exit Criteria:
  - H1〜H3に対する現行コードの根拠と修正後のtest evidenceがある。
  - `allowed_files`外のsource変更がなく、未実行項目と外部Expo Doctor failureを分離して記録する。

## Allowed files

- `src/presentation/native/native-screens.tsx`
- `tests/component/native/native-catalog-screen.test.tsx`
- `src/infrastructure/database/sqlite/native-customer-repositories.ts`
- `tests/repository-contract/native-customer-shared.test.ts`
- `tests/contracts/shared-customer-repository-suite.ts`
- `tests/contracts/native-test-control-maestro.test.ts`
- `maestro/native-search.yaml`
- `.codex/runs/20260822-150117-JST/REPORT.md`（明示されたappend-only訂正）
- `.codex/runs/20260822-194304-JST/`（標準Run Artifact）

## Approach

1. Searchを`searchStartedRef`、Search/Suggestion独立serial、initial route処理、filter/sort/page effectへ最小分割し、request payloadのkeyword/page overrideを明示する。
2. Search Component Testへ初期queryなしの検索後pagination/filter、stale Search/Suggestion、短縮入力、initialKeyword変更をDeferred Promiseとrerenderで追加する。
3. SQLiteでvisible product IDsのactive variants/images/summariesをbind parameter付きbulk queryしMap化する。Detailはvisibility確認後に対象商品だけを取得し、単品candidate構築を再利用する。
4. Guest shared repository contractへ既知rank-restricted商品不在を追加し、Node SQLite contractへquery shape/count regressionを追加する。
5. 既存Search Maestro flowをNative Search routeのSuggestion代表操作へ最小更新し、Doctor→Build→Install→Smoke→単体Flowの順で実行する。上流失敗時は後続を実行しない。
6. Focused gate、必要なRepository gate、Sanitizer/schema、旧REPORT訂正、clean diff確認後、normal commit/pushまで行う。PR mergeは行わない。

## Definition of Done

- `/search`の初期queryなしでは空検索を自動実行せず、検索後のfilter/sort/page変更は実際のrequestを送る。
- Search/Suggestionの古い成功・失敗が最新stateを上書きせず、2文字未満への戻りで候補が復活しない。
- route initialKeywordのinput/search/suggestionが同じ新値を参照し、古いinitial keywordを再発行しない。
- Home/Search/Suggestionのcandidate relation queryがproductごとの3Nにならず、Detailが全可視商品をbuildしない。`IN ()`やSQL文字列へのID interpolationがない。
- Guest結果に`product-basic-shirt`が含まれ、seedで確認したrank-restricted`product-running-shoes`が含まれない。
- 必須focused testsと変更面のgateを実行し、未実行はPASS扱いしない。
- Android physical validationはDoctor成功後に実行可能な範囲を実行し、Expo Doctor mismatchは今回の差分と分離して報告する。
- 旧REPORTへappend-only訂正を追記し、Run ArtifactをSanitizer/schema validation済みにする。

## Risks / Unknowns

- React effectの同一commit順序でinitial queryとfilter auto-searchが二重発行されるリスクは、effect順序とpending route refをComponent Testで確認する。
- relation bulk queryのSQL placeholder・row mappingでactive variant、image fallback、summary fallbackを壊すリスクは、既存contractとquery trace testで確認する。
- Android端末が再びunauthorized/offlineになった場合、Doctorで停止しBuild以降を未実行として記録する。
- CodeRabbitのDocstring warningとCustomerCatalogGateway指摘は、現行要件・既存方針にないため修正対象へ混ぜない。

## Thinking Log

- 2026-08-22 19:43 JST: PR #42 HEADは`8bd9dfd`、reviewDecisionは`CHANGES_REQUESTED`。6 inline commentのうちGateway二重定義は現HEADのimport/re-exportと一致せずreject。
- 2026-08-22 19:43 JST: 現行Searchはrequest serialなし、initialKeyword変更時のstate同期なし、effectが`search`と`loadSuggestions`へ依存しているため、指定された4つのSearch問題は同一state/effect同期問題として修正する。
- 2026-08-22 19:43 JST: 現行SQLiteは`buildCandidates()`でproductごとにvariants/images/summaryを取得し、Detailも全visible candidatesをbuildしているため、N+1と全商品scanはまだ実在する。
- 2026-08-22 19:43 JST: Android DoctorはNode 24.12.0、pnpm 9.10.0、Maestro 2.8.0、authorized physical device API 30/arm ABIでPASS。Build前の再確認条件はRun Artifactへ記録する。
