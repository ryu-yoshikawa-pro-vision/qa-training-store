# Native検索Flowの商品詳細遷移確認（2026-08-07）

## 変更

`maestro/native-search.yaml`の検索専用Flowを、次のユーザージャーニーまで確認する形へ維持した。

1. `P-0001`を入力する
2. `native-product-card-product-basic-shirt`を検出する
3. 商品カードをタップする
4. `native-product-detail-screen`を待機する
5. 検索結果と商品詳細の代表スクリーンショットを保存する

検索Flowは、既知商品をDeep Linkで開く主要Runtime／Boundary Flowとは分離する。これにより、主要Flowは物理端末のIMEに依存せず、検索入力のカバレッジは独立して維持する。

## ローカル確認

- 標準日本語IMEではASCII検索入力が保持されず、検索カードが可視にならないため成功扱いにしなかった。
- LatinIMEを一時選択した同一Flowでは、検索、カード検出、カードタップ、商品詳細確認、2枚のスクリーンショット保存が1/1で成功した。
- 実行後は元のIMEと有効IME一覧へ復元した。
- Remote Native CIはこのRunでは実行していない。

## 正本

- Flow: `maestro/native-search.yaml`
- Contract: `tests/contracts/native-test-control-maestro.test.ts`
- Windows実機手順: `docs/native/windows-android-local-validation.md` Gate 2.5
- 方針: `docs/PROJECT_CONTEXT.md`「Native Maestro入力経路分離」
