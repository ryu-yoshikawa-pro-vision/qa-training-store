# Native Customer

## Purpose / Scope

Native CustomerがWeb版と共有するプロダクトの振る舞いを、SQLite／ネイティブKVおよびネイティブシェルによって提供するための契約を定義します。Native Admin、ゲストチェックアウト、およびiOS実機環境（物理端末ランタイム）は対象外です。

## Business Rules

### BR-NATIVE-001 — Native Customerは共有Application契約に従う

ログイン、アカウント、カート、チェックアウト、決済、注文、レビューの定義やロール、状態、エラー、スナップショットをWeb版と共有し、ネイティブ専用の簡略化したビジネスルールは作成しません。

### BR-NATIVE-002 — Native RuntimeとProduction Capabilityを分離する

自動テスト環境および開発環境のみがテストコントロール、ハーネス、自動化ブリッジを保持し、本番ビルド（Production Build）ではこれらを公開・インポートしません。ネイティブSQLiteにおけるデータ更新（Mutation）では、排他トランザクション（exclusive transaction）と外部キー制約チェック（FK check）を遵守します。

## UI / Behavior Contract

Androidは標準のネイティブランタイム対象であり、Maestroによるユーザー操作、状態の観測、実行ログの記録、個別の指摘（Atomic Finding）への連携を行います。iOSは独立したビルドおよびビルド時のガード機能や成果物（artifact）を検証対象とし、シミュレータ環境やMaestroによる検証は正式な品質ゲート（Gate）とはしません。

## Acceptance Criteria

### Criteria

#### AC-NATIVE-001 — Web共有契約をNativeで維持する

Related BR: `BR-NATIVE-001`

Native Customerにおける購入・注文・レビューの処理、およびロール／状態／エラー（Failure）の定義が共有アプリケーション契約と一致しており、管理者権限（Admin capability）が混入しないこと。

#### AC-NATIVE-002 — AutomationとProductionを隔離する

Related BR: `BR-NATIVE-002`

自動テスト用ビルド（Automation Build）からテストコントロールやハーネスにアクセス可能であり、本番用バンドル（Production Bundle）にはテスト用マーカー、モジュール、画面、サービスが一切存在しないこと。また、AndroidランタイムとiOSのビルド検証のみ（Build-only）の保証範囲が混同されないこと。

## Executable Canonical Sources

- `src/bootstrap/native-runtime.ts`
- `src/infrastructure/database/sqlite/`
- `src/seeds/metadata.ts`
- `src/test-controls/`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
```eof

### 変更点と照合結果の報告
- **表現の改善**: 英語のまま残っていた語句（Product Behavior → プロダクトの振る舞い、Role/State/Error → ロール、状態、エラー、Rule → ビジネスルールなど）を自然な日本語・カタカナ表記に整え、直訳調の語尾や接続を技術文書として平易で明瞭な文体に改善しました。
- **仕様・構造の維持**: Markdownの見出し階層、識別子（`BR-NATIVE-001`、`AC-NATIVE-001` など）、コードパス、参照関係の欠落や独自補足がないことを原文と照合して確認済みです。
- **安全な修正が困難な箇所**: 意味が不明確で原文維持とした箇所はありません（安全にリライトを完了しています）。