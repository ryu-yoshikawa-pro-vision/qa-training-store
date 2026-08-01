# qa-training-store UI・UX改善 実装計画

## 1. この文書の目的

本書は、PR #3で実施したUI・UX探索結果を、実際に修正可能な実装タスクへ落とし込むための指示書です。

探索レポートに記載された指摘をそのまま全件実装するのではなく、次を区別して対応してください。

- 現行コードでも問題が確認できるもの
- 実際のユーザー操作を阻害するもの
- 学習用ECアプリとして情報が不足しているもの
- 再現確認が必要で、現時点では実装してはいけないもの
- 見た目の好みだけであり、対応不要なもの

本書は実装エージェントへの具体的な指示として使用します。

---

## 2. 対象

- リポジトリ：`ryu-yoshikawa-pro-vision/qa-training-store`
- 調査PR：`#3 UI ux user journey deep exploration`
- 調査レポート：`docs/reports/2026-08-01_ui-ux-user-journey-deep-exploration.md`
- 本計画：`docs/plans/2026-08-01_ui-ux-improvement-implementation-plan.md`

---

## 3. 最重要方針

### 3.1 PR #3ではアプリコードを修正しない

PR #3は探索結果、判断、実装計画を確定するドキュメントPRとして扱ってください。

PR #3へ次の変更を混在させないでください。

- Presentation Codeの変更
- Application／Domain Codeの変更
- CSS変更
- Route追加
- E2E Test追加
- Seed変更
- UI文言変更

実装修正は、PR #3をマージした後に別Branch・別PRで実施してください。

### 3.2 全件を1つのPRに入れない

購入導線、Cart、住所、管理画面、学習Guideを1つのPRへまとめると、影響範囲が広すぎて原因切り分けが困難になります。

実装は後述する4つのPRへ分割してください。

### 3.3 各指摘を現行コードで再確認する

実装開始時点のコードを確認し、既に解消されている指摘は修正しないでください。

各タスクで次を実施してください。

1. 現行コードと既存Testを確認する
2. 指摘を再現するTestまたは操作手順を作る
3. 問題が再現した場合だけ修正する
4. 最小限の変更で直す
5. 関連する既存正常系を壊していないことを確認する

### 3.4 過剰設計しない

次は禁止します。

- UI状態管理のためだけの大規模Store導入
- 新しい状態管理Libraryの追加
- Router全体の置換
- 不要なBackend実装
- 本番EC相当のPayment／Shipment機能追加
- 各説明項目ごとに新しい画面を作ること
- 既存Componentで実現できる内容の重複Component化
- 将来用途だけを想定した抽象化
- UI改善と無関係なRepository／Domain再設計

依存関係は原則追加しないでください。

---

## 4. 指摘の採否

| ID | 判断 | 対応方針 |
|---|---|---|
| UX-001 | 対応する | Checkout画面遷移後のScroll／Focusを修正する |
| UX-002 | 対応する | MobileのAccount Navigationを全項目視認可能にする |
| UX-003 | 対応する | Viewport依存の「右のフォーム」を修正する |
| UX-004 | 対応する | Login状態とRoleに応じてHome CTAを変更する |
| UX-005 | 最優先で対応する | Login後に元のCart／Checkoutへ復帰する |
| UX-006 | 対応する | Guest Cart統合結果を一度だけ通知する |
| UX-007 | 対応する | Profileへ会員RankとAccount状態を表示する |
| UX-008 | バグとして対応する | 住所候補適用時に入力済み番地を消さない |
| UX-009 | 限定的に対応する | 模擬環境告知を完全削除せず、役割を整理する |
| UX-010 | 対応する | Review対象商品と現在状態を明示する |
| UX-011 | 対応する | 商品Formの未保存変更を保護する |
| UX-012 | 最小限対応する | Previewを実用的にするか名称を変更する |
| UX-013 | バグとして対応する | 注文詳細内のShipment表示不一致を解消する |
| UX-014 | 現時点では修正しない | Focused Accessibility Testで再検証する |
| UX-015 | 対応する | 最後のAdminを変更できない理由を表示する |
| UX-016 | 対応する | Scenarioの目的、Account、確認Routeを説明する |
| UX-017 | 最優先で対応する | Test Control Reset前後の説明と確認を追加する |
| UX-018 | 対応する | Homeの商品0件SectionへEmpty Stateを追加する |
| UX-019 | バグとして対応する | 価格同意ActionとInvalid状態の矛盾を解消する |
| UX-020 | 原因調査を先行する | 再現TestなしでPolling等を追加しない |
| UX-021 | 対応する | Checkout再開／置換結果をユーザー向けに表示する |
| UX-022 | 新規追加して対応する | 商品詳細で選択中SKUの正確な現在在庫数を表示する |

---

# 5. PR #3内で先に修正するドキュメント

PR #3では、アプリコードを変更せず、調査レポートの判断を次のとおり修正してください。

## 5.1 UX-022を追加する

次の内容を新規指摘として追加してください。

### UX-022：商品詳細で正確な現在在庫数を確認できない

- Severity：Medium
- 分類：Missing UI／Data Flow／Learning Experience
- Role：Guest／Customer
- 対象画面：商品詳細
- 問題：在庫6点以上では「在庫あり」とだけ表示され、具体数が分からない
- 影響：Admin在庫変更からStorefront反映までのデータフローを確認しにくい
- 対応方針：商品詳細では選択中SKUの具体数を常に表示する
- 対応しない範囲：商品一覧へ具体的な在庫数を追加しない

表示例は次としてください。

- 在庫0点：`在庫切れ`
- 在庫1〜5点：`残り3点`
- 在庫6点以上：`在庫12点`

## 5.2 UX-014を「要再検証」へ変更する

`StatusBadge`は視覚用Dot以外の文字列を通常Textとして出力しているため、Accessibility Snapshotだけでは問題を確定できません。

次のように変更してください。

- Severity：判断保留
- 実装方針：Focused Testで再現した場合のみ修正
- 未確認事項：実際のAccessible Name、NVDA等の読み上げ

## 5.3 UX-020を「原因調査」へ変更する

`payment-processing`の30秒超Loadingは、アプリ処理、IndexedDB、Scenario、MCP Tab停止のどれが原因か確定していません。

次のように変更してください。

- 修正方針：未確定
- 最初の対応：通常のPlaywright E2E Testで再現確認
- 禁止：再現前にPolling、Timeout、Retry Loopを追加すること

## 5.4 UX-017を優先度1へ移動する

Test Control ResetはSession、Cart、Checkout等を失わせる可能性がある破壊的操作です。

SeverityがHighであるため、優先順位も購入導線と同等の最優先へ変更してください。

## 5.5 変更範囲の表現を修正する

レポートの次の表現は、PR全体ではなく探索Runだけを指すように明確化してください。

```text
最終探索Runにおけるアプリコード変更：なし
PR全体の変更：探索計画、探索レポート、Codex実行記録、.gitignore
```

---

# 6. 実装PR 1：購入導線と状態引き継ぎ

## 推奨Branch

```text
fix/checkout-login-continuity
```

## 推奨PRタイトル

```text
fix: ログインを挟む購入導線とCheckout状態表示を改善する
```

## 対象

- UX-001
- UX-005
- UX-006
- UX-021

## 6.1 Login後の復帰先を保持する

### 現状

- GuestがCartからCheckoutへ進むとLogin画面へ遷移する
- Login成功後は無条件でHomeへ遷移する
- Guest Cartは統合されるが、元の購入フローへ戻らない

### 実装内容

CartからLoginへ進む際、内部Return先をLogin URLへ渡してください。

例：

```text
/login?returnTo=/checkout/address
```

Login成功後は、検証済みの内部Pathだけへ`router.replace`してください。

許可するReturn先は、少なくとも次に限定してください。

- `/cart`
- `/checkout/address`
- `/checkout/payment`
- `/checkout/confirm`
- `/orders`
- `/account/profile`
- `/account/addresses`

### セキュリティ上の必須条件

`returnTo`をそのまま外部URLとして使用しないでください。

次を拒否してください。

- `https://...`
- `http://...`
- `//example.com`
- `javascript:...`
- 許可していない任意Route

無効なReturn先は`/`へFallbackしてください。

### Route Guard

Customer専用RouteからLoginへRedirectする場合も、可能な範囲で元Routeを保持してください。

ただし、Router全体の再設計は行わないでください。

## 6.2 Guest Cart統合結果を表示する

Auth Use Caseは`LoginResult.cartMerge`を返しています。Presentation側で戻り値を捨てず、ユーザー向けSummaryへ変換してください。

表示内容：

- 統合した商品数
- 追加できなかった商品数
- 購入上限または在庫により減った数量
- 除外理由

内部IDや`variantId`をそのまま見せないでください。

表示例：

```text
ゲストカートを統合しました。
1商品を追加しました。購入上限のため数量は7個から5個になりました。
```

### 表示条件

- Loginまたは新規登録直後だけ表示する
- 通常のCart表示では繰り返し表示しない
- Browser Reload後に何度も再表示しない

### 実装方法

大規模なGlobal Stateは導入しないでください。

次のいずれかの最小方法を選択してください。

- 既存Router Queryで一度だけ渡す
- Presentation層の小さなSession Storage Helperで一度だけ保持・消費する

個人情報、Password、Session IDは保存しないでください。

## 6.3 Checkout再開／置換を表示する

`CheckoutStartResult.result`の次の状態をUIへ反映してください。

- `created`：通常開始。通知不要
- `resumed`：前回の購入手続きを再開したことを表示
- `replaced`：Cart更新により購入手続きを作り直したことを表示

表示例：

```text
前回の購入手続きを再開しました。
```

```text
カート内容が更新されたため、購入手続きを最新の内容で開始し直しました。
```

内部のCart Version番号は表示しないでください。

## 6.4 Checkout遷移後のScrollとFocusを修正する

各Checkout Routeで、画面遷移後に次を満たしてください。

- 画面見出しまたは`main`が初期Viewport内にある
- Keyboard／Screen Reader利用者のFocusが適切な見出しへ移る
- 完了画面では注文番号と結果が最初に確認できる
- Browser Back時の自然な挙動を不必要に壊さない

### 禁止事項

- 全Routeへ無条件で`window.scrollTo(0, 0)`を適用する
- Product listのScroll restorationを壊す
- CSSだけで見かけ上隠す

Checkout専用の小さな共通HelperまたはComponentを使用してください。

## 6.5 Test

最低限、次を追加・更新してください。

### Unit／Component

- Return先の許可／拒否判定
- Cart Merge Summaryの整形
- `created／resumed／replaced`の表示分岐

### E2E

1. Guestで商品をCartへ追加
2. Cartから購入手続きへ進む
3. Loginする
4. Cart統合結果が表示される
5. Checkoutへ復帰する
6. Mobileで各Step遷移後の見出しを確認する
7. 完了画面で注文番号が初期Viewport内にある

`guest-cart-merge-overflow`、`checkout-resume`、`checkout-replaced`を使用してください。

---

# 7. 実装PR 2：入力消失・Cart・注文状態の不整合

## 推奨Branch

```text
fix/cart-address-order-state-feedback
```

## 推奨PRタイトル

```text
fix: 住所入力とCart・注文状態の不整合を修正する
```

## 対象

- UX-008
- UX-013
- UX-019
- UX-020の原因調査

## 7.1 住所候補で入力済み情報を消さない

### 現状

郵便番号から住所候補を適用すると、`prefecture`、`city`、`addressLine1`が無条件に上書きされます。

### 実装内容

- 未入力Fieldだけ候補値を設定する
- 入力済みの番地、建物名、電話番号は保持する
- 上書きが必要な場合は、ユーザーが明示的に選択するまで変更しない
- 補完したFieldをMessageで知らせる

表示例：

```text
都道府県と市区町村を補完しました。番地は入力済みの内容を保持しています。
```

`setValue`を使用する場合は、FormのDirty状態とValidation状態を正しく更新してください。

## 7.2 注文詳細のShipment表示を統一する

### 実装前確認

次の状態を再現してください。

1. `paid`の注文を開く
2. 発送準備を開始する
3. ページ見出しと配送欄の状態を比較する
4. Reload後も比較する

### 実装内容

- 見出し、配送欄、利用可能Actionが同じ最新DTOを参照する
- 操作成功後に注文詳細全体を再取得する
- 一部だけOptimistic Updateしない
- 更新中は重複操作を防止する

Domain上のOrder StatusとShipment Statusが別概念である場合は、同じ文言へ無理に統合せず、それぞれの意味を明示してください。

## 7.3 Cartの価格同意Actionを整理する

### 現状

価格変更以外のBlocking Issueが混在する場合も価格同意Buttonが表示され、Generic Errorになります。

### 実装内容

- `PRICE_CHANGED`だけの場合は同意Actionを有効にする
- `UNPUBLISHED`、`INACTIVE`、`OUT_OF_STOCK`等が混在する場合は、先に商品削除／数量修正を促す
- Actionできない場合はButtonを無効化するか、表示しない
- Generic Errorではなく、原因と次の操作を表示する

表示例：

```text
価格変更を確認する前に、購入できない商品を削除してください。
```

既存のItem単位Issue表示は維持してください。

## 7.4 `payment-processing`はTestを先に作る

次のE2E Testを先に作成してください。

1. `payment-processing`でReset
2. 対象CustomerでLogin
3. 対象注文詳細を開く
4. Loadingが終了するか確認
5. `支払い処理中`が表示されるか確認
6. Browser操作が継続できるか確認

### 再現しない場合

- Application Codeを変更しない
- MCP固有問題の可能性として記録する
- Testだけ残すかは、安定性と既存Test構成を見て判断する

### 再現する場合

次を調査してください。

- Order Detail RepositoryのPromiseが完了するか
- IndexedDB TransactionがBlockedしていないか
- Seed内のOrder／Payment参照が整合しているか
- `useAsyncValue`のDependencyが無限更新していないか
- Page RouteのParameterが正しいか

原因を特定した上で最小限修正してください。

### 禁止事項

原因未特定のまま、次を追加しないでください。

- Polling Loop
- 自動Reload Loop
- 任意の30秒Timeout
- Paymentを強制成功させる処理
- Scenarioだけを削除する対応

---

# 8. 実装PR 3：学習Guideと利用者向け情報整理

## 推奨Branch

```text
feat/learning-guide-and-storefront-context
```

## 推奨PRタイトル

```text
feat: 学習ガイドとStorefrontの情報設計を改善する
```

## 対象

- UX-002
- UX-003
- UX-004
- UX-007
- UX-009
- UX-010
- UX-016
- UX-018
- UX-022

## 8.1 学習Guideは1画面だけ追加する

公開Routeとして`/guide`を追加してください。

画面名は「学習ガイド」または「テストガイド」とし、複数の説明画面へ分割しないでください。

最低限掲載する内容：

- このアプリの目的
- 実際の注文・決済・配送は行われないこと
- 個人情報を入力しないこと
- 固定Test AccountとPassword
- Customer／Operator／Adminの違い
- 会員Rankの違い
- Test Scenarioの使い方
- Test Control Resetの影響
- 代表的な学習フロー

Guideから実際の操作画面へ移動できるLinkを設けてください。

## 8.2 Login画面のTest Account情報を整理する

固定Test Accountを完全削除しないでください。

次の構成に変更してください。

- Login Formを主役にする
- Test Accountは`details`等で折りたたむ
- 「学習ガイドを見る」Linkを表示する
- Passwordは折りたたみ内またはGuideに表示する

各Scenario固有AccountをLogin画面へ大量に追加しないでください。

## 8.3 Scenario Metadataを1か所へ集約する

Scenarioごとに次の情報を定義してください。

- 表示名
- 短い説明
- 推奨Account
- 主な確認Route
- 初期状態の要点

Test ControlとGuideで同じMetadataを使用してください。

Scenario名の文字列を各画面へ重複記述しないでください。

## 8.4 商品詳細へ正確な在庫数を表示する

商品詳細では選択中Variantの現在在庫数を常に確認できるようにしてください。

表示仕様：

- 0点：`在庫切れ`
- 1〜5点：`残りN点`
- 6点以上：`在庫N点`

購入上限が在庫数より小さい場合は、数量Selectと購入上限の関係が分かる短い補足を検討してください。

ただし、商品一覧Cardでは現在の簡潔な在庫表示を維持してください。

## 8.5 ProfileへRankとAccount状態を表示する

Profile上部へ次を表示してください。

- 会員Rank
- Account状態
- Rankごとの短いBenefit

長い制度説明はGuideへ移し、Profileへ全文を置かないでください。

## 8.6 Home CTAをRole別にする

次を基本としてください。

- Guest：`ログインして購入する` → `/login`
- Customer：`マイページを見る` → `/account/profile`
- Operator／Admin：`管理画面を開く` → `/admin`

「商品を見る」は全Roleで維持してください。

## 8.7 Review対象と状態を明示する

Customer Review画面へ次を追加してください。

- 商品名
- Variant／SKUのユーザー向け表現
- 注文日または注文番号
- 現在のReview状態

注文詳細のAction Labelを状態に応じて変更してください。

例：

- 未投稿：`レビューを投稿`
- 公開中：`レビューを編集`
- 非表示：`非表示中のレビューを編集`
- 削除済み：Actionなし、理由表示

内部Status名をそのまま表示せず、日本語のユーザー向け表現を使用してください。

## 8.8 Empty CatalogのHome表示

おすすめ商品、新着商品が0件の場合、見出しだけを表示しないでください。

既存の商品一覧Empty Stateを参考に、短い説明と次のActionを表示してください。

新しいEmpty State Componentを乱立させず、既存Componentを再利用してください。

## 8.9 Account NavigationのMobile表示

390pxと320pxで、3項目すべてが認識できるようにしてください。

優先順：

1. 3列で収める
2. 2段折り返し
3. 縦積み

横Scrollを残す場合は、見切れだけに依存せず、Scroll可能であることが分かる必要があります。

## 8.10 文言と告知の整理

- 「右のフォーム」を`登録フォーム`等のViewport非依存文言へ変更する
- 模擬環境の告知は完全削除しない
- Headerでは短い告知
- Guideでは詳細説明
- Checkoutでは個人情報・実決済に関する必要な注意だけを表示

告知を消しすぎて実取引と誤認させないでください。

---

# 9. 実装PR 4：管理画面の安全性

## 推奨Branch

```text
fix/admin-safety-guards
```

## 推奨PRタイトル

```text
fix: 管理画面の未保存変更と破壊的操作を保護する
```

## 対象

- UX-011
- UX-012
- UX-015
- UX-017

## 9.1 商品Formの未保存変更を保護する

既存の`ContextualSaveBar`を再利用してください。

実装要件：

- 初期値との差分からDirtyを判定する
- Dirty時だけ未保存表示を出す
- 保存成功後にDirtyを解除する
- 変更破棄で初期値へ戻す
- Browser Reload／Tab Closeで標準確認を出す
- Admin NavigationやBreadcrumbで離脱する場合に確認する

### 禁止事項

- 自動保存
- Local StorageへのDraft永続化
- Global Click Eventで全Linkを無差別にInterceptする
- Router全体の置換

共通Admin Navigation、Breadcrumb、商品Formの範囲で最小限のGuardを実装してください。

## 9.2 商品Previewを実用的にする

現在のPreviewへ最低限次を追加してください。

- Main Image
- 商品名
- Short Description
- 公開状態
- 代表Variant
- 最小〜最大価格
- 在庫状態

Storefrontの商品詳細を完全複製する必要はありません。

既存のPreview DTOで情報が不足する場合は、必要最小限だけ拡張してください。

Storefrontと同じ見た目を実現できない場合は、Labelを`入力内容の要約`へ変更する案も許可します。

## 9.3 最後のAdmin制約を説明する

Role変更または利用停止ControlがDisabledの場合、理由を近くへ表示してください。

表示例：

```text
最後の管理者は役割変更または利用停止できません。
先に別の管理者を設定してください。
```

Disabled ButtonへTooltipだけを付ける対応は避けてください。Keyboard／Touchでも読める通常Textを使用してください。

## 9.4 Test Control Resetを確認付きにする

Reset前にConfirm Dialogを表示してください。

説明する対象：

- Session
- Cart
- Checkout
- 注文・Review等のScenario Data
- Reset後にLoginが必要になる場合があること
- 操作中データが失われること

Confirm DialogのAction：

- キャンセル
- シナリオを初期化

Reset後は、Reload前後のどちらかで次をユーザーへ伝えてください。

- 初期化が完了したこと
- 現在Scenario
- 再Loginが必要なこと
- 次に確認するRoute

複雑なCross-tab通知は実装しないでください。

---

# 10. UX-014 Accessibility再検証

実装修正前にFocused Testを追加または一時的に実行してください。

確認対象：

- 商品状態
- 注文状態
- Review状態
- User Role
- 会員Rank
- Account状態

確認例：

```ts
await expect(page.getByRole("cell", { name: "公開中" })).toBeVisible();
```

またはBadge自体をRole／Textで取得してください。

### 判断

- Accessible Textを取得できる：修正しない
- Textを取得できない：共通`StatusBadge`またはTable Cellを最小修正する

`aria-label`を無条件で追加し、視覚Textとの二重読み上げを起こさないでください。

---

# 11. 共通Test要件

各PRで、変更した範囲に応じて次を実施してください。

## 11.1 Static Validation

```text
pnpm format:check
pnpm lint
pnpm typecheck
```

## 11.2 Unit／Integration／Component

変更対象に対応する既存Test Suiteを実行してください。

最低限、次を追加してください。

- Return URL Validation
- Cart Merge Summary
- Scenario Metadata
- Address Lookupの入力保持
- Checkout Result表示
- Dirty判定
- Status表示

## 11.3 Playwright E2E

対象ScenarioをTest Fixtureから明示的にResetしてください。

重点Scenario：

- `default`
- `guest-cart-merge-overflow`
- `checkout-resume`
- `checkout-replaced`
- `cart-with-invalid-items`
- `payment-processing`
- `empty-catalog`
- `reviewable-orders`

DesktopとMobileの両方で必要なものだけ確認し、全Admin画面をMobile対応へ変更しないでください。

## 11.4 Full Validation

各PRの最終段階で、可能な限り既存の`verify` Scriptを実行してください。

失敗した場合は、今回の変更による失敗か既存問題かを切り分けてください。

---

# 12. 壊してはいけない既存動作

次は現在良好なため維持してください。

- Product一覧のSearch／Filter／Sort
- Filter 0件時の解除導線
- Product詳細のVariant選択
- Sale価格と会員価格の計算
- 在庫切れVariantの選択不可
- Cartの価格内訳
- Item単位のInvalid理由
- Checkout Stepper
- Payment失敗後の再試行
- 注文番号と確定価格Snapshot
- Payment履歴とOrder／Shipment進捗の分離
- Admin在庫管理と在庫履歴
- Bulk Partial Failureの件数と理由
- Review公開履歴とRating集計
- Admin Mobileの1,024px境界案内
- ProductionでTest Controlを公開しない制御

---

# 13. 対応しないこと

今回のUI・UX改善では、次を実装しないでください。

- 実際のPayment Provider連携
- 実配送API
- Backend Server
- User間のリアルタイム同期
- Admin Mobile Table対応
- Review専用一覧画面の新設
- Rank制度の複雑化
- Inventory Reservation機能
- Draft自動保存
- 外部Analytics
- Animation中心の見た目変更
- 新しいDesign System導入

---

# 14. 実装エージェントの完了報告

各PRの実装完了時は、次の形式で報告してください。

```markdown
## Summary

- 対応したUX ID
- 実装した内容
- 対応しなかった内容と理由

## Changed Files

- Fileごとの変更概要

## Validation

- 実行したCommand
- 成功／失敗
- 未実行項目と理由

## Playwright Verification

- 使用Scenario
- 確認したViewport
- 確認結果

## Remaining Risks

- 未確認事項
- 次PRへ分離した事項
```

Git Commit、Push、PR作成はユーザーが行うため、実装エージェントは実施しないでください。

---

# 15. 完了条件

この計画全体の完了条件は次のとおりです。

1. PR #3で調査レポートの判断を修正した
2. UX-022を調査レポートへ追加した
3. 購入導線のReturn先が維持される
4. Guest Cart統合結果が説明される
5. Checkout再開／置換が説明される
6. Checkout遷移後に重要情報が画面外へ残らない
7. 住所候補で入力済み番地が消えない
8. Cart価格同意Actionが状態と一致する
9. Shipment状態が同一画面内で矛盾しない
10. `payment-processing`の原因がTestで判断される
11. 学習Guideが1画面に整理される
12. 商品詳細で現在在庫数が確認できる
13. ProfileでRankとAccount状態が確認できる
14. Review対象商品と状態が確認できる
15. Test Control Reset前に影響が説明される
16. 商品Formの未保存変更が保護される
17. UX-014は再現した場合だけ修正される
18. 既存正常系とCIが維持される
19. 4つの実装PRが不要に混在していない
20. 過剰設計や不要な依存関係追加がない
