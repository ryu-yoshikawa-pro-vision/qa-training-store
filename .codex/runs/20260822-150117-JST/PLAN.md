# Plan

## Objective

- 指定Planに従い、G3 Native Catalog / StorefrontとG4 Native route authorizationだけを最新`origin/main`へ実装する。

## Scope

- In:
  - Session-aware `ProductViewer`のNative Catalog End-to-End伝播。
  - 既存Domain visibility / pricing semanticsを使うNative SQLite Storefront parity。
  - Native Storefrontの不足query/filter/facet/page/Suggestion surface。
  - Native ShellのCustomer-only direct navigation boundaryと代表negative test。
  - G3/G4に必要な既存coverageの補完、Focused Validation、必要なRepository gate。
- Out:
  - G1/G2/G5/G6/G7/G8/G9、Web、Checkout、Cart、CI、Training、Admin capability、PR merge。
  - 新しいauthorization / cancellation / generic catalog framework、全role×全route matrix、Runtime専用Test Control Scenario。

## Assumptions

- `HEAD`と`origin/main`は`a3a58ae`で一致しており、PR #38のPlanはrebaseline済みである。
- Native CartのGuest-only adapterは変更しない。
- Native Loginの既存`returnTo` sanitizerとShellのunsupported role boundaryを再利用する。
- async overlapのEvidenceがない場合、既存request serial以外のstale-result guardは追加しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。指定Planに必要な判断が明記されている。
- 仮定してよい細部: Native UIは既存TextField/Button/chipで不足surfaceを最小追加する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Guest固定の根因はNative bootstrap actor、Gatewayのviewer省略、SQLiteのGuest predicate/price投影の連鎖である。
- H2: Native SQLiteは既存ProductSearchRequest DTOを受けられるため、Repository-local parity helperと既存UI拡張で不足dimensionを埋められる。
- H3: G4はNativeShellの`currentUser === null`時だけroute boundaryへ分岐する局所変更で解消でき、loaded management roleの既存unsupported表示を壊さない。

## Research Plan

- Round 1 Query: 指定Plan、Project Context、最近のADR/Run、最新main、G3/G4のapplication/bootstrap/repository/presentation/test/specを確認する。
- Round 2 Query: 既存Web Storefront parity、Native UI request surface、role/route boundary、必要な不足coverageを照合して変更対象を確定する。
- Exit Criteria:
  - H1〜H3をコード・テスト・仕様の根拠で支持または反証する。
  - G3/G4以外の変更面を計画から除外する。
  - Focused Validationと完了判定が具体化されている。

## Approach

1. `SessionIdentityResolver`と既存Gateway/UseCase契約へviewerを明示接続する。
2. Native SQLiteを`canViewerSeeProduct`、`effectiveUnitPrice`、`viewerUnitPrice`、既存WebのFilter/Facet/Suggestion semanticsへ寄せる。
3. Native service/UIへ不足Storefront surfaceを接続し、既存request serialを維持する。
4. NativeShellへCustomer-only Guest redirectを集約し、代表negative caseを追加する。
5. Focused testを先に実行し、変更面のgateとSanitizerで確認する。

## Definition of Done

- G3/G4だけの最小差分で、viewer visibility/pricing/rank、Storefront dimensions、Suggestion、Guest direct route、management unsupported boundaryが確認できる。
- 既存coverageを再利用し、assertion弱体化、retry、timeout増加、failure maskingを行わない。
- 実行Command、結果、未実行Runtime、主要変更ファイルがREPORTと最終報告に残る。

## Risks / Unknowns

- SQLite境界でviewerを落とすリスク: UseCase→Gateway→Repository→SQLiteの実DB testを追加する。
- Facet countのselected-filter semanticsを壊すリスク: Web Dexie実装を照合し、代表Filter testを追加する。
- Guest redirectの対象を広げすぎるリスク: Customer-only route allowlistをShell内で限定する。
- Android runtime/tooling availabilityは未確認であり、利用不能ならPASS扱いしない。

## Thinking Log

- 2026-08-22 15:01 JST: 必須文書、指定Plan全文、最近のADR/Run、最新`origin/main`を確認し、Strict run `20260822-150117-JST`を初期化した。
- 2026-08-22 15:01 JST: HEADと`origin/main`は`a3a58ae`で一致。PR #38計画は既にmainへ反映済みで、G3/G4の実装差分は未着手と判断した。
- 2026-08-22 15:01 JST: Static mappingでGuestActorResolver、Gatewayのviewer省略、SQLite Guest predicate/price、Native UI fixed filters/page、NativeShell Guest direct route gapを確認した。

## Execution Result

- 2026-08-22 15:55 JST: G3/G4 source、Native repository／component／route boundary testを実装し、Focused Validationと変更面のlint、typecheck、Native route dependency gateを実行した。
- Node SQLiteのphysical runtime代替検証は成功した。ADB接続端末は`unauthorized`だったため、Android physical Native runtime Before/Afterは未実行として評価を`partial`／`missing_validation`にした。
