# Repository Audit Remediation G2/G5/G6 実装計画

## 0. 依頼概要

- 依頼内容: 最新 `main` を基準に、Repository Audit Remediation Plan の G2、G5、G6だけを最小修正する。
- 背景: PR #38は `main` にマージ済みだが、監査でCheckout結果、Web Search Suggestion、Cart item ownershipのRoot Causeが残っている。
- 期待成果: persisted state／既存React Aria contract／Cart ownership invariantに基づく実装と、指定RegressionがPASSする状態。

## 1. ゴール / 完了条件

- ゴール:
  - G2: Order ownership、Order state、latest Payment stateを確認して結果画面を決定し、route `complete` / `failed`を正本にしない。Web/Nativeのmissing orderId・unauthorizedを既存Boundaryへ送る。
  - G5: 通常typing後のasync suggestion到着時にComboBoxを開き、2文字未満、no-result、stale protection、Enter、Arrow操作を維持する。
  - G6: Cart item update/delete前に`currentItem.cartId === currentCart.id`を検証し、foreign itemを拒否する。
- 完了条件（DoD）:
  - G2のpaid→failed、failed→complete、missing orderId、unauthorizedがRegressionで固定される。
  - G5の通常typing、no-result、Enter、Arrow、stale responseがComponent Testで確認できる。
  - G6のforeign update/delete拒否と既存valid mutationがRepository Testで確認できる。
  - Focused Test、変更面に必要なRepository gate、可能なWeb/Native Before/After runtime確認、Run Artifact SanitizerがPASSする。
  - G2/G5/G6以外のProduct/Workflow/Dependency/Framework変更を含めない。

## 2. 現状理解

- `origin/main` と作業ブランチは `a3a58ae4b4168c34307e6dd0f2d21c039a972fab` で一致し、PR #38は `MERGED`、merge commitは`b833afb...`である。
- Web `OrderResultContent`は`getMyOrder`で所有者境界を通るが、見出し、retry、説明、CSSをroute `kind`から決定している。`OrderDetailDto`にはOrder statusと`paymentAttempts`がある。
- Native Completeはorder lookupをせず、orderIdなしでも成功表示する。Native Failedはlookup後もOrder/Payment stateを検証せず失敗表示する。
- `SearchCombobox`はasync結果を`items`へ反映するが、結果到着時のopen stateを制御していない。既存のrequest sequenceによるstale protectionはある。
- `DexieCartRepository.setQuantityAndTouchCart` / `deleteItemAndTouchCart`はCartとitemを別取得後、itemの`cartId`をcurrent cartと比較していない。Native adapterはcart_id条件付きSQLを既に使っているため変更しない。

## 3. 前提 / 非目標

### Assumptions

- 既存の`StatePanel kind="not-found"`とNative `NativeStatePanel`をmissing/unauthorized boundaryとして再利用する。
- G2の結果判定は既存DTOのOrder statusと最新Payment statusを使い、processingや整合しないstateは成功/失敗を断定せず既存not-found boundaryへ送る。
- React Aria Components 1.19.0の`isOpen` / `onOpenChange` / `allowsEmptyCollection`を使う。新しいsuggestion frameworkやcancellation機構は導入しない。

### Non-goals

- G1/G3/G4/G7/G8/G9、Native Catalog、route authorization全体、Payment State Machine、UI redesign。
- 新しい共通framework、global retry、timeout増加、assertion弱体化、runtime専用Scenario追加。
- Audit Report本文、既存仕様の改番、依存version、CI workflowの変更。

## 4. 影響範囲 / 調査対象

- G2: `src/presentation/pages/checkout-order-pages.tsx`、`src/presentation/native/native-purchase-screens.tsx`、Web/Native checkout component tests、必要なE2E入口。
- G5: `src/presentation/components/search-combobox.tsx`、`tests/component/presentation-foundation.test.tsx`。
- G6: `src/infrastructure/database/dexie/cart-checkout-repositories.ts`、`tests/repository-contract/cart-mutations.test.ts`。

## 5. 変更方針

1. G2は既存Order detail取得のownership boundaryを維持し、persisted Order/Payment stateから結果種別を導出する。Webは導出種別だけを表示・retry条件へ使い、Native Complete/Failedは共にorderIdとorder detailを読み込んで同じboundaryを使う。
2. G5はqueryが2文字未満なら閉じ、current requestのasync結果（空配列を含む）が到着した時だけ`isOpen`をtrueにする。`allowsEmptyCollection`でno-result表示を維持し、sequence guardは残す。
3. G6はcurrent item取得直後にcart ownershipを確認し、既存のnot-found error contractで拒否する。update/deleteのvalid pathは変更しない。
4. 各変更後に対象Focused Testを実行し、失敗時は最初の異常を調査してから次工程へ進む。

## 6. 検証方法

- Focused:
  - `pnpm exec vitest run tests/component/checkout-order-pages.test.tsx tests/component/presentation-foundation.test.tsx`
  - `pnpm exec jest --config jest.config.cjs tests/component/native/native-purchase-screens.test.tsx --runInBand`
  - `pnpm exec vitest run tests/repository-contract/cart-mutations.test.ts`
- Repository gates（変更面に必要なもの）: `pnpm run format:check`、`pnpm run lint`、`pnpm run typecheck`、`pnpm run test:repository`、`pnpm run test:component`。必要に応じてCheckoutの既存integration/e2eを追加する。
- Runtime:
  - Webで既存seedのpaid/failed orderを使い、opposite route、missing orderId、unauthorizedをBefore/After確認する。
  - Nativeは既存physical-device/CI capabilityが利用できる場合のみ、same persisted statesとdirect result routeを確認し、未実行はPASS扱いしない。
- 成功判定: 指定ケースがstate contradictionを表示せず、正当なresultだけがsuccess/failure UXを表示し、foreign cart itemがDBを変更しない。

## 7. リスクと未解決論点

- Risks: OrderとPaymentが不整合な場合に偽の結果を出すこと、React Ariaが空Collectionを閉じること、foreign rejectionがversion conflictに隠れること。
- 対策: Order/Paymentの両方を判定、`allowsEmptyCollection`を指定、ownership checkをversion checkの前に置き、状態不変をテストする。
- Open questions: なし。Native runtime capabilityの有無だけは検証時の実行可否として記録する。

## 8. 成果物

- 変更ファイル: G2 Web/Nativeとその既存Component Test、G5 ComponentとそのComponent Test、G6 Dexie repositoryとRepository Test。
- 付随ドキュメント: 本計画、`.codex/runs/20260822-151533-JST/`の標準Run Artifact。

## 9. 備考

- PRは作成してもmergeしない。force push、rebase、amend、destructive reset/cleanは行わない。
