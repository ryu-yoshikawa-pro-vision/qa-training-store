# UI・UX規約

## レスポンシブ挙動

モバイルは767px以下、タブレットは768〜1023px、デスクトップは1024px以上を基本的なブレークポイントとします。ストアフロントおよびカスタマー画面では、390×844を標準モバイル解像度とし、320×700を追加の検証境界として扱います。管理画面は1024px未満では管理操作を提供せず、警告または安全な画面への入口を表示します。

## ビジュアル言語

画面はオフホワイト、ダークネイビー、限定ゴールドを基調とし、8pxグリッド、44px以上のタッチターゲット、枠線を基調としたカードを使用します。カラー、タイポグラフィ、スペーシング、角丸は `src/presentation/design/tokens.ts` と `src/presentation/styles/global.css` を正本とし、仕様書側ではその意味や利用目的のみを定義します。

## アクセシビリティ

主要なフローはキーボード操作のみで完了できます。検索はコンボボックス、評価はラジオグループ、エラーサマリーは見出しおよびリンク、確認操作はダイアログ、フィルターは操作可能なシートとして実装します。エラーを色情報のみで伝えず、ラベル、ロール、テキストを併用します。画面遷移後は、主要な見出しへフォーカスを移動させます。

## 境界領域のユーザー体験

ローディング、データなし、エラー、競合、未検出の各状態を、同一の表示へとひとまとめに集約・混同させません。バリエーション未選択、在庫切れ、価格変更、ログイン拒否、チェックアウトのバージョン不一致、決済失敗、権限拒否の各状態では、利用者が次に実行可能なアクションを明示します。内部の列挙型（Enum）、リポジトリのバージョン、アクターID、ゲートウェイキーなどの内部情報を、カスタマーUIへ露出させません。

## 正本ソース

具体的なラベル、テストID、ルート、トークン、コンポーネント構造については、`src/presentation/`、`app/`、`src/presentation/design/tokens.ts`、`docs/05_ui/` を参照してください。既存のテストコードは回帰確認の記録であり、正式な仕様の判断基準ではありません。

## 画面規約

### SCREEN-BOUNDARY-NOT-FOUND — 未検出

画面カタログ: [画面カタログ](./screen-catalog.md)

#### 機能一覧

- 存在しないルートであることを明示し、利用者がストアフロントへ戻るためのアクションを表示する。
- フレームワーク内部のエントリではなく、ユーザーが直接観測できる境界サーフェスとして扱う。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `all` | `missing-route` | ページが見つからない旨と戻り先の導線を表示する。 | `required` | `web-desktop, android` | `-` | [UI・UX規約](./ui-ux-contract.md#境界領域のユーザー体験), [状態とシナリオ](./state-and-scenarios.md#エラー状態と境界状態) |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-BOUNDARY-NOT-FOUND default web-desktop](assets/screens/SCREEN-BOUNDARY-NOT-FOUND/default/web-desktop.webp)](assets/screens/SCREEN-BOUNDARY-NOT-FOUND/default/web-desktop.webp)

###### Android — 正本画面リファレンス

[![SCREEN-BOUNDARY-NOT-FOUND default android](assets/screens/SCREEN-BOUNDARY-NOT-FOUND/default/android.webp)](assets/screens/SCREEN-BOUNDARY-NOT-FOUND/default/android.webp)
