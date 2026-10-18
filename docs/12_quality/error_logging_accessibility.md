# エラー・ログ・アクセシビリティ設計

## 1. フェーズ1 エラー契約

エラーコード、`ApplicationError`、`messageKey`、`fieldErrors`、`retryable`の正本は`04_data/application_contracts.md`です。本書では別のError Union型を再定義しません。AdapterやRepositoryで発生した例外（Exception）はユースケース境界で`ApplicationError`へと変換し、UI側では表示用途として`messageKey`と`fieldErrors`のみを使用します。

`messageKey`は原則として`error.<ApplicationErrorCode>`形式とし、個別のフィールドエラーにはバリデーションスキーマのキーを使用します。フェーズ2や3に固有のエラーをフェーズ1へ先行して追加することはありません。

## 2. エラー挙動

- バリデーションエラー、競合（Conflict）、書き込み失敗（Write Failure）の発生時は、入力内容を可能な範囲で保持する。
- フォーム送信エラーの発生時はエラーサマリーへフォーカスを当て、サマリー内のリンクから該当フィールドへ移動できるようにする。
- 決済失敗（Payment failed）時は、注文詳細画面から再支払いできる旨を案内する。
- 決済処理中（Payment processing）は、状態確認のみを表示する。
- ページ読み込みエラーの発生時は、再試行（リトライ）操作と安全な戻り先を表示する。
- 検索サジェストのエラー発生時も入力自体は妨げず、Enterキーでの検索を利用可能とする。
- 画像マニフェスト（Image Manifest）の欠落・ハッシュ不一致・容量超過が発生した場合は`build:web`を失敗させ、デプロイを行わない。実行時におけるマニフェスト復旧（Runtime Manifest Recovery）、キャッシュ、フォールバック分岐は実装しない。個別の画像要素の読み込み失敗時のみプレースホルダーと代替テキストを表示し、商品の閲覧・カート・注文・管理操作は継続する。
- 商品やバリアント（Product/Variant）の削除が拒否された場合は、非公開または無効化という代替操作を提示する。
- 顧客に対してデータベース名、内部例外（Exception）、スタックトレースを表示しない。

## 3. 実行時ログ

開発コンソールおよびテスト成果物（Test Artifact）へ、timestamp、level、eventCode、route、useCase、userId、entityId、correlationId、Version、Error Code、Test Metadataを出力します。

永続的なリングバッファ（Ring Buffer）は作成せず、パスワード、ハッシュ値、セッション情報、住所全文、電話番号全文はログに出力しません。

## 4. アクセシビリティ

- WCAG 2.2 レベルAA相当の達成を目標とする。
- 見出し（Heading）、ランドマーク（Landmark）、ラベル（Label）、ロール（Role）、アクセシブルな名前（Accessible Name）を適切に使用する。
- エラーサマリーは`role=alert`または適切なライブリージョン（Live Region）として通知し、送信（Submit）後にサマリーへフォーカスを当てる。
- サマリー内のエラーリンクから該当フィールドへ移動できるようにする。
- モーダル表示時はフォーカストラップを行い、閉じた後は元の要素へフォーカスを復帰させる。
- カートの更新、支払い結果、注文完了はライブリージョンで通知する。
- 色のみに依存して状態を表現しない。
- Webの主要な導線（フロー）は、キーボード操作のみで完結できるようにする。
- 検索サジェストはARIA Comboboxパターンに準拠する。
- 星評価（レーティング）はラジオグループ（Radio Group）とし、現在値と選択値を読み上げ可能にする。
- ドラッグによる並べ替え機能には、代替手段として上下移動ボタンを用意する。
- 適用中フィルターチップ（Applied Filter Chip）の削除ボタンには、アクセシブルな名前に条件名を含める。
- 画面固定の購入ボタン（Sticky CTA）は、200%ズーム表示、ソフトウェアキーボードの表示、フォーカス移動を妨げない設計とする。

## 5. 自動検査

Playwright＋axe、ロール・名前のアサーション（Role/Name Assertion）、キーボード操作によるE2Eテストを使用します。重大（Critical）・深刻（Serious）な違反は、フェーズ1のリリース前に解消します。

重点対象:

- ストアフロント ヘッダー／検索コンボボックス（Storefront Header / Search Combobox）
- モバイル用フィルターボトムシート（Mobile Filter Bottom Sheet）
- 商品ギャラリーダイアログ（Product Gallery Dialog）
- バリエーションセレクター（Variation Selector）
- チェックアウト エラーサマリー（Checkout Error Summary）
- 評価用ラジオグループ（Rating Radio Group）
- 管理画面サイドナビゲーション、テーブル、コンテキスト保存バー（Admin Side Navigation、Table、Contextual Save Bar）
- 画像アセットピッカー、SKU編集、商品削除確認（Image Asset Picker、SKU編集、商品削除確認）
