# Implementation Plan: Mobile / Web 商品画像オーバーフロー修正

- 作成日: 2026-08-23
- Issue: N/A
- Status: Draft
- Verification Level: Standard

## 0. 依頼概要

- 依頼内容:
  - Mobile で商品画像が画面内に収まらない問題を調査し、原因箇所だけを修正する。
  - Web でも同種の問題がないか確認する。
- 背景:
  - Native の共通画像コンポーネントは既に `width: "100%"`、`aspectRatio`、`resizeMode` を使用しているため、元画像サイズだけを理由に画像ファイルや画像コンポーネントへ追加の縮小処理を入れるべきではない。
  - Web には 390x844 / 320x700 の UI review と横オーバーフロー検証が既に存在するため、今回のために同等のテスト基盤を新設する必要はない。
- 期待成果:
  - Native で実際の原因を特定し、最小限のレイアウト修正で商品画像を画面 / コンテンツ領域内に収める。
  - Web は既存テストで確認し、問題が再現した場合のみ本体コードを修正する。
  - 不要な共通化、wrapper 追加、グローバル CSS、専用テスト基盤は追加しない。

## 1. ゴール / 完了条件

### ゴール

Native の商品画像が画面または想定コンテナからはみ出す原因を特定し、その直接原因だけを修正する。Web は既存の狭幅 UI review を利用して同種の退行がないことを確認する。

### 完了条件（DoD）

- Native:
  - 問題が確認された商品画像画面で、画像が画面 / カード / コンテンツ領域からはみ出さない。
  - 修正箇所が、実際に幅を押し広げている要素またはその直接原因に限定されている。
  - 既存の画像比率と `resizeMode` の意図を維持する。
  - 固定端末幅、機種別分岐、不要な wrapper、症状を隠すだけの clipping を追加しない。
  - 可能な実Runtimeで標準 390x844 と境界 320x700 相当を確認する。実行環境上どちらかを再現できない場合は、未実施理由と代替確認結果を run artifact に記録する。
- Web:
  - 既存の UI review / mobile boundary の仕組みで `/products` と代表商品詳細を確認する。
  - 390x844 / 320x700 で横オーバーフローが再現しない場合、Web production code と Web test は変更しない。
  - 再現した場合のみ、原因となる既存 container / flex / grid / image style を局所修正し、既存テストへ必要最小限の回帰検証を追加または強化する。
- 共通:
  - 今回の変更に直接関係する targeted test が通る。
  - 最終的に `pnpm run verify` が通る。実行不能な項目がある場合は未実施理由を記録する。

## 2. 現状理解と前提

### Current understanding

- Native の `NativeProductImage` は直接 `Image` を返し、共通 `styles.productImage` に `width: "100%"` と画像比率が設定されている。
- Native の `productImageDetail` は detail 用比率、`productImageThumbnail` は固定 thumbnail size を持つ。
- Native の主要画面は `ScrollView` の `contentContainerStyle={styles.scroll}` を共通利用している。
- `styles.row` は `flexDirection: "row"` と `gap` を持つため、画像以外の row 子要素が幅を押し広げる可能性もある。
- Web の `ProductImage` は共通 wrapper 内で `img` を表示し、CSS 側で画像を container 内へ収める構成になっている。
- Web の `ui-review.spec.ts` は route 単位で横オーバーフローを検証しており、`/products` と代表商品詳細を含む。
- Playwright には 390x844 の `ui-review-mobile` と 320x700 の `ui-review-small-mobile` が既にある。
- `e2e/web/mobile-boundary.spec.ts` にも横オーバーフロー確認 helper が既に存在する。
- `native:android:test:boundary` は viewport 幅の検証ではなく、再起動・在庫・購入上限等の状態境界 Maestro suite であるため、今回の画像サイズ検証の必須手段にはしない。

### Assumptions

- 現象は商品画像そのもの、または画像を含む親 / 兄弟レイアウトの幅計算による表示オーバーフローである可能性が高い。
- 「横オーバーフロー」が第一候補だが、実Runtimeで別方向のサイズ計算問題と判明した場合は、同じ方針で実際の原因を修正する。
- Web は現行実装と既存 UI review から問題がない可能性が高いが、実行結果で判断する。

### Non-goals

- 画像アセットの圧縮・変換・差し替え
- CDN / backend / API / DB の変更
- 商品カードや商品詳細のデザイン刷新
- 横オーバーフローと無関係なレスポンシブ改善
- 新しい Native viewport test harness の構築
- 新しい Web responsive E2E ファイルの新設
- Firefox 固有のレイアウト検証追加
- 画像読み込み失敗 / fallback の追加検証（今回の原因に関係すると判明した場合を除く）
- 長い商品名 / badge / price 等の網羅テスト（原因要素と判明した場合を除く）

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

- なし。実装前の再現確認で原因箇所を特定できるため、現時点でユーザー判断が必要な blocking question はない。

### 仮定してよい細部

- Native の修正対象ファイルは、再現時に最初に幅を超える要素を持つ既存 screen / shared component とする。
- Web は既存 UI review の結果を正本とし、非再現なら変更しない。

### 未回答の重要質問

- なし。

## 4. 影響範囲

### Impacted areas

- Native の商品画像を表示する Home / Catalog / Product Detail / Cart・購入系のうち、実際に症状が再現する画面
- Native の共通画像 / row / card / ScrollView content style のうち、原因と特定された箇所
- Web の `/products` と代表商品詳細の確認
- 原因箇所を変更した場合の既存 component / E2E test

### Files to inspect

Native:

- `src/presentation/native/native-components.tsx`
- `src/presentation/native/native-screens.tsx`
- `src/presentation/native/native-purchase-screens.tsx`
- `tests/component/native/native-components.test.tsx`
- `tests/component/native/native-catalog-screen.test.tsx`
- `tests/component/native/native-product-detail-screen.test.tsx`
- `tests/component/native/native-cart-screen.test.tsx`
- `tests/component/native/native-purchase-screens.test.tsx`

Web:

- `src/presentation/components/product-image.tsx`
- Web の既存 style 定義ファイル
- `e2e/web/ui-review.spec.ts`
- `e2e/web/mobile-boundary.spec.ts`
- `playwright.config.ts`

上記は調査候補であり、原因と無関係なファイルは変更しない。

## 5. 変更方針

### Change strategy

1. Native で症状を再現する。
2. 画像自身から親方向へ確認し、画面 / 想定 container を最初に超える要素を特定する。
3. その要素を広げている直接原因だけを修正する。
4. 修正画面と、同じ shared style を使う代表画面だけを再確認する。
5. Web は既存 UI review で確認し、再現しなければ変更しない。
6. targeted test 後に `pnpm run verify` を実行する。

原因確認時に見る候補:

- `width` / `minWidth`
- `flex` / `flexShrink`
- row 子要素の幅拘束
- padding と固定幅の合算
- `ScrollView` content の幅
- 画像自身の `width` / `aspectRatio`

候補 style を一律追加してはならない。実測または実画面確認で原因と判断した箇所だけを変更する。

### 実行タスク

- [ ] 1. 実装開始時にリポジトリルールに従って active run を初期化 / 再利用する。
- [ ] 2. Native で問題が確認できる商品画像画面を再現する。
- [ ] 3. 画像 → 親 container の順に確認し、最初に画面 / 想定 content 幅を超える要素と直接原因を特定する。
- [ ] 4. 原因箇所だけを最小修正する。
- [ ] 5. 修正画面を再確認し、同じ shared style を変更した場合のみ影響する代表画面も確認する。
- [ ] 6. 変更した contract に対応する既存 Native test を必要最小限更新する。style assertion だけで実viewport確認を代替しない。
- [ ] 7. Web の既存 `ui-review.spec.ts` を 390x844 / 320x700 の既存 project で実行し、`/products` と代表商品詳細を確認する。
- [ ] 8. Web で再現しなければ Web production code / test を変更しない。再現した場合のみ原因箇所と既存テストを最小修正する。
- [ ] 9. targeted test と `pnpm run verify` を実行し、結果を run artifact に記録する。

### 禁止する対応

- 原因特定前に `overflow: hidden` / clipping を追加して症状だけを隠す
- `NativeProductImage` のためだけに wrapper を新設する
- 320px / 390px 固有の固定 width を追加する
- Web で問題が再現していないのに `max-width` 等を予防目的で追加する
- 既存 UI review と同等の新規 E2E を重複追加する
- 今回のために Native viewport 専用 harness を新設する

## 6. 検証方法

### Validation plan

#### Native

- 実Runtimeで、症状が出る画面を修正前後で確認する。
- リポジトリの基準に合わせ、可能なら 390x844 と 320x700 相当で確認する。
- shared style を変更した場合のみ、その style を使用する代表画面を追加確認する。
- 変更した component / screen に既存 component test がある場合、そのテストを targeted test として実行する。
- `native:android:test:boundary` は今回の viewport 検証手段としては使用しない。

#### Web

既存 UI review を利用する。

- `ui-review-mobile`: 390x844
- `ui-review-small-mobile`: 320x700
- 対象 route:
  - `/products`
  - `/products/product-basic-shirt`
- 既存 `expectNoHorizontalOverflow` による `scrollWidth <= clientWidth + 1` の結果を確認する。
- 画像または container が見た目上はみ出している疑いが残る場合のみ、既存テスト内で対象要素の bounding box assertion を追加する。
- Web で非再現なら test file 自体も変更しない。

#### 最終品質ゲート

開発中は変更範囲に対応する targeted test のみ実行し、最後に以下を実行する。

```bash
pnpm run verify
```

Web UI review の実行コマンドは `package.json` の現行 script / Playwright project 定義を確認し、既存コマンドを使用する。今回のための新規 script は追加しない。

### 成功判定

- Native の再現画面で商品画像が想定 container 内に収まる。
- 修正が原因箇所に限定されている。
- 同じ shared style を使う代表画面に退行がない。
- Web は既存 390 / 320 UI review で対象 route に横オーバーフローがない、または再現した問題を最小修正後に解消している。
- `pnpm run verify` が成功する、または環境依存で実行不能な項目が明確に記録されている。

## 7. リスクと未解決論点

### Risks

| リスク | 内容 | 対策 |
| --- | --- | --- |
| 症状だけを隠す | clipping や画像縮小だけで親レイアウト問題を残す | 最初に幅を超える要素と直接原因を確認する |
| 共通 style の過剰修正 | 1画面の問題で他画面を壊す | shared style を変える場合だけ代表 call site を追加確認する |
| テストの過剰追加 | 既存 UI review と重複した E2E を増やす | 既存テストを優先し、非再現なら Web test を変更しない |
| Native test の誤用 | style assertion や状態 boundary suite を viewport 検証と誤認する | 実Runtime確認を主とし、component test は contract 退行防止に限定する |
| 画像比率の退行 | width 修正で画像が潰れる / crop が変わる | 既存 `aspectRatio` / `resizeMode` の意図を維持する |

### Open questions

- なし。実Runtime再現時に判明する原因は実装判断として局所的に処理できる。

## 8. 成果物

### 変更ファイル

必須の固定リストは設けない。実際の原因に応じて以下のみ変更する。

- 原因を持つ Native screen / shared component
- 変更した contract を担保する既存 Native test（必要な場合のみ）
- Web で問題が再現した場合のみ、原因となる既存 Web style / component と既存 E2E

### 付随ドキュメント

- `.codex/runs/<run_id>/` の既存ルールに従い、調査結果・変更理由・検証結果を記録する。
- 新規 `docs/reports/` は作成しない。

## 9. 備考

- Branch: `fix/mobile-web-image-overflow`
- この plan の作成・修正時点では実装コードを変更しない。
- 実装中に原因が画像以外の row / text / button 等だと判明した場合も、今回の症状の直接原因であればスコープ内とする。ただし関連のないレスポンシブ改善へ広げない。
