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
  - Native の共通画像コンポーネントは既に `width: "100%"`、`aspectRatio`、`resizeMode` を使用しているため、元画像サイズだけを理由に追加の縮小処理を入れるべきではない。
  - Web には 390x844 / 320x700 の UI review と横オーバーフロー検証が既にあるため、新しい responsive test harness は不要である。
- 期待成果:
  - Native は実Runtimeで直接原因を特定し、原因箇所だけを最小修正する。
  - Web は既存 UI review で確認し、再現した場合のみ既存コード / テストを最小修正する。

## 1. ゴール / 完了条件

### ゴール

Native の商品画像が画面または想定コンテナからはみ出す直接原因を特定して修正する。Web は既存の狭幅 UI review を使い、同種の問題がないことを確認する。

### 完了条件（DoD）

- Native:
  - 問題が再現した画面で、商品画像が画面 / card / content container 内に収まる。
  - 修正は実際に幅・サイズ計算を壊している箇所に限定する。
  - 既存の画像比率と `resizeMode` の意図を維持する。
  - 再現または原因特定できない場合は production code を推測で変更しない。
  - Native production code を変更した場合は、変更後コードを実際に反映した Runtime で修正後確認を行う。
- Web:
  - `ui-review-mobile`（390x844）と `ui-review-small-mobile`（320x700）で `products` / `products-product-basic-shirt` を確認する。
  - 横オーバーフロー検証だけでなく、生成 screenshot で画像が container 内に自然に収まっていることも確認する。
  - 現行の `object-fit: cover` による通常の crop は仕様として維持し、今回の不具合判定対象にしない。
  - 非再現なら Web production code / test は変更しない。
  - Web production code / test を変更した場合は、同じ 2 route × 2 viewport の UI review を変更後に再実行する。
  - UI review 自体を環境・build・fixture・test harness 等の理由で評価できない場合は Web production code を推測で変更せず、`Web: Blocked` として原因と未実施検証を記録する。
- 共通:
  - production / test code を変更した場合は、対応する targeted test と最終品質ゲートを通す。
  - production / test code を変更しなかった場合は、Markdown 検証と Run Artifact sanitizer を通す。
  - Run Artifact に再現条件、判断、検証結果、Blocked理由を必要に応じて残す。

## 2. 現状理解と前提

### Repo mapping / Current understanding

| 項目 | 確認済み内容 |
| --- | --- |
| Entry points | Native の主要商品画像は Home、Catalog の `NativeProductCard`、Product Detail、Cart / Purchase の thumbnail から `NativeProductImage` を利用する |
| Main flow | Screen / card の親レイアウトが利用可能幅を決め、その幅を `NativeProductImage` の `width: "100%"` が受ける |
| Key abstractions | `NativeProductImage`、`styles.productImage`、`styles.scroll`、`styles.row`、Web の `ProductImage` と `.product-image` |
| Existing Native tests | `native-components.test.tsx`、`native-catalog-screen.test.tsx`、`native-product-detail-screen.test.tsx`、`native-cart-screen.test.tsx`、`native-purchase-screens.test.tsx` |
| Existing Web validation | `ui-review.spec.ts` が route ごとに `scrollWidth <= clientWidth + 1` を確認し、390x844 / 320x700 の project が存在する |
| Existing Web image contract | `.product-image` は `overflow: hidden`、`img` は `width/height: 100%` と `object-fit: cover` を使用する |
| Safe change surface | 原因と特定した既存 Native layout / image style。Web は再現時のみ既存 component / CSS / UI review を変更する |
| Unknowns | Native で最初に症状が出る screen、最初に期待幅を壊す layout layer、Web で実際に再現するか |

追加で確認済みの事実:

- `NativeProductImage` は wrapper を持たず、直接 `Image` を返す。
- 共通 `styles.productImage` には `width: "100%"` と画像比率がある。
- `productImageDetail` は detail 用比率、`productImageThumbnail` は固定 thumbnail size を持つ。
- Native の主要画面は `ScrollView contentContainerStyle={styles.scroll}` を利用する。
- `styles.row` は `flexDirection: "row"` と `gap` を持つため、兄弟要素が幅を押し広げる可能性もある。
- Web の `ProductImage` は既存 wrapper 内で `img` を表示し、CSS で container 内へ収める構成である。
- `ui-review.spec.ts` は `UI_REVIEW_STAGE` が必須で、`UI_REVIEW_ROUTES` に fileName を指定して対象を絞れる。
- `native:android:test:boundary` は在庫・再起動等の状態境界 suite であり、viewport 検証には使用しない。

### Assumptions

- 第一候補は画像自身または親 / 兄弟レイアウトの幅計算による横方向の問題である。
- 実Runtimeで別方向のサイズ計算問題と判明した場合は、症状名に合わせるのではなく実際の直接原因を修正する。
- Web は非再現の可能性が高いが、既存 UI review の実行結果で判断する。

### Non-goals

- 画像アセットの圧縮・変換・差し替え
- CDN / backend / API / DB の変更
- デザイン刷新や無関係なレスポンシブ改善
- Native viewport 専用 harness、端末 density / resolution 変更手順の新設
- 新規 Web responsive E2E ファイルの追加
- Firefox 固有検証
- 原因と無関係な長文・badge・price・fallback 等の網羅テスト
- 原因不明のまま wrapper、clipping、`max-width`、`flexShrink` 等を予防的に追加すること
- 今回の問題解消だけを理由に Web の `object-fit: cover` を `contain` 等へ変更すること

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。
- 仮定してよい細部: 原因が既存 repo convention の範囲で局所修正できる場合は、その最小変更を採用する。
- 未回答の重要質問: なし。技術的な Unknowns は実Runtime確認で解消し、解消できなければ Native 修正を Blocked とする。

## 4. 影響範囲

### Impacted areas

- Native の症状再現画面と、その直接原因となる shared / local layout
- shared style を変更した場合のみ、その style を使う代表画面
- Web の `/products` と `/products/product-basic-shirt` の確認

### Files to inspect

最初に確認する:

- `src/presentation/native/native-components.tsx`
- `src/presentation/native/native-screens.tsx`
- 症状再現箇所に対応する既存 Native test
- `e2e/web/ui-review.spec.ts`
- `playwright.config.ts`

必要な場合のみ確認する:

- `src/presentation/native/native-purchase-screens.tsx` — thumbnail / purchase まで影響する場合
- `tests/component/native/native-components.test.tsx`
- `tests/component/native/native-catalog-screen.test.tsx`
- `tests/component/native/native-product-detail-screen.test.tsx`
- `tests/component/native/native-cart-screen.test.tsx`
- `tests/component/native/native-purchase-screens.test.tsx`
- `src/presentation/components/product-image.tsx` — Web で再現した場合
- `src/presentation/styles/global.css` — Web で再現した場合

原因と無関係なファイルへ調査・変更範囲を広げない。

## 5. 変更方針

### Change strategy

1. Active Run を初期化 / 再利用し、仮説と確認対象を記録する。
2. 問題が報告された Native 実Runtime / 画面を最優先で再現する。再現箇所が不明な場合のみ Home → Catalog → Product Detail の順で確認し、最初に再現した時点で探索を止める。
3. 画像と直接親から外側へ確認し、期待幅を最初に壊している layout layer と直接原因を特定する。
4. 原因を特定できた場合のみ、その箇所を最小修正する。
5. Native production code を変更した場合は、変更後コードを反映した Runtime で修正後確認する。
6. Native の成否に関係なく Web UI review は実施する。Native が Blocked でも Web 確認は続行する。
7. Web UI review が失敗した場合は、商品画像 / layout 起因か、環境・build・fixture・test harness 起因かを切り分ける。前者と確認できた場合のみ Web を修正し、評価不能なら Web を Blocked とする。
8. Web で再現した場合のみ最小修正し、修正後に同じ UI review を再実行する。
9. production / test code を変更した場合のみ、必要な targeted test と最終品質ゲートを実行する。変更しなかった場合は Markdown 検証だけを実行する。
10. Run Artifact を更新し、sanitizer を通して完了する。

### 原因判定基準

| 確認結果 | 主な修正対象 |
| --- | --- |
| `ScrollView` content 自体が期待幅より広い | `styles.scroll` または該当 screen の content constraint |
| content は正常だが card / row が広い | card / row / sibling の width・flex constraint |
| 親 container は正常だが `Image` だけ広い | `NativeProductImage` / image style |
| Text / Button 等を含む row だけ広がる | 幅を押し広げている sibling の `flexShrink` / `minWidth` 等 |
| layout 上は期待幅内だが画像表示だけ不正 | `aspectRatio` / `resizeMode` / image rendering |

確認候補は `width` / `minWidth` / `flex` / `flexShrink` / row 子要素 / padding と固定幅 / `ScrollView` content / image width・ratio とする。候補 style を一律追加しない。

### Native の停止条件

- 実Runtimeで症状を再現できない場合、Native production code は変更しない。
- 症状は再現するが原因 layer を特定できない場合も推測修正しない。
- `.codex/runs/<run_id>/REPORT.md` に確認画面、環境、観測結果、未特定理由を記録し、Native 修正のみ Blocked とする。
- Native が Blocked でも Web UI review は実施し、最終報告を `Native: Blocked / Web: PASS または Finding` のように分離する。

### Web の停止条件

- UI review の FAIL だけを根拠に Web production code を変更しない。
- FAIL 時は最初の異常を確認し、商品画像 / layout 起因か、環境・build・fixture・test harness 起因かを切り分ける。
- 商品画像 / layout 起因と確認できた場合のみ、原因となる既存 Web component / CSS / test を最小修正する。
- UI review 自体を実行・評価できない場合は Web production code を推測で変更せず、原因、確認済み範囲、未実施検証を `.codex/runs/<run_id>/REPORT.md` に記録して `Web: Blocked` とする。
- Native / Web は独立判定し、一方が Blocked でも評価可能な側の確認は完了させる。

### Android 実Runtime実行時の条件

- 修正前の再現確認では、既に起動可能な実Runtimeを使える場合、不要な Build / Install / Maestro を追加しない。
- Native production code を変更した後は、確認対象 Runtime が現在の working tree の変更を含むことを必ず確認する。
  - Metro / dev Runtime 等で working tree の変更が reload される環境なら、不要な rebuild はしない。
  - Installed Release APK 等で source 変更が自動反映されない場合は、変更を含む APK の Build / Install を行ってから修正後確認する。
- 新たに Android Build / Install / Test / Maestro が必要な場合のみ、`AGENTS.md` §8 と `docs/native/windows-android-local-validation.md` §5.1.1「実行前の失敗履歴と preflight」に従う。
- preflight では直近 Run、完全ログ、差分、Shell / Version / 環境条件、成功 baseline、今回の仮説を active Run に記録してから実行する。
- 同じ条件の無目的な再実行はしない。

### 実行タスク

- [ ] 1. Active Run を初期化 / 再利用し、Native 再現仮説と確認対象を記録する。
- [ ] 2. Native を再現し、原因判定基準に従って直接原因を特定する。特定できなければ Native 修正を Blocked とする。
- [ ] 3. 原因を特定できた場合のみ Native を最小修正する。
- [ ] 4. Native を修正した場合は、現在の変更を含む Runtime で修正画面を再確認する。shared style 変更時は下記の代表画面ルールに従う。
- [ ] 5. 変更箇所に対応する Native targeted test を必要最小限更新 / 実行する。
- [ ] 6. Native の結果に関係なく Web UI review を 390x844 / 320x700 で実行し、対象2 route の overflow と screenshot を確認する。
- [ ] 7. Web UI review がFAILした場合は原因を分類する。画像 / layout 起因と確認できなければ Web production code を変更せず、必要に応じて Web を Blocked とする。
- [ ] 8. Web 非再現なら変更しない。再現した場合のみ既存 Web component / CSS / test を最小修正する。
- [ ] 9. Web を修正した場合は、新しい `UI_REVIEW_STAGE` で対象2 route × 2 viewport を再実行し、修正後の overflow と screenshot を確認する。
- [ ] 10. production / test code を変更した場合は最終品質ゲートを実行する。変更しなかった場合は `pnpm run lint:markdown` を実行する。
- [ ] 11. Run Artifact に結果を記録し、sanitizer Write / Check を実行する。

## 6. 検証方法

### Native 実Runtime

- 修正前は問題が報告された実Runtime / 画面で現象を確認する。
- Native production code を変更した場合、修正後確認に使う Runtime が現在の変更を含むことを確認する。
- 修正後は画像の左右端だけでなく、直接親 container / card の境界内に収まることを確認する。
- shared style を変更した場合は、変更した style に応じて次の代表画面だけを追加確認する。無関係な全画面確認へ広げない。

| shared style / constraint | 追加確認する代表画面 |
| --- | --- |
| `styles.productImage` | Catalog の商品card + Product Detail |
| `styles.productImageDetail` | Home のhero画像 + Product Detail |
| `styles.productImageThumbnail` | Cart。Purchase系thumbnailにも同じ変更が届く場合のみ該当Purchase画面も確認 |
| `styles.row` / row配下の共通constraint | Catalog + Search。Cartのrowにも変更が影響する場合のみCartも確認 |
| `styles.scroll` / 共通content constraint | 最初の再現画面 + Product Detail。再現画面がProduct DetailならCatalogを追加確認 |

- 既存の狭幅Runtimeを追加設定なしで利用できる場合だけ補助確認に使う。今回のために viewport harness や端末設定を新設しない。

### Native targeted test

| 変更箇所 | 主な targeted test |
| --- | --- |
| `native-components.tsx` / 共通画像 style | `tests/component/native/native-components.test.tsx` |
| Catalog / `NativeProductCard` | `tests/component/native/native-catalog-screen.test.tsx` |
| Product Detail | `tests/component/native/native-product-detail-screen.test.tsx` |
| Cart | `tests/component/native/native-cart-screen.test.tsx` |
| Purchase 系 thumbnail | `tests/component/native/native-purchase-screens.test.tsx` |

個別実行例:

```bash
pnpm exec jest --config jest.config.cjs tests/component/native/native-components.test.tsx
```

shared style 等で複数画面へ影響する場合は、個別列挙を増やさず以下を実行する。

```bash
pnpm run test:component:native
```

component test の style assertion を実Runtimeのviewport確認の代替にはしない。

### Web UI review

対象:

- `ui-review-mobile`: 390x844
- `ui-review-small-mobile`: 320x700
- fileName: `products`, `products-product-basic-shirt`

確認内容:

1. 既存 `expectNoHorizontalOverflow` がPASSする。
2. `output/ui-review/<stage>/mobile/` と `output/ui-review/<stage>/small-mobile/` に生成された対象 screenshot を確認する。
3. 商品画像の container が viewport 内に収まり、異常な拡大・縮小、比率崩れ、隣接UIへの侵入がないことを目視確認する。
4. 現行の `object-fit: cover` による通常の crop は正常とし、今回の不具合として扱わない。
5. overflow test はPASSするが container の表示に疑義がある場合のみ、既存 `ui-review.spec.ts` 内へ対象要素の bounding box assertion を追加する。
6. UI review がFAILした場合は、商品画像 / layout 起因か、環境・build・fixture・test harness 起因かを先に分類する。後者で評価不能なら Web を Blocked とし、production code を変更しない。
7. 非再現なら Web test file 自体も変更しない。
8. Web を修正した場合は変更後に同じ確認を再実行し、修正前後を別の `UI_REVIEW_STAGE` で残す。
9. 同じstageのviewport folderにPNGが存在すると既存UI Reviewは再利用を拒否する。途中FAIL等で再実行が必要な場合も既存証跡を削除せず、`image-overflow-before-${RUN_ID}-retry-01` / `image-overflow-after-${RUN_ID}-retry-01` のような未使用stageを使う。再試行ごとに `retry-02` のように増やす。

`RUN_ID` / `$runId` には新しい値を生成せず、実装開始時に初期化または再利用した active Run の実際の `run_id` を設定する。

修正前の POSIX shell 実行例:

```bash
RUN_ID="20260823-123800-JST" # active Run の実際の run_id に置き換える
UI_REVIEW_STAGE="image-overflow-before-${RUN_ID}" \
UI_REVIEW_ROUTES="products,products-product-basic-shirt" \
pnpm exec playwright test e2e/web/ui-review.spec.ts \
  --project=ui-review-mobile \
  --project=ui-review-small-mobile
```

修正前の PowerShell 実行例:

```powershell
$runId = "20260823-123800-JST" # active Run の実際の run_id に置き換える
$env:UI_REVIEW_STAGE = "image-overflow-before-$runId"
$env:UI_REVIEW_ROUTES = "products,products-product-basic-shirt"
pnpm exec playwright test e2e/web/ui-review.spec.ts `
  --project=ui-review-mobile `
  --project=ui-review-small-mobile
```

Web を修正した場合は `image-overflow-after-${RUN_ID}` / `image-overflow-after-$runId` のように未使用の stage 名へ変更して同じコマンドを再実行する。途中FAIL等による再試行では上記の `-retry-01` ルールを使う。今回のための npm script は追加しない。

### 最終品質ゲート

#### production / test code を変更した場合

targeted test 後に以下を実行する。

```bash
pnpm run verify
```

`verify` がFAILした場合は環境依存と即断せず、baseline、今回の差分、shared dependency、test / CI contract、実行環境を確認する。

- 今回の変更起因なら最小修正して再実行する。
- コマンド自体を実行できない場合は理由と代替検証を Run Artifact に記録する。
- 実行できたがFAILし、今回の変更と因果関係のない既存 baseline 問題であることを evidence 付きで確認できた場合のみ、未通過 gate と根拠を記録して別問題として扱う。

#### production / test code を変更しなかった場合

このタスクだけを理由に full `pnpm run verify` は要求しない。Markdown / Run Artifact の変更に対して以下を実行する。

```bash
pnpm run lint:markdown
```

そのうえで、実施した Native / Web 確認の evidence を Run Artifact に残す。

### Run Artifact sanitizer

Run Artifact 更新後、作業完了前に repository rule に従って sanitizer を実行する。`$runId` には上記と同じ active Run の実際の `run_id` を使う。

```powershell
$runId = "20260823-123800-JST" # 既に設定済みなら再設定不要
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 `
  -Path ".codex/runs/$runId" -Write -Check
```

sanitizer がFAILした場合は未完了とし、残存するローカル絶対Path等を解消して再確認する。

### 成功判定

- Native 修正を実施した場合: 現在の変更を含む Runtime で再現画面を確認し、画像が想定 container 内に収まり、原因箇所だけが変更され、targeted test が成功する。shared style を変更した場合は上記対応表の代表画面確認も完了する。
- Native を再現 / 原因特定できない場合: 推測修正せず Native を Blocked として evidence が残る。
- Web 非再現の場合: 390 / 320 の対象2 routeで overflow test と screenshot 確認が完了し、Web production code / test を変更していない。
- Web を修正した場合: 修正後の新しい stage で同じ2 route × 2 viewportを再実行し、overflow test と screenshot の両方で問題解消を確認する。
- Web UI review を環境・build・fixture・test harness 等の理由で評価できない場合: Web を PASS 扱いせず `Web: Blocked` とし、原因・evidence・未実施検証が記録されている。
- production / test code を変更した場合: `pnpm run verify` がPASSする。実行不能または既存 baseline failure の場合は、上記ルールに従って原因・evidence・未通過 gate が記録されている。
- production / test code を変更しなかった場合: `pnpm run lint:markdown` が成功する。
- Run Artifact sanitizer が成功する。

## 7. リスクと未解決論点

### Risks

| リスク | 対策 |
| --- | --- |
| 原因不明の防御styleで症状だけ隠す | 原因判定基準に従い、特定できなければ Native を Blocked とする |
| 古いAPK / Runtimeで修正後確認する | Native変更後は現在の変更を含む Runtime であることを確認してから検証する |
| shared style 変更で他画面を壊す | shared style変更時は対応表の代表画面だけを追加確認する |
| Webのdocument overflowだけ見て画像表示異常を見落とす | UI review screenshotも必ず確認する |
| `cover` の通常cropを不具合と誤認する | 現行 `object-fit: cover` を維持し、container overflow / 異常拡大等だけを対象にする |
| Web UI review の環境 / harness FAIL を画像不具合と誤認する | FAILの最初の異常を分類し、評価不能なら Web production code を変更せず Blocked とする |
| UI Reviewの途中FAIL後に同じstageを再利用して証跡衝突する | 既存PNGを削除せず未使用の `-retry-NN` stageへ切り替える |
| Web修正後の狭幅再確認が抜ける | Web変更時は新しい stage で同じ UI review を再実行する |
| Native BlockedでWeb確認まで止める | NativeとWebの結果を分離し、評価可能な側は継続する |
| 既存テストと重複した仕組みを増やす | 既存 component test / UI reviewを優先し、新規harnessを作らない |

### Open questions

- なし。技術的な Unknowns は実装時の bounded investigation で解消し、解消できない場合は停止条件に従う。

### Rollback

- DB / API / migration 変更はないため data rollback は不要。
- 退行時は今回の layout / style 変更と、それに直接対応して追加・変更した回帰testを同一単位でrevertする。

## 8. 成果物

- 原因が特定できた場合のみ、最小限の Native production code と必要な既存test変更。
- Webで再現した場合のみ、最小限の既存 Web component / CSS / UI review変更。
- `.codex/runs/<run_id>/` の標準Run Artifact。再現条件、原因判定、変更理由、検証結果、Blocked理由を必要に応じて記録する。
- 新規 `docs/reports/` は作成しない。

## 9. 備考 / Follow-up notes

- Branch: `fix/mobile-web-image-overflow`
- この plan の作成・修正では実装コードを変更しない。
- 原因が画像以外の row / text / button 等でも、今回の表示問題の直接原因ならスコープ内とする。
- 現時点の follow-up はなし。今回の直接原因と無関係な responsive 改善は別タスクとする。
