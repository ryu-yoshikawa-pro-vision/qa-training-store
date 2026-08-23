# Implementation Plan: Mobile / Web 画像横オーバーフロー修正

- 作成日: 2026-08-23
- Issue: N/A
- Status: Draft
- Verification Level: Standard

## 1. 概要

### 背景

Mobile で商品画像が画面幅を超えて表示されるケースが確認されている。

現状の `NativeProductImage` は `width: "100%"`、`aspectRatio`、`resizeMode` を使用しており、単純に「元画像が大きいのにリサイズしていない」実装ではない。そのため、画像単体ではなく、`ScrollView`、カード、row レイアウトなどの祖先要素が viewport より広がり、その幅を基準に画像の `100%` が計算されている可能性を優先して確認する。

Web の共通 `ProductImage` は画像要素に `width: 100%`、`height: 100%`、`object-fit: cover` 相当の制約があり、Mobile より防御的な実装になっている。ただし、親要素の flex/grid 制約などによる横オーバーフローの可能性は残るため、Web も同時に再現確認し、必要な場合のみ本体コードを修正する。

### 目的

- Mobile で横オーバーフローを発生させている最初のレイアウト要素を特定する。
- 症状である画像だけを場当たり的に縮めるのではなく、原因となるレイアウト制約を最小限修正する。
- Web についても同じ画像導線を確認し、横オーバーフローが存在する場合のみ原因箇所を修正する。
- 320px / 390px の狭幅で再発を検出できる回帰テストを追加する。

### スコープ

対象:

- Native の商品画像を表示する一覧・詳細・購入系画面
- `NativeProductImage` と、その親となる共通レイアウト / row / card / `ScrollView` の幅制約
- Web の商品一覧・商品詳細など、共通 `ProductImage` を使用する主要画面
- Mobile / Web の狭幅レイアウト回帰テスト

対象外:

- 画像アセット自体の圧縮・変換・CDN 最適化
- 商品画像の差し替え
- デザイン刷新
- バックエンド / API / DB の変更
- 横オーバーフローと無関係なレスポンシブ改善

## 2. 要件 / 受け入れ条件

### Mobile

- 390x844 で、対象となる商品画像画面に横方向のはみ出しがないこと。
- 320x700 でも、対象となる商品画像画面に横方向のはみ出しがないこと。
- 商品画像がカードまたはコンテンツ領域の幅を超えないこと。
- 修正後も画像のアスペクト比と既存の `resizeMode` の意図を維持し、画像を不自然に引き伸ばさないこと。
- 長い商品名、価格、バッジ、ボタン等の兄弟要素が幅を押し広げている場合は、その要素側を修正すること。
- 端末幅をハードコードして回避しないこと。

### Web

- Chromium の通常デスクトップ幅で既存レイアウトを壊さないこと。
- Firefox の通常デスクトップ幅で既存レイアウトを壊さないこと。
- Chrome mobile 390x844 で root document の横オーバーフローが発生しないこと。
- 境界幅 320x700 でも root document の横オーバーフローが発生しないこと。
- 商品画像の bounding box が viewport / 想定コンテナを超えないこと。
- Web で問題が再現しない場合、`ProductImage` や CSS を予防目的だけで変更しないこと。回帰テスト追加に留めること。

### 共通

- `overflow-x: hidden` などで根本原因を隠す修正を主対応にしないこと。
- 最初に viewport を超える祖先要素を特定してから修正すること。
- 既存の lint / typecheck / component test / relevant E2E を通すこと。

## 3. 設計方針

### 3.1 調査は必要だが、範囲を限定する

今回、修正前の調査は必要とする。ただし「画像周辺を広く調べる」こと自体を目的にせず、以下だけを短時間で確認してそのまま実装修正に進む。

1. 390x844 と 320x700 で症状を再現する。
2. 画像から祖先要素へ遡り、最初に viewport 幅を超える要素を特定する。
3. その要素を広げている直接要因を特定する。
   - `width` / `minWidth`
   - row 内の子要素の shrink 不足
   - `flex` / `alignSelf`
   - padding と固定幅の合算
   - ScrollView content の幅拘束不足
4. 原因箇所だけを修正する。

元画像の pixel size が大きいことだけを根拠に、画像ファイルや `Image` のサイズ指定を変更しない。

### 3.2 Native の優先修正順

以下の順に原因を確認し、上位で解決できる場合は下位への防御コードを増やさない。

1. 各画面の共通 content / `ScrollView` の幅制約
2. card / row / text / action 領域の flex 制約
3. `NativeProductImage` の wrapper
4. `NativeProductImage` 本体

想定される修正候補は、原因に応じて `width: "100%"`、`alignSelf: "stretch"`、`flexShrink: 1`、`minWidth: 0` 相当の制約を適切なレイヤーへ置くこととする。

ただし、実測前にこれらを一律追加しない。

### 3.3 Web は再現有無で変更範囲を分岐する

Web の共通 `ProductImage` は現状の画像制約を維持する。

- Web で横オーバーフローが再現しない:
  - production code は変更しない。
  - 横オーバーフロー回帰テストのみ追加 / 強化する。
- Web で再現する:
  - overflow を発生させている最初の flex/grid/card/container を特定する。
  - `min-width: 0`、`max-width: 100%` 等、原因に対応した局所修正を行う。
  - グローバルな `overflow-x: hidden` では隠さない。

### 3.4 テスト方針

React Native の component test だけでは実 viewport のレイアウト計算を完全には再現できないため、役割を分ける。

- Native component test:
  - 共通画像コンポーネント / 変更した style contract の退行防止
- Native boundary 実行:
  - 320 / 390 幅における実画面の表示確認
- Web Playwright:
  - `document.documentElement.scrollWidth <= document.documentElement.clientWidth`
  - 対象画像 / カードの bounding box が viewport 外へ出ていないこと

## 4. 実装ステップ

### Step 0. 実装開始時の作業記録を初期化する

実装担当者はこのブランチを継続利用する。

- Branch: `fix/mobile-web-image-overflow`

リポジトリルールに従い、実装開始時に `.codex/runs/<timestamp>_mobile-web-image-overflow/` を初期化し、調査結果・変更理由・検証結果を記録する。

この計画作成時点では実装コードおよび run artifact は作成しない。

### Step 1. Native の再現箇所と原因要素を特定する

確認対象:

- `src/presentation/native/native-components.tsx`
- `src/presentation/native/native-screens.tsx`
- `src/presentation/native/native-purchase-screens.tsx`

実施内容:

1. `NativeProductImage` の全 call site を列挙する。
2. 商品一覧、商品詳細、カート / 購入導線など、実際に画像を表示する代表画面を特定する。
3. 390x844 と 320x700 で対象画面を確認する。
4. 画像自身と祖先 View / card / row / `ScrollView` content の幅を比較する。
5. viewport より大きくなる最初の要素を原因候補として記録する。
6. その要素が広がる理由を特定してから Step 2 へ進む。

停止条件:

- 「どの要素が最初に viewport を超えるか」が特定できた時点で調査を終了する。
- 原因が特定できているのに追加の網羅調査を続けない。

### Step 2. Native の原因箇所を最小修正する

実施内容:

1. Step 1 で特定した最上流の原因箇所を修正する。
2. row 内の text / action 等が押し広げている場合は画像側ではなく兄弟要素の shrink / minWidth を修正する。
3. 共通 content 自体が広がっている場合は screen / ScrollView 側で viewport 内へ拘束する。
4. 画像 wrapper に追加防御が必要な場合のみ `NativeProductImage` を変更する。
5. 固定 pixel 幅や特定機種専用分岐は追加しない。
6. 390x844 と 320x700 の双方で再確認する。

### Step 3. Native の回帰テストを追加 / 更新する

候補:

- `tests/component/native/native-components.test.tsx`
- `tests/component/native/native-product-detail.test.tsx`
- `tests/component/native/native-purchase.test.tsx`

実施内容:

1. 変更した共通 style contract を component test で固定する。
2. 商品詳細 / 購入画面の変更を伴う場合、該当 screen test に必要最小限の回帰ケースを追加する。
3. 実 viewport 固有の挙動を Jest の style assertion だけで「検証済み」と扱わない。

### Step 4. Web の横オーバーフローを再現確認する

確認対象:

- `src/presentation/components/product-image.tsx`
- `ProductImage` の style 定義
- `e2e/web/mobile-boundary.spec.ts`
- 必要に応じて `e2e/web/responsive-layout.spec.ts`
- 商品一覧 / 商品詳細の関連 E2E

実施内容:

1. Chromium desktop で商品一覧 / 商品詳細を確認する。
2. Firefox desktop でも主要画面を確認する。
3. mobile-chromium 390x844 と 320x700 で確認する。
4. `scrollWidth` と `clientWidth` を比較する。
5. overflow がある場合は、画面上の要素の `getBoundingClientRect()` を確認し、viewport を超える最初のコンテナを特定する。
6. Web で問題が再現しなければ production code を変更せず Step 6 へ進む。

### Step 5. Web で再現した場合のみ原因箇所を修正する

実施内容:

1. 親 flex/grid/card/container の制約を局所的に修正する。
2. `ProductImage` 自体に既に存在する画像フィット制御を重複実装しない。
3. グローバル CSS で横スクロールを強制的に隠さない。
4. desktop / 390 / 320 の全対象幅で再確認する。

### Step 6. Web の回帰テストを追加 / 強化する

主対象:

- `e2e/web/mobile-boundary.spec.ts`

必要に応じて:

- `e2e/web/responsive-layout.spec.ts`
- 商品一覧 / 商品詳細 E2E

最低限追加する検証:

1. 390x844 で root document に横オーバーフローがない。
2. 320x700 で root document に横オーバーフローがない。
3. 代表的な商品画像の右端が viewport を超えない。
4. 画像を含む主要カード / 詳細領域が viewport を超えない。

汎用 helper を追加する場合は、テスト内で利用価値が複数箇所ある場合だけ共通化する。1 回しか使わない helper は作らない。

### Step 7. 最終検証を行う

変更範囲に応じて、最低限以下を実行する。

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test:component:native
pnpm run test:e2e:mobile-boundary
```

Web production code または Web E2E を変更した場合:

```bash
pnpm run test:component:web
pnpm run test:e2e:chromium
pnpm run test:e2e:smoke:firefox
```

最終的にリポジトリ全体の品質ゲートも確認する。

```bash
pnpm run verify
```

環境依存で Native 実機 / Android boundary suite を実行可能な場合は、以下も実施する。

```bash
pnpm run native:android:test:boundary
```

実行不能な場合は成功扱いにせず、未実施理由と代替確認結果を run artifact に記録する。

## 5. テスト計画

| 対象 | 条件 | 期待結果 |
| --- | --- | --- |
| Native 商品一覧 | 390x844 | 商品画像 / card が viewport を超えない |
| Native 商品一覧 | 320x700 | 商品画像 / card が viewport を超えない |
| Native 商品詳細 | 390x844 | 詳細画像が content 幅以内に収まる |
| Native 商品詳細 | 320x700 | 詳細画像が content 幅以内に収まる |
| Native 購入系画面 | 320 / 390 | 画像を含む row が横へ押し広がらない |
| Native component | unit / component | 変更した style contract が維持される |
| Web 商品一覧 | Chromium desktop | 既存 desktop レイアウトに退行がない |
| Web 商品詳細 | Firefox desktop | 既存 desktop レイアウトに退行がない |
| Web 商品一覧 / 詳細 | 390x844 | `scrollWidth <= clientWidth` |
| Web 商品一覧 / 詳細 | 320x700 | `scrollWidth <= clientWidth` |
| Web 商品画像 | 320 / 390 | bounding box が viewport 外へ出ない |

追加で確認するエッジケース:

- 長い商品名
- 長い価格 / バッジ表示
- 画像読み込み成功時
- 画像読み込み失敗時 / fallback 表示
- 商品画像が複数カードで連続する一覧

## 6. リスクと対策

| リスク | 内容 | 対策 |
| --- | --- | --- |
| 症状だけを隠す | `overflow: hidden` や画像の強制縮小で本当の原因を残す | 最初に viewport を超える祖先要素を特定して修正する |
| 過剰修正 | 共通 screen style を広く変えて無関係な画面を壊す | 共通変更は call site と影響範囲を確認し、最小の style だけ変更する |
| 画像比率の退行 | 幅修正により画像が潰れる / 不自然に crop される | `aspectRatio` / `resizeMode` / `object-fit` の既存意図を維持する |
| Web の不要変更 | Mobile の症状だけを根拠に Web CSS まで変更する | Web は再現した場合のみ production code を変更する |
| テストの偽陽性 | root の `scrollWidth` だけでは一部 clipping を見逃す | 代表画像 / card の bounding box も確認する |
| Jest で実画面を代替 | React Native component test では viewport layout を完全再現できない | boundary 実行 / 実機確認を別レイヤーで実施する |
| 320px だけの局所対応 | 320px を直して 390px / desktop を壊す | 320 / 390 / desktop をセットで確認する |

## 7. ロールバック方針

- DB / API / 永続データ変更はないため migration rollback は不要。
- レイアウト変更で退行が発生した場合は、原因箇所の style 変更と対応する回帰テストを同じ単位で revert する。
- Web で再現しなかった場合は production code を触らないため、Web 側の rollback 対象は原則テストのみとなる。
- グローバル CSS 変更を避け、ロールバック範囲を局所化する。

## 8. 変更対象ファイル

### 調査対象

- `src/presentation/native/native-components.tsx`
- `src/presentation/native/native-screens.tsx`
- `src/presentation/native/native-purchase-screens.tsx`
- `src/presentation/components/product-image.tsx`
- `ProductImage` の style 定義ファイル
- `tests/component/native/native-components.test.tsx`
- `tests/component/native/native-product-detail.test.tsx`
- `tests/component/native/native-purchase.test.tsx`
- `e2e/web/mobile-boundary.spec.ts`
- `e2e/web/responsive-layout.spec.ts`

### 変更候補

必須とはせず、原因に応じて変更する。

- Native で最初に viewport を超える原因を持つ screen / shared component
- Native の関連 component test
- `e2e/web/mobile-boundary.spec.ts`
- Web で overflow が再現した場合のみ、原因となる Web container / style
- 必要な場合のみ関連 Web E2E

### 変更しない方針のもの

- 画像アセット
- API / domain / repository 層
- `ProductImage` の既存 fit 処理（Web で原因と判明しない限り）
- グローバルな横スクロール禁止設定

## 9. 実装開始前チェック

- [ ] `fix/mobile-web-image-overflow` を作業ブランチとして使用している
- [ ] `.codex/runs/` の作業記録を初期化した
- [ ] `NativeProductImage` の call site を確認した
- [ ] 390x844 で症状を再現 / 非再現として記録した
- [ ] 320x700 で症状を再現 / 非再現として記録した
- [ ] viewport を超える最初の祖先要素を特定した
- [ ] 原因特定前に `overflow: hidden` や画像の固定サイズを追加していない
- [ ] Web の商品一覧 / 商品詳細を確認した
- [ ] Web で再現しない場合は production code を変更しない方針を維持している
- [ ] 修正後の 320 / 390 / desktop の確認手順を確保した
