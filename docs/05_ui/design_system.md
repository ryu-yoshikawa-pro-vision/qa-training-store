# デザインシステム・レスポンシブ設計

## 1. 方針

- 架空店舗名は `Scenario Shop` とし、製品説明用の名称である「ECテスト自動化学習アプリ」とは明確に分離する。
- 洗練された印象は装飾の多さではなく、情報の優先順位、余白、状態表示、そして次に取るべき操作の分かりやすさによって実現する。
- ストアフロントでは商品画像と購入判断を最優先とし、管理画面（Admin）ではテーブルやフォームの可読性と操作効率を最優先とする。
- フェーズ1ではライトテーマのみを提供し、ダークモードは対象外とする。
- Webとネイティブアプリでトークンと設計上の意味を共通化しつつ、操作コンポーネントについては各プラットフォーム固有の実装を許容する。
- 外部Webフォント、大規模なUIフレームワーク、および外部画像CDNは使用しない。

## 2. 視覚表現

### ストアフロント

- 背景色は白（White）を基本とし、セクションの区切りには `surface-subtle` を使用する。
- 商品画像はアスペクト比1:1とし、明るい無地またはシンプルな生活背景で統一する。
- アクセントカラーは主要なCTA（コールトゥアクション）、選択状態、およびリンクのみに限定して使用する。
- 商品カード（Product Card）には不要な枠線やシャドウを重ねず、画像・商品名・価格という情報の並び順を明確にする。

### 管理画面（Admin）

- 背景色は淡いスレート調（Slate）、コンテンツパネルは白（White）とする。
- サイドナビゲーション、ページヘッダー、フィルターバー、テーブルを定型パターンとして統一して使用する。
- KPIチャートの配置ではなく、対応が必要な件数やリソースへのリンク表示を優先する。
- 商品写真の大きさよりも、ステータス、ID、日時、各種操作の情報を高密度に分かりやすく表示することを重視する。

## 3. ブランド・アイコン・画像

| 項目 | 決定事項 |
|---|---|
| ストアフロントロゴ | `Scenario Shop` のワードマーク＋シンプルなショッピングバッグのシンボル |
| 管理画面ラベル | `Scenario Shop Admin` |
| アイコン | 同一のアウトラインアイコンセットで統一。絵文字をアクション用アイコンとして使用しない |
| 商品画像 | 1:1（正方形）、シードデータ内で照明・余白・背景の方針を統一 |
| プレースホルダー | 画像アイコン＋「画像を表示できません」のテキスト |
| テストモード | ヘッダー内に小さな環境バッジを表示。重要な通知はログイン／新規登録（Signup）／チェックアウト画面で再掲 |

## 4. レイアウトトークン

| Token | 値 |
|---|---:|
| spacing-1～9 | 4, 8, 12, 16, 24, 32, 40, 48, 64px |
| radius-small | 4px |
| radius-medium | 8px |
| radius-large | 12px |
| radius-pill | 999px |
| content-max | 1,280px |
| admin-max | 1,440px |
| reading-max | 760px |
| mobile-page-padding | 16px |
| desktop-page-padding | 24px |
| grid-gap-mobile | 12px |
| grid-gap-desktop | 24px |
| control-height-web | 44px |
| control-height-native | 48px |
| minimum-touch-target | 44×44px |
| admin-side-nav-width | 248px |

## 5. タイポグラフィ

OS標準のフォントスタックを使用する。

| Token | Size / Line height / Weight | 用途 |
|---|---|---|
| display | 36 / 44 / 700 | ホームのヒーローセクション |
| heading-1 | 30 / 38 / 700 | 画面タイトル |
| heading-2 | 24 / 32 / 700 | セクション見出し |
| heading-3 | 20 / 28 / 600 | カード／パネル見出し |
| body | 16 / 24 / 400 | 標準本文 |
| body-small | 14 / 20 / 400 | 補足テキスト |
| label | 14 / 20 / 600 | 入力ラベル |
| caption | 12 / 18 / 400 | メタ情報 |
| mono | 14 / 20 / 400 | ID、SKU、バージョン |

モバイル表示時の `display` は32/40、`heading-1` は28/36へと縮小する。なお、可読性確保のため本文フォントサイズは16px未満に縮小しない。

## 6. カラートークン

| Token | Foreground / Background |
|---|---|
| storefront-background | `#FFFFFF` |
| admin-background | `#F8FAFC` |
| surface | `#FFFFFF` |
| surface-subtle | `#F8FAFC` |
| surface-muted | `#F1F5F9` |
| text-primary | `#0F172A` |
| text-secondary | `#475569` |
| text-disabled | `#64748B` |
| border | `#CBD5E1` |
| border-strong | `#94A3B8` |
| action-primary | `#1D4ED8` |
| action-primary-hover | `#1E40AF` |
| action-secondary | `#334155` |
| focus | `#7C3AED` |
| sale | `#B91C1C` / `#FEF2F2` |
| success | `#166534` / `#DCFCE7` |
| warning | `#92400E` / `#FEF3C7` |
| danger | `#B91C1C` / `#FEE2E2` |
| info | `#075985` / `#E0F2FE` |

テキストと背景色の組み合わせは、WCAG AA基準を満たしていることを自動テストおよび手動確認の両面で担保する。また、各種状態の表現にはテキストやアイコンを併用し、色のみに依存した伝達は行わない。

## 7. エレベーション

| Token | 値 |
|---|---|
| shadow-card | `0 1px 2px rgba(15,23,42,.08)` |
| shadow-sticky | `0 -4px 16px rgba(15,23,42,.10)` |
| shadow-popover | `0 8px 24px rgba(15,23,42,.16)` |
| shadow-modal | `0 20px 40px rgba(15,23,42,.24)` |

ネイティブアプリ環境では、プラットフォーム固有の対応するElevationやShadowプロパティへ変換して適用する。

## 8. 共通コンポーネント

以下の共通コンポーネントを定義・実装する。

StorefrontHeader、StorefrontFooter、MobileBottomNavigation、AdminShell、AdminSideNavigation、PageHeader、Breadcrumbs、LearningNotice、TestModeBadge、Button、IconButton、Text/Password/NumberField、Select、Checkbox、RadioGroup、Combobox、FormErrorSummary、InlineError、StatusBadge、MembershipBadge、ProductCard、ProductGallery、PriceDisplay、ShippingProgress、RatingDisplay、RatingDistribution、VariationSelector、QuantityControl、FilterBar、AppliedFilterChips、ResourceIndex、ResourceDetailsLayout、ContextualSaveBar、BulkActionBar、Empty/Error/LoadingState、ConfirmDialog、Modal/BottomSheet、Pagination、StepIndicator、OrderTimeline。

## 9. ボタン

- バリエーション：Primary、Secondary、Tertiary、Danger。
- サポート状態：default、hover、focus、pressed、disabled、loading。
- ローディング中（loading）はラベル表示を「処理中」へ切り替え、ボタン幅が急激に変化しないよう制御する。
- アイコンのみのボタン（Icon-only）には、アクセシブルネームの設定を必須とする。
- 破壊的操作（Danger）を実行する際は、確認ダイアログの表示または明示的な入力を要求する。
- 商品詳細画面における主要CTAは「カートに追加」、チェックアウト画面では「注文を確定する（¥12,340）」の形式とする。

## 10. フォーム

- 各項目の配置順は、ラベル（Label）、必須／任意テキスト、補足説明、入力コントロール（Control）、エラーメッセージ（Error）の順とする。
- チェックアウト画面は原則として1列のフォームレイアウトとする。ただし、管理画面の商品編集のみ、セクション単位で整理された2列レイアウトを許容する。
- エラーサマリー（Error Summary）はフォームの先頭に配置し、送信エラー（Submit Error）発生時はサマリーへ自動でフォーカスを移動させる。
- エラーサマリー内のリンクをクリックした際、該当する入力フィールドへ直接移動できるようにする。
- フォーカスリングは幅2px、`focus` トークンの色を用い、オフセットは2pxとする。
- 数値入力フィールド（Number）は、単位を視覚的テキストおよびアクセシブルネームの両面で明示する。
- 任意の入力項目には「任意」とテキストで明示し、必須項目のみにアスタリスク（*）を付与するような不十分な区別は行わない。

## 11. レスポンシブブレークポイント

| 区分 | 幅 | レイアウト |
|---|---:|---|
| compact | 360～599 | ストアフロント：商品グリッド2列、ボトムナビゲーション、16pxパディング |
| medium | 600～899 | ストアフロント：商品グリッド3列、24pxパディング |
| large | 900～1279 | ストアフロント：商品グリッド4列、ヘッダーナビゲーション |
| wide | 1280以上 | 最大幅（`content-max`）で中央揃え配置 |

管理画面は画面幅1,024px未満の場合、閲覧および説明テキストのみを表示し、編集操作は無効化する。

## 12. 商品グリッド

- 画面幅に応じた列数：
  - 360〜599px：2列
  - 600〜899px：3列
  - 900px以上：4列
- CSS Gridには `minmax(0, 1fr)` を採用し、カード要素に固定の最小幅を持たせない。
- 画像のアスペクト比は1:1、商品名は最大2行までの表示とする。
- 最小幅360pxの環境でも、左右パディング16pxおよびグリッドギャップ12pxを確実に確保する。

## 13. 管理テーブル

- ページネーションは1ページあたり20件とし、固定ヘッダー（Sticky Header）はデスクトップ表示時のみ適用する。
- ヘッダーセルとデータセルを意味的に関連付け、並び替え（ソート）状態を適切に通知する。
- 画面の横幅が不足する場合は、テーブル全体を水平スクロール可能とする。
- 重要な操作は独立したボタンとして明示し、補助的な操作のみ行メニュー（Row Menu）内に収める。
- 複数選択用のチェックボックス（Selection）は、一括操作（Bulk Action）の対象となる画面でのみ表示する。
- 読み込み中（Loading）は、テーブルの列構造を維持したスケルトンUIを表示する。

## 14. モーション

- アニメーション時間：通常のトランジションは150ms、モーダル表示は200msとする。
- OSの「視覚効果を減らす（`prefers-reduced-motion`）」が有効な場合は、所要時間を0msとする。
- 自動テスト用ビルド（Automation Build）では、常時0msとする。
- ローディング表示においては、装飾的なアニメーションよりも現在の状態を示すテキストの明示を優先する。