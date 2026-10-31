# PR #199で発見した製品改善候補・既存製品差分の監査

## 対象と更新規則

本レポートは[PR #199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)のScenario Shop全サポート動作の分析中に根拠を得た不具合・仕様不整合・UI/UX・性能・保守性・セキュリティ・テスト容易性等を記録する。製品全体の別の改善監査ではない。収集はPR #199の全機能分析と教材技術受入が完了するまで続ける。詳細な機能分析と実装経路は[全機能分析レポート](./2026-10-30_pr199-supported-behavior-analysis.md)を参照する。

同一の根本原因・対象・再現条件は同じ行を更新し、定期実行のたびに日時別に複製しない。各候補の根拠（BR/AC、実装、テスト、固定Seed、実Run）、確認済み事実/仮説、重大度・利用者影響・再現状況、製品適合の判定、教材の成立・代替、既存Issue/PRとの重複、推奨対応を具体化する。情報がない箇所は「未確認」とし断定しない。既存[Issue #97](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/97)は特定日の探索テスト分に対象が限定されており、このレポートの候補を自動で追記しない。新規Issueは原則作成しない。

**基本分析の完了と製品の仕様適合は別判定。** `analysis_status=analyzed`は根拠付き基本分析を意味するだけで、製品PASS・E2E/実画面PASS・不具合解消を意味しない。期待仕様や必要証拠が未決の分析は`review_required`/`blocked`のままとする。改善候補が未修正なだけでは教材受入を止めないが、演習が実行不能なら技術受入の未達とする。現在の候補は実行再現や仕様判断が未完であり、**確認済み不適合と推測を混同しない**。

## 現在の改善候補

| 対象・分類 | 確認した根拠・現象 | 現在の確認状態 | 教材・利用者への影響 | 次の調査・対応方針 |
| --- | --- | --- | --- | --- |
| 在庫0/1〜5/6以上の管理在庫分類（仕様不整合） | `BR-ADMININV-001`/`AC-ADMININV-001`は6以上をavailable、Dexieは1以上で判定。UIの状態列は有効/無効Badge | 静的に差異確認、0/1/5/6の実画面未検証 | 在庫判断と境界値演習の正解に影響。未決期待値を固定しない | 実行再現と表示・件数を確認。製品修正は行わない |
| 商品一覧emptyの戻り導線（仕様不整合候補） | `storefront.md`のemptyは戻る導線要求、Web `catalog-list-page.tsx`は無条件の0件で`action={null}` | 静的照合、実画面未検証 | 教材のレビュー題材には使用可。別の条件で代替可能 | 仕様と画面の差を再現確認し、仕様適合は未確定 |
| 管理商品絞り込みとページ位置（UI動作候補） | `AdminProductsContent`はkeyword以外のフィルターでpage1へ戻らない可能性 | 静的分析、50ページ目からの実再現未実施 | 対象データの見落としを招く可能性、教材の必須修正ではない | many-productsで再現し影響を確定 |
| 注文一覧のNative状態ラベル（UX/仕様判断） | Nativeは内部statusを表示、Webは日本語表示。正式なPlatform別契約は未確定 | 静的な表示差を確認 | Web/Nativeの検証条件を混同しない | 利用者向け表示契約を調査、未決は保持 |
| 決済失敗の理由・復旧・再試行（仕様差・不具合候補） | 失敗理由の汎用表示、Web/Native再試行選択差、復旧導線・reject時表示は分析レポート参照 | 一部コード静的照合、実ブラウザ/Android未検証 | M06/M07の誤った期待結果を防止 | 実再現と仕様判断を分け、確定まで製品修正しない |
| Homeカテゴリー・会員特典のWeb/Native差（仕様判断） | 0件カテゴリーの表示と会員特典/Role導線にWeb/Native差がある | 静的分析。Platform意図は未確定 | 演習の期待結果を固定しない | Platform別BR/ACと画面正本を照合 |
| 商品詳細の多SKU・out-of-stock導線（演習条件） | 13 SKUのWeb select/Native chips差。out-of-stock SeedのTシャツMのみ0だがWebは在庫ありSを初期選択。defaultに単一在庫0商品あり | 既存SeedとUI静的照合、実画面確認は別 | 製品修正せず既存単一SKU商品で代替可 | 真の不具合と単なるSeed選択差を分ける |
| 検索対象範囲の解釈（仕様未決） | 実装は商品名/商品コード以外にカテゴリー・ブランド・SKUにも部分一致。正式な想定範囲は未確定 | 静的分析、実検索未受入 | 未確定の検索対象を仕様上の正解にしない | 正式仕様の対象範囲と実挙動を確認 |

この一覧は既存の分析記録からの整理であり、独立した実ブラウザ/Androidの再現証拠を新たに取得したことは意味しない。重大度と製品適合は各行の根拠・影響・実証に基づいて今後確定する。緊急性の高いセキュリティ/データ問題は発見した実行回で優先報告し、その他は定期実行で現在状態を報告する。

## PR #199に既に混在する製品差分（19ファイル）

製品実装9、正式仕様1、既存製品テスト9の計19ファイルを、PRのbase→HEAD差分として一次分類済み。**19ファイル=19個の独立した問題ではない**。同じ目的の実装・テスト・仕様変更はまとめて判断し、個々の変更hunkと関連コード、コミット由来、正式BR/AC、セキュリティ、Web/Native、既存回帰の証拠を確認する。以下の一次表は処理方針の確定ではない。

| 既存差分ファイル | 監査する変更目的・影響 | 現状 |
| --- | --- | --- |
| `src/application/use-cases/account-use-cases.ts` | 認証・認可の境界、既存呼出し元と回帰 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `src/application/use-cases/checkout-order-use-cases.ts` | 住所・支払方法の検証とSession/Cart整合 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `src/infrastructure/database/dexie/basic-repositories.ts` | カテゴリー全件取得・並び替え・ページ境界 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `src/infrastructure/database/dexie/cart-checkout-repositories.ts` | 価格承諾時の数量上限と原子性 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `src/infrastructure/database/sqlite/native-customer-application-repositories.ts` | Native価格承諾の数量上限、Web同等性 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `src/presentation/native/native-purchase-screens.tsx` | Native会員/Checkout/決済画面、書式・UI回帰 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `src/presentation/native/native-screens.tsx` | 価格承諾操作の非価格問題時の禁止条件 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `src/presentation/pages/checkout-order-pages.tsx` | 住所復元・決済選択/再試行・Checkout導線 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `src/presentation/pages/product-detail-page.tsx` | 低在庫の購入上限表示 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `docs/spec/features/checkout-and-payment.md` | 既存の仕様変更の妥当性（本更新では空行だけ修正） | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `tests/component/auth-account-pages.test.tsx` | 会員表示・認証のcomponent証拠 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `tests/component/catalog-pages.test.tsx` | 在庫表示の境界値証拠 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `tests/component/checkout-order-pages.test.tsx` | Checkout導線・表示のcomponent証拠 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `tests/component/native/native-purchase-screens.test.tsx` | Native画面の表示・機能の回帰証拠 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `tests/integration/admin-master-use-cases.test.ts` | カテゴリー大量件数・並び替えの回帰 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `tests/integration/auth-account.test.ts` | 住所候補の認可境界 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `tests/integration/cart-use-cases.test.ts` | 数量上限拒否・データ不変 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `tests/integration/checkout-order-use-cases.test.ts` | Checkout Session・決済の回帰 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `tests/repository-contract/native-customer-shared.test.ts` | Native SQLiteの失敗時rollback | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |

### 処理方針の決定規則

- 各変更目的について、必要性（正式仕様・不具合・テスト）、安全性（認証/認可・データ整合・個人情報・回帰）、PR #199の教材目的との整合、代替手段、コミットと関連テストを監査する。
- **本PRに残す**：安全性・必要性・今回の目的との整合が証拠で確認できる。
- **別PRへ分離する**：製品として必要で安全だが、本PRの教材・分析目的から独立している。
- **取り消す**：必要性がなく誤った変更であると証拠から確認できる。削除やrevertによる影響も調査する。
- **判断保留**：仕様未決、証拠不足、認証・金額・状態・Native回帰などの確認が残る場合。安全性が確定したとみなさない。

処理方針は条件が満たされれば自動で判断・本表に記録してよいが、**実際のrevert・移設・別PR作成・機能修正は別途ユーザーの明示承認が必要**。PR #199のマージ前に最終の配置・未解決リスク・実行権限を確認する。書式例外は`docs/spec/**`のMarkdownだけに適用し、意味を変えない空行等をCI/lintとdiffで確認して変更可能とする。製品コード・製品テストや正式仕様の意味変更には適用しない。

## 現在の受入・管理上の注意

- 全サポート動作の暫定分母188件、基本分析69件、非default状態18/20件という数値は、必ず[分析台帳](../../training/ai-assisted-qa-course/coverage/supported-behaviors.json)の**最新内容から再集計**する。本文中の数値は初期整理時の参考であり、進捗の正本ではない。
- 製品改善の未修正候補だけで分析の達成を拒否しない。ただし、分析に必要な仕様・証拠が未決なら基本分析未完、教材実行が阻害されるなら教材受入未完を維持する。
- PR本文は現行の主要な未解決事項と成果/受入状態のみ。調査の時系列履歴はGit履歴と全機能分析レポートへ残す。
