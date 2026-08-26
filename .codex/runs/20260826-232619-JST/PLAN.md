# Plan

## Objective

- Training Copy生成時に、Source Repository側の直下workflowを漏れなくarchiveへ退避し、active workflowを既存のTraining用2本だけにする。
- `validate-training-copy.ts` の厳格なallowlistと、Source SHA・manifest・Training template配置の契約は維持する。

## Scope

- In:
  - `scripts/training/prepare-training-copy.ts` の直下 `.yml` / `.yaml` workflow列挙・archive移動。
  - `tests/contracts/training-curriculum.test.ts` への最小限の生成回帰contract test追加。
  - 今回のRun artifact。
- Out:
  - `scripts/training/validate-training-copy.ts`、Source workflow本体、Training workflow template、Product code、依存ファイル、lockfile。
  - `cross-browser-smoke.yml` 専用例外、新方式、別Repository、setup-java変更。

## Assumptions

- workflowの対象は `.github/workflows` 直下にある通常ファイルの `.yml` / `.yaml` とする。
- 既存のGit clone、full SHA検証、manifest生成、Training template配置の処理は変更しない。
- 既存のtemporary directoryとCLI実行によるcontract testパターンを再利用する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし（指定計画に明記済み）。
- 仮定してよい細部: 追加workflowの回帰fixtureには `.yaml` も含め、両拡張子を検証する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 固定3ファイル列挙が、後から追加された `cross-browser-smoke.yml` 等をactiveに残す原因である。
- H2: 直下の `.yml` / `.yaml` を動的にarchiveしてから既存templateを配置すれば、validatorのallowlistを緩和せずに生成結果がPASSする。

## Research Plan

- Round 1 Query: 計画、現行prepare/validator、関連contract test、active workflow/templateを確認する。
- Round 2 Query: temporary Git fixtureでprepareとvalidatorを実行し、archiveとactive状態を確認する。
- Exit Criteria:
  - H1/H2をコードと回帰テストで支持または反証できる。
  - focused test、全contract test、計画記載のformat/lint/typecheck/security validationがPASSする。
  - 最終HEADからDisposable Copyを生成し、validatorとworkflow状態を確認できる。

## Approach

1. 対象ブランチ、PR、working tree、計画、既存Run/ADRを確認する。
2. `prepare-training-copy.ts` の固定workflow名処理だけを、直下 `.yml` / `.yaml` のarchive列挙へ置き換える。
3. 既存contract testへtemporary Git fixtureを追加し、実CLIと既存validatorを通す。
4. focused test、全contract test、format、lint、typecheck、markdown lint、security checkを実行する。
5. 差分とscopeを確認してcommitし、最終HEAD SHAからworking tree外のDisposable Copyを検証する。
6. 一時Copyを削除し、対象branchを明示refspecでpushしてPR #71へ反映する。

## Definition of Done

- `.github/workflows` 直下の全 `.yml` / `.yaml` Source workflowがarchive directoryに保持される。
- active workflowが `training-ci.yml` / `training-native-ci.yml` の2本だけになる。
- 既存validatorのallowlist、Source workflow、Training template、Product codeに意図しない変更がない。
- 回帰contract test、計画記載のautomated validation、最終HEADのDisposable Copy validationがPASSする。
- commit済み最終HEADをPR #71へpushし、未解決事項がない。

## Risks / Unknowns

- `.yml` のみ固定する実装では再発するため、`.yaml` も同じ列挙条件に含める。
- archiveではなく削除するとSource workflowを失うため、既存どおりrenameで保持する。
- validatorを変更すると通常workflowのactive実行を許すため、validatorは変更しない。

## Thinking Log

- 2026-08-26 23:26 JST: PR #71の対象branchとheadRefNameが一致し、working treeはclean。既存計画は135行を全読了。
- 2026-08-26 23:27 JST: 現行prepareは3固定名のみを退避し、validatorはactive workflowをTraining 2本へ厳格限定している。変更面はprepareとcontract testに限定する。
- 2026-08-26 23:28 JST: 既存training-curriculum contract testのtemporary directoryパターンを再利用し、fixtureから実prepare/validator CLIを起動する方針を採用した。
