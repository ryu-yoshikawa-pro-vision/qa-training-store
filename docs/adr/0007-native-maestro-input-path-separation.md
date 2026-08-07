# ADR-0007: Native Maestroの主要Flowと検索入力Flowを分離する

- Status: Accepted
- Date: 2026-08-07
- Approved-by: user

## Context

Windowsの物理Android端末では、端末の標準日本語IMEがMaestro CLIのASCII `inputText`を検索欄へ保持しないことがある。`P-0001`が入力されない場合、Seedや検索Repositoryが正常でも、一覧から`native-product-card-product-basic-shirt`を検出できず、既知商品の詳細・Variant・Cartを検証する主要Flowまで失敗する。

同じインストール済みAPKをLatinIME条件で実行すると、対象Storefront FlowとRuntime Suiteが成功した。したがって、既知商品の業務シナリオと、端末入力方式を検証する検索シナリオは、同じFlowへ混在させない方が原因境界と停止条件を明確にできる。

## Decision

1. 既知の商品を使うStorefront、Cart、Persistenceの主要Maestro Flowは、`scenario-shop://products/product-basic-shirt`のProduct Deep Linkで商品詳細へ遷移する。これらのFlowはIME入力に依存させない。
2. 商品Code検索の`inputText`、検索実行、商品カード検出は`maestro/native-search.yaml`へ分離する。検索カバレッジは削除せず、主要Runtime／Boundaryの分母へ混ぜない。
3. CIでは検索専用Flowを主要Runtime／Boundaryとは別のMaestro実行として保存・報告する。ローカル実機では、標準IMEがASCII入力を保持しない場合、LatinIME等を一時的に選択して実行し、終了後に元のIMEと有効IME一覧を復元する。
4. 標準IMEで検索専用Flowが失敗した場合、Timeout延長、Assertion削除、既知商品の主要Flowへの検索操作復帰で成功扱いにしない。

## Consequences

- 既知商品の商品詳細、Variant、Cart、Persistenceの主要検証は、端末IME差による偽陰性から分離される。
- 検索入力の実機互換性は専用Flowで明示的に検証でき、CIと物理端末の入力環境差も別結果として報告できる。
- 検索専用FlowはIME条件を満たさない物理端末では成功しない。入力条件の設定と復元をRunbookに従って行う必要がある。
- Product Deep Linkが商品詳細Routeの契約であるため、Route変更時は主要Flowと検索専用Flowの境界を再確認する。
