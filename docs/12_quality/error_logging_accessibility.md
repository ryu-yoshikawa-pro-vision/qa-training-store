# Error・Log・Accessibility設計

## 1. Phase 1 Error契約

Error Code、`ApplicationError`、`messageKey`、`fieldErrors`、`retryable`の正本は`04_data/application_contracts.md`です。本書では別のError Unionを再定義しません。Adapter・RepositoryのExceptionはUse Case境界で`ApplicationError`へ変換し、UIは`messageKey`と`fieldErrors`だけを表示へ使用します。

`messageKey`は原則`error.<ApplicationErrorCode>`形式とし、個別Field ErrorはValidation SchemaのKeyを使用します。Phase 2/3固有ErrorをPhase 1へ先行追加しません。

## 2. Error挙動

- Validation、Conflict、Write Failureは入力を可能な範囲で保持する。
- Form Submit ErrorはError SummaryへFocusし、Summary内LinkからFieldへ移動できる。
- Payment failedは注文詳細から再支払いできることを案内する。
- Payment processing中は状態確認だけを表示する。
- Page読込ErrorはRetryと安全な戻り先を表示する。
- Search Suggestion Errorは入力自体を妨げず、Enter検索を利用可能にする。
- Image Manifestの欠落・Hash不一致・容量超過は`build:web`を失敗させ、Deployしない。Runtime Manifest Recovery、Cache、Fallback分岐は実装しない。個別画像要素の読込失敗時だけPlaceholderと代替Textを表示し、商品閲覧・Cart・注文・管理操作は継続する。
- Product/Variant削除拒否時は非公開または無効化という代替操作を示す。
- 顧客へDB名、内部Exception、Stackを表示しない。

## 3. Runtime Log

開発ConsoleとTest Artifactへ、timestamp、level、eventCode、route、useCase、userId、entityId、correlationId、Version、Error Code、Test Metadataを出力します。

永続Ring Bufferは作らず、Password、Hash、Session、住所全文、電話番号全文を出力しません。

## 4. Accessibility

- WCAG 2.2 AA相当を目標とする。
- Heading、Landmark、Label、Role、Accessible Nameを使用する。
- Error Summaryを`role=alert`または適切なLive Regionとして通知し、Submit後にSummaryへFocusする。
- Summary内Error Linkから該当Fieldへ移動する。
- ModalはFocus TrapとClose後のFocus復帰を行う。
- Cart、支払い結果、注文完了をLive Regionで通知する。
- 色だけで状態を表現しない。
- Web主要FlowをKeyboardで完了できる。
- Search SuggestionはARIA Combobox Patternに従う。
- 星評価はRadio Groupとし、現在値と選択値を読み上げる。
- Dragによる並べ替えには上下移動Buttonを用意する。
- Applied Filter Chipの削除Buttonは条件名をAccessible Nameへ含める。
- Sticky CTAは200% Zoom、Software Keyboard、Focus移動を妨げない。

## 5. 自動検査

Playwright＋axe、Role/Name Assertion、Keyboard E2Eを使用します。重大・深刻な違反をPhase 1 Release前に解消します。

重点対象:

- Storefront Header/Search Combobox
- Mobile Filter Bottom Sheet
- Product Gallery Dialog
- Variation Selector
- Checkout Error Summary
- Rating Radio Group
- Admin Side Navigation、Table、Contextual Save Bar
- Image Asset Picker、SKU編集、商品削除確認
