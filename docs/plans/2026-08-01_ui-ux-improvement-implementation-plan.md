# qa-training-store UI・UX改善 実装プラン

## 1. 目的

PR #3の探索結果をもとに、確認されたUI・UX上の問題を同一の実装範囲で修正する。

単に表示を整えるのではなく、次を実現する。

- Guestの商品探索からLogin、Cart、Checkout、注文完了まで、ユーザーの操作意図が途切れない
- 商品、在庫、価格、Cart、Checkout、注文、Reviewなどの状態変化が画面上で理解できる
- 学習用アプリの説明とTest Account情報を、各操作画面の主目的を妨げない場所へ整理する
- Customer、Operator、Adminの各画面で、操作結果、制約、未保存状態、破壊的操作の影響が分かる
- DesktopとMobileで主要な情報と操作を見失わない
- 既存の正常系、Seed Scenario、Test API、決定的なテスト条件を壊さない

---

## 2. 実装方針

- すべての修正を同一の実装範囲で行う
- 指摘IDごとに場当たり的な分岐を増やさず、同じ原因を持つ問題は共通処理で解消する
- 既存のApplication／Domain契約を利用できる場合は、Presentation側で情報を捨てずに表示する
- 新しい依存関係は追加しない
- 新しい状態管理Libraryは導入しない
- 自動保存、外部決済、実配送、Backendなど、今回の問題解決に不要な機能は追加しない
- Test Account、Scenario、会員Rankごとに個別の説明画面を増やさない
- 学習説明は1つのGuide画面とContextual Helpへ集約する
- 既存のProduct／SKU／Inventory分離、Checkout Stepper、Payment履歴、Review履歴、Admin Mobile境界表示は維持する

---

## 3. 実装順序

依存関係を考慮し、次の順番で実装する。

1. 共通の画面遷移、Focus、1回限りの通知基盤
2. Login、Guest Cart統合、Checkout再開・置換
3. Cart、住所、商品詳細、Profile、Review
4. 学習Guide、Home、Login、Test Controlの情報整理
5. Adminの商品編集、注文状態、User制約、Reset確認
6. Accessibilityと`payment-processing`のFocused Test
7. 全体回帰テスト

各段階でTypeScript Errorを残したまま次へ進まないこと。

---

# 4. 共通の画面遷移と通知

## 4.1 ページ遷移後のFocusとScrollを統一する

対象：UX-001

Checkoutの各Routeで、前画面のScroll位置が次画面へ引き継がれ、見出しや注文完了結果が画面外へ残らないようにする。

### 実装内容

- Route表示時にページ先頭または`h1`へFocusを移す共通処理を追加する
- Focus対象には`tabIndex={-1}`を設定する
- Focus時に画面先頭または見出しがViewport内へ入るようにする
- 次の画面へ適用する
  - `/checkout/address`
  - `/checkout/payment`
  - `/checkout/confirm`
  - `/checkout/processing`
  - `/checkout/complete`
  - `/checkout/failed`
- 注文完了画面では、注文番号、合計、注文詳細への導線が初期Viewport内に入ることを優先する
- Focus処理を各ページへ重複実装せず、小さな共通HookまたはComponentとして実装する
- Browser Back時に既存のForm入力やCheckout状態を破棄しない

### 完了条件

- `390×844`でCheckoutの各Stepへ進んだ直後に、現在Stepと見出しを確認できる
- 注文完了直後に注文番号と次のActionを確認できる
- Keyboard利用時にFocus位置を認識できる
- Desktopで不要な大きなScroll移動が発生しない

---

## 4.2 1回限りの操作結果を安全に引き継ぐ

Login後のCart統合結果やScenario Reset結果を、遷移先で1回だけ表示できる仕組みを追加する。

### 実装内容

- `sessionStorage`を利用したWeb向けの小さなOne-time Notice Helperを追加する
- 保存できる値を用途別の型で限定する
- JSON Parse失敗や不正値があっても画面を壊さず破棄する
- 読み出した通知は直後に削除し、再読み込みで繰り返し表示しない
- 個人情報、Password、任意URLは保存しない
- 次の用途だけに使用する
  - Login後のGuest Cart統合Summary
  - Test Control Reset完了後の案内

大規模なGlobal Storeや汎用Notification Frameworkにはしないこと。

---

# 5. Login、Cart統合、Checkout復帰

## 5.1 Login後に元の購入導線へ戻す

対象：UX-005

### 実装内容

- Login画面で内部Return先を受け取れるようにする
- Cartから未Login状態で「購入手続きへ」を選んだ場合は、Loginへ次を渡す

```text
/login?returnTo=/checkout/address
```

- `returnTo`は内部Pathだけを許可する
- 次を拒否してFallbackへ戻す
  - `http://`または`https://`から始まる値
  - `//`から始まる値
  - Login／Signupへ循環する値
  - 空文字または不正な値
- CustomerのLogin成功後は、原則として元のReturn先へ戻す
- Operator／AdminでLoginした場合は、Customer専用Return先へ移動せず`/admin`へ移動する
- Return先がない場合はRoleごとの自然な既定Routeへ移動する
  - Customer：`/`
  - Operator／Admin：`/admin`

### Cart統合を伴う場合

Login結果の`cartMerge`を捨てずに利用する。

- 統合で除外、数量上限超過、数量調整が発生していない場合
  - One-time Noticeを保存する
  - 元のCheckoutへ進む
- 統合で除外または数量調整が発生した場合
  - `/cart`へ戻す
  - 統合結果を表示する
  - ユーザーがCart内容を確認してからCheckoutを再開できるようにする

### 完了条件

- GuestがCartからLoginした後、購入フローを最初から探し直す必要がない
- Staff AccountでCustomer Checkoutへ誤遷移しない
- 外部URLへのOpen Redirectができない
- Login失敗時は入力内容とReturn先を保持する

---

## 5.2 Guest Cart統合結果を表示する

対象：UX-006

既存の`CartMergeResult`を使用し、統合結果をユーザー向けに表示する。

### 表示内容

- 統合した商品数
- Cartへ追加できた数量
- 購入上限または在庫上限で除外された数量
- 統合できなかった商品数
- 除外理由をユーザー向け文言へ変換した内容
  - 商品が存在しない
  - 非公開
  - 会員Rank不足
  - SKU無効
  - 在庫切れ

内部IDやEnum値は直接表示しない。

### 表示場所

- 調整なし：遷移先で短いSuccess Noticeを1回表示
- 調整あり：Cart上部にSummaryを1回表示
- Cart Item自体の現在状態は既存のItem表示を利用する

### 完了条件

`guest-cart-merge-overflow`で、3個と4個が上限5個に統合された理由と結果を理解できる。

---

## 5.3 Checkoutの再開・置換を説明する

対象：UX-021

`checkout.start()`が返している`created | resumed | replaced`を画面で使用する。

### 実装内容

- `created`
  - 通常開始として追加Messageは表示しない
- `resumed`
  - 「前回の購入手続きを再開しました。配送先、支払方法、注文内容を確認してください。」を表示する
- `replaced`
  - 「カートが更新されたため、以前の購入手続きを置き換えました。最新の商品、数量、価格を確認してください。」を警告として表示する
- 内部のCart Version番号は表示しない
- MessageはCheckout Address画面のStepperと見出しの近くに表示する
- 置換後は最新Cartを元に金額と商品が表示されていることを確認する

### 完了条件

- `checkout-resume`で再開理由が分かる
- `checkout-replaced`と`cart-version-invalidates-checkout`で置換理由が分かる
- 古いCheckout内容をそのまま注文したように見えない

---

# 6. Cartと商品購入情報

## 6.1 価格変更同意とInvalid Itemの関係を明確にする

対象：UX-019

### 実装内容

Cartに`PRICE_CHANGED`以外の購入阻害要因がある場合、価格同意Buttonを実行してGeneric Errorを発生させない。

- `PRICE_CHANGED`だけの場合
  - 現在価格への同意Buttonを有効にする
  - 成功後に価格Warningを消す
  - 更新後のCartを表示する
- 非公開、SKU無効、在庫切れ、在庫不足、Rank不足が混在する場合
  - 価格同意Buttonを無効にするか表示順を下げる
  - 「購入できない商品を先に修正または削除してください。その後、現在価格へ同意できます。」と表示する
  - Item単位の問題表示と削除／数量変更を優先する
- Application ErrorをすべてGeneric Errorへまとめない
- Conflict時は最新Cartの再読込Actionを表示する

### 完了条件

- `cart-with-invalid-items`で、次に何を修正すべきか判断できる
- 価格変更だけのCartでは同意処理が成功する
- 同意Buttonを何度押しても同じGeneric Errorになる状態を残さない

---

## 6.2 商品詳細へ正確な現在在庫数を表示する

対象：UX-022

商品詳細で、選択中SKUの正確な在庫数を常に確認できるようにする。

### 表示ルール

- 0点：`在庫切れ`
- 1〜5点：`残りN点`
- 6点以上：`在庫 N点`

### 実装内容

- Variant変更時に表示を即時更新する
- 購入可能数量Selectの上限と表示在庫数を一致させる
- 購入上限が在庫数より小さい場合は、在庫と購入上限を混同しないよう必要に応じて補足する
- 商品一覧は現在の簡潔な在庫状態を維持し、具体数を全Cardへ追加しない
- Admin在庫変更後、再読込した商品詳細に正しい在庫数が表示されることを確認する

### 完了条件

- 在庫が6点以上でも具体数が分かる
- Variantごとの在庫差を確認できる
- 在庫0のVariantは引き続き選択不能である

---

# 7. Customer Accountと入力Form

## 7.1 MobileのAccount Navigationを全項目表示する

対象：UX-002

### 実装内容

- `390px`および`320px`で横Scrollへ依存しない構成へ変更する
- 3項目をGridまたは折り返しで表示する
- `プロフィール`、`配送先`、`注文履歴`を常に視認できるようにする
- 各項目のTouch Targetを44px以上維持する
- 現在ページの`aria-current="page"`を維持する
- Document全体にもNavigation内部にも不要な横Overflowを発生させない

---

## 7.2 配送先Empty Stateの文言を修正する

対象：UX-003

`右のフォームから最初の配送先を登録してください。`を、Viewportに依存しない文言へ変更する。

推奨文言：

```text
登録フォームから最初の配送先を登録してください。
```

新しいLayoutや画面は追加しない。

---

## 7.3 住所候補適用時に入力済み番地を消さない

対象：UX-008

### 実装内容

- 郵便番号から取得した都道府県、市区町村、住所候補を適用する際、既に入力済みの値を無条件に空または候補値へ置換しない
- 特に`addressLine1`の入力値を失わない
- 最小実装として、入力済みFieldは保持し、空Fieldだけを補完する
- 補完後のMessageで、入力済み内容を保持したことが分かるようにする
- FormをDirtyのまま維持し、保存前に内容を確認できるようにする
- 新規登録と既存配送先編集の両方で同じ挙動にする

### 完了条件

- 郵便番号と番地を入力後に住所候補を利用しても、入力済み番地が消えない
- 候補がない場合は既存入力を変更しない
- 補完後にどのFieldを確認すべきか分かる

---

## 7.4 Profileへ会員情報を表示する

対象：UX-007

### 実装内容

Profile上部に次を表示する。

- 現在の会員Rank
- Account状態
- Rankによる短いBenefit
  - 一般会員：5,000円以上で送料無料
  - Gold：5%割引
  - Platinum：10%割引・送料無料
- 詳しい説明はGuideへのLinkにする

既存のProfile編集Formへ長い制度説明を入れない。

### 完了条件

- regular、gold、platinumで正しいRankが表示される
- 商品詳細、Cart、Checkoutの割引表示と矛盾しない
- Account状態は内部Enumではなく日本語で表示される

---

# 8. Reviewの対象と状態

## 8.1 Review Formへ対象商品情報を表示する

対象：UX-010

### 実装内容

Review EligibilityまたはReview表示用DTOへ、画面表示に必要な範囲で次を追加する。

- 商品名
- Variant名または選択肢
- 注文番号または注文日
- 既存Review状態

Review Form上部へ対象商品を表示し、ユーザーが何をReviewしているか確認できるようにする。

内部のProduct ID、Order Item IDは主表示にしない。

## 8.2 注文詳細のReview Actionを状態別にする

状態に応じてActionと説明を変える。

- 未投稿：`レビューを書く`
- 公開中：`レビューを編集`
- 非公開：`非公開レビューを編集`
- 削除済み：Buttonを表示せず`削除済み・再投稿できません`
- 配達前：Review Actionを表示しない、または投稿可能条件を説明する

### 完了条件

- 同じ注文に複数商品があっても対象を取り違えない
- 投稿済みかどうか注文詳細で分かる
- 非公開・削除済みの状態をユーザー向けに理解できる
- AdminのReview公開状態とCustomer表示が矛盾しない

---

# 9. 学習Guideと情報配置

## 9.1 学習Guideを1画面追加する

Login用、Scenario用、Rank用に複数画面を作らず、公開Routeの`/guide`へ集約する。

### Guideへ記載する内容

- アプリの目的
- 実際の注文、決済、配送が行われないこと
- 実在する個人情報を入力しないこと
- Customer、Operator、Adminの違い
- 固定Test AccountとPassword
- 会員RankとBenefit
- Test Scenarioの使い方
- Test Control Resetの影響
- 主要な確認フロー
  - 商品探索から注文
  - Payment失敗と再試行
  - Adminの商品・在庫・注文操作
  - Review投稿と公開状態変更

### 実装方針

- 既存のContent Dictionary、Account情報、Scenario情報を再利用する
- Account情報やScenario説明を複数画面へHardcodeしない
- Guideは公開Routeとし、Login前に閲覧できるようにする
- HeaderまたはFooter、Login、Test ControlからGuideへ移動できるようにする
- 長大な操作マニュアルにはせず、各機能へ進む入口を示す

---

## 9.2 固定Test AccountをLogin画面からGuideへ移す

対象：Login画面の情報過多

### 実装内容

- Login画面の常時展開された固定Account一覧を削除する
- Login画面には次の短い案内だけを残す

```text
テスト用アカウントは学習ガイドで確認できます。
```

- `学習ガイドを見る`Linkを表示する
- PasswordをLogin画面へ常時表示しない
- Login Form、Error、Signup導線を主情報として維持する

Test Account自体は削除しない。

---

## 9.3 Home CTAをLogin状態とRoleに合わせる

対象：UX-004

HomeのSecondary CTAを現在Sessionに応じて変更する。

- Guest：`ログインして購入` → `/login`
- Customer：`マイページ` → `/account/profile`
- Operator／Admin：`管理画面へ` → `/admin`

Primary CTAの`商品を見る`は全Roleで維持する。

Login済みユーザーをLogin Formへ戻さない。

---

## 9.4 模擬環境説明の役割を整理する

対象：UX-009

安全告知は削除せず、同じ説明の重複を減らす。

### 表示方針

- Global Header：`学習用・実取引なし`の短い常時表示
- Guide：詳細説明
- Login／Signup：個人情報とTest Account利用に必要な注意
- Checkout：実在住所・Card情報を入力しない注意
- Cart／商品詳細：同じ一般説明を繰り返さない
- Footer：GuideとLegalへの導線

### 実装内容

- Cart上部の一般的な学習環境説明は削除または短縮する
- Checkoutでは一般説明ではなく入力上の注意に限定する
- 商品詳細下部の重複説明はGlobal告知と役割が重なる場合は削除する
- Homeの学習PanelはGuideへの導線として簡潔に残す

---

## 9.5 Homeの商品0件Stateを追加する

対象：UX-018

### 実装内容

- 公開商品が0件の場合、`おすすめ商品`と`新着商品`の空Sectionを見出しだけで表示しない
- 重複したEmpty Stateを複数表示せず、Home上で1つの明確なEmpty Stateへまとめる
- 表示内容
  - 現在公開中の商品がないこと
  - 読込失敗ではないこと
  - 商品一覧またはGuideへの導線
- Categoryが0件の場合も空Gridだけを表示しない
- 通常Catalogでは現在のHome構成を維持する

---

# 10. Adminの商品編集

## 10.1 未保存変更を保護する

対象：UX-011

### 実装内容

- Product Editorの初期値と現在値を比較し、Dirty状態を管理する
- 既存の`ContextualSaveBar`を利用し、未保存変更があることを表示する
- 次の場合に離脱確認を行う
  - Admin Sidebarの内部Link
  - Breadcrumb
  - 画面内の別Route Link
  - Browser Reload／Tab Close
  - Browser Back
- 確認内容
  - `変更を破棄して移動`
  - `編集に戻る`
- 保存成功後と明示的な破棄後はDirty状態を解除する
- Previewを開くだけではDirty状態を解除しない
- 自動保存やDraft永続化は追加しない
- 新しいNavigation Libraryは追加しない

### 実装上の注意

- Web向けの離脱Guardを小さなHookまたはProviderとして実装する
- Product Editor以外へ不必要に適用しない
- Native向けBuildを壊さないようWeb固有処理を分離する

### 完了条件

- 未保存状態でSidebar、Breadcrumb、Browser Back、Reloadを実行すると警告される
- 保存済み状態では警告されない
- Cancelすると入力内容が残る

---

## 10.2 商品Previewを実用的にする

対象：UX-012

現在の商品コード、商品名、価格だけの表示を、保存前確認として意味のある内容へ拡張する。

### 表示内容

- Main Image
- 商品名
- Short Description
- 公開状態または保存後の初期状態
- 会員Rank制限
- 代表VariantまたはVariant一覧の要約
- 最小〜最大価格
- 在庫状態
- `未保存の内容です`という明示

### 実装方針

- Storefrontの商品詳細を完全複製しない
- 既存の`ProductImage`、`StatusBadge`、価格Formatterを再利用する
- Preview DTOに不足する情報だけを追加する
- 保存処理やDatabaseへ副作用を発生させない

### 完了条件

商品名と価格以外の変更も、保存前に判断できる。

---

# 11. Admin注文とUser管理

## 11.1 Shipment状態表示を同期する

対象：UX-013

### 実装内容

- 発送準備開始、発送、配送完了の操作後に注文詳細を再取得する
- 見出し、Status Badge、配送欄、操作Buttonを同じ取得結果から描画する
- 一部だけLocal Stateで先行更新し、他の欄が古い状態のまま残る構成をなくす
- 更新中は対象Actionを無効化する
- Success Messageは再取得完了後に表示する
- Conflict時は最新状態の再読込を促す

### 完了条件

- 発送準備開始直後に、見出しと配送欄が両方`発送準備中`になる
- Reload前後で状態が変わらない
- Customer注文詳細の状態と矛盾しない

---

## 11.2 最後のAdminを変更できない理由を表示する

対象：UX-015

### 実装内容

最後のAdminのRole変更または利用停止ControlがDisabledの場合、理由をControlの近くへ表示する。

推奨文言：

```text
最後の管理者は役割変更または利用停止できません。先に別の管理者を設定してください。
```

- `aria-describedby`でDisabled Controlと説明を関連付ける
- 自己変更、退会済み、権限不足など別理由の場合は、実際の理由と混同しない
- Generic Errorだけに依存しない

---

# 12. Test Control

## 12.1 Scenario説明Metadataを追加する

対象：UX-016

既存のScenario一覧と同じ定義元で、各Scenarioの説明を管理する。

### 各Scenarioへ持たせる情報

- 表示名
- 目的
- 推奨Account
- 主な確認Route
- 初期状態の短い説明

### 実装方針

- `PHASE_ONE_SCENARIOS`と別々に内容がずれないよう、同じMetadataから一覧と説明を生成する
- Test Controlでは選択中Scenarioの説明だけを表示する
- 全Scenarioの詳細を同時展開しない
- 詳しい操作方法はGuideへLinkする

---

## 12.2 Scenario Reset前に確認する

対象：UX-017

### 実装内容

`シナリオを初期化`を押しただけで即時Resetしない。

既存のConfirm Dialogを利用し、次を説明する。

- 現在のSessionが解除される
- Cart、Checkout、注文、商品、在庫、Reviewなどが選択Scenarioの初期状態へ戻る
- 入力中、未保存、処理途中の内容は失われる
- 初期化後は再Loginが必要になる
- 操作は元に戻せない

### Reset後

- Reset完了結果をOne-time Noticeへ保存する
- Reload後のLogin画面で、初期化したScenario名と再Loginが必要なことを1回表示する
- 一時的な`Forbidden`を成功結果のように見せない
- Reset失敗時はReloadせず、Test Control上でErrorを表示する
- Reset中はButtonを無効化し二重実行を防ぐ

### 完了条件

- 誤ってReset Buttonを押しても確認なしにデータが消えない
- Reset後にLogin画面へ移動した理由が分かる
- 選択Scenarioの目的と利用Accountを確認できる

---

# 13. AccessibilityのFocused Test

対象：UX-014

現行の`StatusBadge`は文字列をDOMへ出しているため、推測で`aria-label`を追加しない。

### 実装内容

代表的な管理Tableで、Status／Role／RankをAccessible Nameとして取得できることをTestする。

最低限の対象：

- 商品一覧の公開状態
- 注文一覧の注文状態
- Review一覧の公開状態
- User一覧のRole、Rank、Account状態
- 在庫一覧のSKU状態

### 判定

- `getByRole('cell', { name: ... })`等で取得できる場合
  - Production Codeは変更しない
  - Focused Testだけ追加する
- 取得できない場合
  - 空Cellになる実際のDOM原因を特定する
  - 状態TextをCell内のAccessible Textとして提供する
  - Decorative Dotだけを`aria-hidden`のまま維持する
  - 二重読み上げになる不要な`aria-label`は追加しない

実際のTest失敗を確認せず、Accessibility対応という名目でMarkupを変更しないこと。

---

# 14. `payment-processing`の再現確認と修正

対象：UX-020

PollingやTimeoutを先に追加しない。通常のPlaywright Testで再現条件を確定してから、同じ実装内で必要な修正を行う。

## 14.1 Focused E2Eを追加する

- `payment-processing`ScenarioへResetする
- regular CustomerでLoginする
- 対象の注文一覧または注文詳細へ移動する
- 一定時間内にLoadingが終了するか確認する
- `支払い処理中`、注文番号、Payment状態を確認する
- 画面操作が不能にならないことを確認する
- Console ErrorとPage Errorを記録する

## 14.2 再現した場合の切り分け

次を順番に確認する。

1. App RuntimeがReadyにならないのか
2. Route Guardが待機し続けるのか
3. `getMyOrder()`が解決しないのか
4. Dexie QueryまたはTransactionがBlockedなのか
5. Scenario Reset直後のSession参照が不整合なのか
6. Playwright MCPだけの問題で、通常のBrowser／Testでは再現しないのか

## 14.3 修正条件

- Repository／Use CaseのPromiseが解決しない場合
  - 根本のQueryまたはTransactionを修正する
- Reset後のRuntime再初期化が停止する場合
  - Reset／Reload後の初期化処理を修正する
- 注文は取得できるがProcessing状態の説明だけ不足する場合
  - 注文詳細に`支払い処理中`と次のActionを表示する
- 通常のPlaywright Testで安定して再現しない場合
  - Production Codeへ推測修正を入れない
  - 再発防止のFocused Testだけ残す

### 禁止事項

- 原因不明のまま無限Pollingを追加しない
- 一律30秒TimeoutでErrorへ変換しない
- Paymentを強制成功または失敗へ変更しない
- Scenario固有のHardcodeを画面へ追加しない

---

# 15. Test実装

修正した機能には、既存Testの更新だけでなく、問題を再現するFocused Testを追加する。

## 15.1 Component／Unit Test

最低限、次を確認する。

- Return先のValidation
- Role別のLogin後遷移
- Cart Merge Resultの表示文言
- Cart Merge Resultの除外理由変換
- Checkoutの`created／resumed／replaced`表示
- 在庫数表示ルール
- 住所候補適用時の既存値保持
- Home CTAのRole別表示
- Review状態別Action
- Scenario Metadataの対応漏れ
- Last Admin制約説明
- One-time Noticeの1回限りの読出し

## 15.2 Playwright E2E

最低限、次のFlowを追加または更新する。

### Guestから注文

1. Guestで商品をCartへ追加
2. Checkoutを選択
3. Login
4. Login後の復帰先を確認
5. Cart統合結果を確認
6. Checkoutを完了
7. 各Stepで見出しがViewport内にある
8. 注文完了で注文番号がViewport内にある

### Guest Cart Overflow

- `guest-cart-merge-overflow`
- 統合前後数量と上限調整の説明を確認

### Checkout再開・置換

- `checkout-resume`
- `checkout-replaced`
- `cart-version-invalidates-checkout`
- 表示Messageと最新内容を確認

### Invalid Cart

- `cart-with-invalid-items`
- Generic Errorではなく、先に修正すべきItemが分かる
- 問題Item削除後に価格同意できる

### 商品在庫

- `low-stock`
- `out-of-stock`
- 通常在庫
- Variant切替時の具体数と数量上限を確認

### Customer Account

- Mobile Account Navigation
- 住所候補で入力済み番地を保持
- Rank／Account状態表示
- Review対象商品と状態表示

### Home／Guide

- Guest、Customer、Operator、AdminのCTA
- Login画面から固定Account一覧がなくなりGuideへ移動できる
- `empty-catalog`で明確なEmpty Stateが表示される

### Admin

- 商品Formの未保存離脱確認
- Previewの表示内容
- 発送準備開始後のStatus同期
- Last Admin制約理由
- Scenario説明
- Reset確認、Reset後のLogin案内

### Accessibility

- 代表的なAdmin TableのStatus CellをRoleとNameで取得できる

### Payment Processing

- 前節のFocused E2Eを実行する

---

# 16. Responsive確認

最低限、次のViewportで確認する。

- Desktop：`1440×1000`
- Tablet：`1024×900`
- Mobile：`390×844`
- Small Mobile：`320×700`

主要確認画面：

- Home
- Guide
- Login
- 商品詳細
- Cart
- Checkout各Step
- 注文完了
- Profile
- 配送先
- 注文詳細／Review
- Admin商品編集
- Test Control

Adminの管理操作自体は既存どおり1024px以上を前提とし、MobileへTable操作を追加しない。

---

# 17. 壊してはいけない既存動作

- 商品検索、Filter、Sort、Pagination
- Filter 0件時の解除導線
- Variantごとの価格、Sale、会員割引
- 在庫切れVariantの選択不能
- Cartの価格内訳、送料、会員割引
- Checkout Stepper
- Payment成功、利用拒否、残高不足、認証失敗
- Payment失敗後の再試行
- 注文完了時のCart消費
- Customer注文履歴のPayment／Order／Shipment分離
- Adminの商品、SKU、Inventory分離
- 在庫履歴とVersion管理
- 商品・ReviewのBulk Partial Failure表示
- Reviewの公開、非公開、再公開履歴
- Admin Mobileの1024px境界案内
- Test API、Seed Scenario、固定Clock、Payment Delay
- `default`Scenarioの決定的な初期状態

---

# 18. 完了条件

次をすべて満たした時点で実装完了とする。

- Login後に購入導線へ自然に復帰できる
- Cart統合結果とCheckout再開／置換結果が理解できる
- Checkout遷移後に重要情報が画面外へ残らない
- Invalid Cartで次のActionを判断できる
- 商品詳細で選択中SKUの正確な在庫数が分かる
- 住所候補利用で入力済み番地を失わない
- Profileで会員RankとAccount状態を確認できる
- Review対象商品と現在状態を確認できる
- Login画面のTest Account情報がGuideへ整理されている
- Home CTAがRoleとLogin状態に一致する
- Empty Catalogを読込失敗と誤認しない
- 商品Formの未保存変更を誤って失わない
- 商品Previewで主要な変更内容を判断できる
- Admin注文詳細の状態表示が同期する
- Last Admin制約の理由が分かる
- Test ControlのScenario目的とReset影響が分かる
- Status BadgeのAccessibilityをTestで確認している
- `payment-processing`の再現結果に基づいて必要な修正だけを行っている
- Desktop、Mobile、Small Mobileの主要Flowを確認している
- 既存正常系と既存Scenarioを壊していない
- Format、Lint、Typecheck、Unit／Component Test、必要なPlaywright E2Eがすべて成功する

問題を隠すためにTestを弱めたり、待機時間だけを増やしたりしないこと。