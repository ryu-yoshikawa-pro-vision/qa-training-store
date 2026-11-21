# Scenario Shop製品変更専用ブランチ

## 確定方針（2026-11-01）

- **製品変更の継続先**：`product/scenario-shop-maintenance`。PR [#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199) に混在していた製品実装9、正式製品仕様1、既存製品テスト9の計19ファイルについて、`main`を親にした専用ブランチで変更内容を保全する。新規製品修正・製品の仕様変更・製品用回帰テストの変更もこのブランチで扱う。
- **PR #199の境界**：上記19ファイルの既存差分をPR #199から取り除く。PR #199はAI協働QA教材・分析・学習環境に専念する。今後、教材分析で製品の改善候補を発見しても、PR #199の製品実装・正式仕様・製品用テストを変更しない。必要な調査・根拠は`docs/reports/pr199-product-improvements.md`等へ記録し、製品修正の着手はこの専用ブランチで行う。
- **作業の境界**：専用ブランチの存在は、未検証の製品問題が正しい、既存19ファイルの差分が安全、または製品修正・本番反映が承認済みであることを意味しない。製品改修は正式仕様・関連Use Case/Repository/UI・Web/Native・回帰テスト/CIを検証し、意味を変える正式仕様や影響の大きい修正は必要な判断を受ける。
- **新規PRや統合は別作業**：この指示だけで製品用PR作成、`main`へのmerge、force push、branch削除、release、Issueの作成・closeを許可しない。製品ブランチが`main`に追従する必要がある場合は通常の非破壊的な方法で差分・CIを確認する。
- **再質問不要**：この19ファイルをPR #199に残すか、いつ分離するかという判断は完了。定期タスクは同じ「最終判断」を未解決ブロッカーとして繰り返し挙げない。新しく発見した製品問題の実証・優先度・修正案は別件として扱う。

## 分離時点の記録

- 分離元PR HEAD：`a33f3b051426aab561786002cd78f6595e7fe364`
- 分離先の元`main`：`05943b5a37ffa1b0db509b9637e19ef404d97708`
- 新ブランチ：`product/scenario-shop-maintenance`
- 変更の移動方法：`main`のtreeに、分離元HEADの下記19ファイルのblobをそのまま配置する。その他の教材・学習用変更は混ぜない。PR #199側では同19ファイルを`main`のblobへ戻す。
- 対象パス：

  - `docs/spec/features/checkout-and-payment.md`
  - `src/application/use-cases/account-use-cases.ts`
  - `src/application/use-cases/checkout-order-use-cases.ts`
  - `src/infrastructure/database/dexie/basic-repositories.ts`
  - `src/infrastructure/database/dexie/cart-checkout-repositories.ts`
  - `src/infrastructure/database/sqlite/native-customer-application-repositories.ts`
  - `src/presentation/native/native-purchase-screens.tsx`
  - `src/presentation/native/native-screens.tsx`
  - `src/presentation/pages/checkout-order-pages.tsx`
  - `src/presentation/pages/product-detail-page.tsx`
  - `tests/component/auth-account-pages.test.tsx`
  - `tests/component/catalog-pages.test.tsx`
  - `tests/component/checkout-order-pages.test.tsx`
  - `tests/component/native/native-purchase-screens.test.tsx`
  - `tests/integration/admin-master-use-cases.test.ts`
  - `tests/integration/auth-account.test.ts`
  - `tests/integration/cart-use-cases.test.ts`
  - `tests/integration/checkout-order-use-cases.test.ts`
  - `tests/repository-contract/native-customer-shared.test.ts`

実際の分離結果は、両ブランチを`main`に対して比較して確認する。製品ブランチの検証結果はPR #199の教材・分析の受入結果と混同しない。
