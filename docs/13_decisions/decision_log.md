# 判断記録

本書は後戻りコストの高い技術やスコープに関する判断のみを記録します。業務ルール、入力制約、状態遷移については各正本文書を参照するものとし、本書には再掲しません。

| ID | 決定 |
|---|---|
| D-001 | テスト自動化学習用の模擬的な単一店舗ECとし、実際の取引は行わない |
| D-002 | フェーズ1ではWeb ECとPlaywrightを対象とし、Native／SQLite／Maestroはフェーズ2の対象とする |
| D-003 | Expo Router + TypeScriptを採用する |
| D-004 | フェーズ1におけるデータの永続化にはIndexedDB/Dexieを使用する |
| D-005 | UIはApplication Use Caseを経由するものとし、DBを直接操作しない |
| D-006 | Presentation Requestと内部Commandを分離し、Actor／Viewer／Clock／IDはUse Case層で解決する |
| D-007 | 複数のStore更新はApplicationTransactionRunnerにより原子的に実行する |
| D-008 | customerのみが商品を購入でき、operatorおよびadminは管理専用とする |
| D-009 | Payment（決済処理）は決定論的なローカルモックとし、フェーズ1では成功または明確な失敗のみを扱う |
| D-010 | カート変更時はCart Versionのみを更新し、Checkout Route Guard・確認画面・注文確定の各段階で不一致を検出する |
| D-011 | Order Itemに商品情報・価格・画像のスナップショットを保存する |
| D-012 | Review Summaryを永続化データとして集計し、レビュー変更と同一トランザクション内で更新する。平均値は端数処理を行わずに未丸めのまま保存し、画面表示時のみ丸め処理を行う |
| D-013 | Seed、Reset、Clock、および固定の読み取り専用インスペクション（Read-only Inspection）をテスト容易性（Testability）の中核とする |
| D-014 | Resetの保証範囲は1つのBrowser Contextかつ1つのPageのみとし、複数タブ間でのアトミック性（原子性）は実装しない |
| D-015 | 商品画像はGitHub上の静的アセットを正本とし、リリース済みのパスは追記のみ（append-only）とする |
| D-016 | 画像マニフェストはビルド時に生成されるTypeScriptモジュールを実行時（Runtime）の正本とし、実行時の動的フェッチ（Runtime Fetch）は行わない |
| D-017 | Category（カテゴリ）はフェーズ1では1階層のみとし、手動による表示順を保持する |
| D-018 | Brand（ブランド）の並び順は名称順固定とし、手動での並べ替え機能は持たない |
| D-019 | Storefront（ストアフロント）とAdmin（管理画面）では別々のPage Shellを使用する |
| D-020 | フォーム管理にはReact Hook Formを、バリデーションにはZodを使用する |
| D-021 | 共通UIコンポーネント（Shared UI）にはReact NativeのStyleSheetを使用し、Web専用の管理画面・レイアウトには`.web.tsx`とCSS Modulesを使用する |
| D-022 | Web版におけるDialogやComboboxなどのUIコンポーネントはReact Aria Componentsの利用に限定する |
| D-023 | フェーズ1で必須とするE2Eテストは12本とし、ロール横断のライフサイクルテスト（Cross-role Lifecycle）はmainブランチおよび週次パイプラインで実行する |
| D-024 | Cloudflare Pagesの1プロジェクトをテスト自動化（Automation）用途で使用する |
| D-025 | 高度な決済照合、キャンセル・返品・返金（Cancel/Return/Refund）、インポート・エクスポート、マイグレーションリカバリは将来のフェーズへ分離する |
| D-026 | 実装開始後、TypeScriptの型・Enum・Dexieスキーマの定義および構造は実装コードを正本とします。型や構造の設計上の意味・責務・判断理由は該当Markdownを正本とします。ただし、製品の期待動作および業務ルールは正式な製品仕様を正本とします。 |
| D-027 | GitHub Tokenをフロントエンドに保持させず、管理UIからGitHubへ直接画像を書き込まない |
| D-028 | IndexedDBでは住所のスナップショットを型付きオブジェクト（Typed Object）として保存し、SQLite Adapterのみが必要に応じてシリアライズを行う |
| D-029 | UI向けの読み取り専用DTO（Read DTO）からは、Gateway Key、Repository Version、内部Actor IDを除外する |
| D-030 | 新規機能の追加よりも、ECの基本フローと自動テストの決定性（再現性）を優先する |
| D-031 | 会員割引の計算はSKU単価単位で端数を切り捨て、決済処理の日時はApplication Clockを唯一の正本とする |
| D-032 | D-020を改定（supersede）し、ドメイン状態、永続化状態、業務判断に影響を与えるバリデーションや正規化（Validation / Normalization）は、プレゼンテーション層のバリデーションのみに依存せずアプリケーション層またはドメイン境界で成立させる。プレゼンテーション層ではUX向上のための補助的なバリデーションを行ってよい。フォーム状態管理や実行時バリデーションライブラリ（Form state / Runtime Validation library）は画面特性に応じて柔軟に選択するものとし、すべての入力に対してReact Hook FormやZodを一律必須とはしない |
| D-033 | D-021を改定（supersede）し、Native環境とWeb環境のプラットフォーム分離（platform isolation）を現行の規約（Current contract）とする。Nativeのプレゼンテーション層ではReact Nativeのプリミティブ、StyleSheet、共有デザイントークンを利用し、Native側からWeb用のCSS、React Aria Components、`.web`モジュール、Web DOMやブラウザストレージのグローバル変数へ依存させない。Web専用のスタイルシートはWebのComposition Root（構成ルート）から取り込み、`.web.tsx`や`.native.tsx`はプラットフォーム固有の実装が必要な境界でのみ使用する。CSS Modulesの利用は一律必須としない。規約の正式な機械検証（Formal enforcement）は、既存の`check:native-route-dependencies`を正本とする |

## 実装補足

- 商品アグリゲート（Aggregate）の生成・更新（Create/Update）においても、Use CaseがClockから時刻を1回のみ取得し、アグリゲート内の全時刻へ同一値を伝播させる。
- D-022における現行の機械検証（Current enforcement）の対象は、Dialog / Combobox / Listbox / Menuとする。
