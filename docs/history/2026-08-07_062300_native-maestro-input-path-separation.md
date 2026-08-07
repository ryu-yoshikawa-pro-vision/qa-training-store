# Native Maestro入力経路分離（2026-08-07）

## 背景

物理Android端末の標準日本語IMEでは、Maestro CLIの`inputText: "P-0001"`が検索欄へ保持されず、検索結果の商品カード未検出としてStorefront／Cartの主要Flowが失敗した。同じAPKをLatinIME条件で実行すると、公式単体GateとRuntime Suiteが成功した。

## 変更内容

- 既知商品を使う`native-storefront.yaml`、`native-cart.yaml`、`native-restart-persistence.yaml`、`native-reset-dirty-state.yaml`をProduct Deep Link経路へ変更した。
- `maestro/native-search.yaml`を追加し、`P-0001`入力と商品カード検出を専用Flowとして維持した。
- Native CIでは検索専用FlowをRuntime／Boundaryとは別のMaestro実行として扱う。
- Native README、Windows Android Runbook、Troubleshooting、PROJECT_CONTEXT、ADR-0007へ、IME依存の境界、LatinIMEの一時利用と復元、成果物の保存先を記載した。

## 運用判断

検索入力の失敗を、既知商品の主要業務Flowの失敗と混同しない。標準日本語IMEで検索専用Flowが成立しない場合は、証跡を保存して入力条件未達として報告する。主要Flowでは検索操作を復活させない。

## 検証

- 主要FlowのDeep Link化後、初回RuntimeではDeep Link直後の商品名Textが長い商品画像の下で`visible`判定にならず失敗した。商品詳細画面とVariant testIDは存在していたため、商品名assertだけを削除し、Timeoutや主要検証を弱めずに修正した。
- 修正後、標準日本語IMEの実機で`native-test-control.yaml` 1/1、Runtime Suite 5/5、Boundary Suite 5/5をPASSした。主要Flowは検索入力なしで完了した。
- `native-search.yaml`はLatinIMEを一時選択した実機で1/1をPASSした。`P-0001`入力と対象商品カードtestID検出まで確認し、終了後に標準日本語IMEと元の有効IME一覧へ復元した。
- `pnpm run format:check`、`pnpm run lint`、Native関連Contract 30/30、`pnpm run typecheck:native-tests`はPASSした。全体`pnpm run typecheck`は今回変更外の既存6箇所のimplicit-anyでFAILした。
- 実行証跡は`.artifacts/native-local/20260807-064200-JST/`と`.artifacts/native-local/20260807-065100-JST/`に保存し、生成APK、JUnit、Hierarchy、logcat、端末固有情報はRepositoryへ追加していない。Remote CIは実行していない。
