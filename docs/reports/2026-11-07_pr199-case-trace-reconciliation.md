# PR #199：#219のCase追跡CSVと最新基本分析の差分（2026-11-07）

## 対象と結果

PR #199の追跡用CSV `docs/reports/2026-11-04_pr219-case-traceability.csv`（Git Blob `7ece3d3ca7bbdce8a4c8de4431e0c0b057e146ea`、**953行**）と、分析正本 `training/ai-assisted-qa-course/coverage/supported-behaviors.json`（Git Blob `ef2f50fd65e481ca90dc64da6f88934511c9eebe`、**208動作・79要件**）を、全行の `behavior_id + condition_ref` で突合した。

- **一致**：動作ID208/208、Requirement参照、種別、Platform、79要件の追跡定義205組。重複した動作＋条件キーは0。
- **要再照合**：**12動作に対応する67行**で、旧CSVの`case_expected_from_behavior`、Role、Scenario、基本分析状態が現在の台帳と異なる。他の886行の同4項目は一致した。
- **動的受入**：旧CSVの953行すべて`未受入`。全行の`observed`、DB before/after、exit、CI Run、Trace/動画/画像/Console/Network/Report欄は空。**Case採用や実SUT PASSを証明しない**。
- 旧CSVの`sut_head_sha`は全行で`46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`。分析正本の`source_commit`は`383efc9107ef3d5f78c5659473277166c1bba2de`。いずれも今回の#199最終HEADや未マージ#210の製品改修を証明しない。

## 要再照合の12動作（該当67行）

| 動作ID | CSV行数 | 期待結果を再確認すべき条件 |
| --- | ---: | --- |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | 1 | empty-catalogと絞込0件を区別し、空パネル内CTAの有無ではなくホームへの復帰導線を判定 |
| `SCREEN-CHECKOUT-ADDRESS-S-resume-notice` | 1 | 初回のみの再開通知、reload/同一Session、新Checkout/Reset、Native範囲を区別 |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` | 4 | Cart version不一致時の拒否理由、Order/Payment/在庫/履歴/Checkout/Session不変性 |
| `SCREEN-ADMIN-PRODUCTS-A01-02` | 7 | 管理商品一覧の検索・状態フィルター、many-products、Role境界、Web管理対応範囲 |
| `SCREEN-ADMIN-USERS-A01-02` | 7 | Role/Rank/Status検索と個人情報アクセス制限、Admin以外の拒否 |
| `SCREEN-ADMIN-USER-DETAIL-A01-02` | 7 | 他者Role変更、自己変更/最後のAdmin拒否、User versionとSession |
| `SCREEN-ADMIN-USER-DETAIL-A01-03` | 7 | 顧客Rank変更と非customer拒否、Checkout・Cartへの影響 |
| `SCREEN-ADMIN-USER-DETAIL-A01-04` | 7 | active/suspendedの許可遷移、全Session失効、Checkout・Cart前後 |
| `SCREEN-ADMIN-USER-DETAIL-A02-01` | 6 | 本人Adminの自己降格・停止をUI/Use Caseで拒否、全DB不変 |
| `SCREEN-ADMIN-USER-DETAIL-A02-02` | 6 | withdrawn対象のRank/Role/Status変更の拒否とDB不変 |
| `SCREEN-ADMIN-USER-DETAIL-A02-03` | 7 | Admin 2人から1人への他者変更と唯一Admin本人の拒否、Version競合 |
| `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | 7 | 停止staffの権限拒否、`/forbidden`→`/admin`循環防止、戻り導線と非露出 |
| **計** | **67** | |

## 採否・再開条件

1. 対象12動作の最新正式仕様、Role/Seed/Version条件と、現在の`expected`・`test_condition`を独立に確認する。旧CSVの期待結果を現在の台帳で機械的に置換しない。
2. **正式Case ID・採用/既存再利用/不要/保留**を208動作・79要件全体で決定し、既存Case/Assertionの該当対象とSUTの最終SHAを明示する。953行を953件の別Caseとして数えない。
3. 必要なRole/Session、Web/Android、DB before/after、実Run、Trace、画像、CI/attemptの**実在を確認した場合だけ**証拠欄を記録する。既知製品FAILは#210側の解消・未解消を分離する。
4. 対象CSVと分析台帳が意図せず乖離しないよう、`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`で**953行、208動作、79要件参照、既知差分12動作/67行**を検査する。これは静的整合性のテストであり、正式Caseや製品の独立レビュー完了を意味しない。

**受入判定**：Case正式採否と実証拠は全件未受入。既存44完了条件のチェック状態は維持し、製品SUT・既存テスト・#210へ変更を加えない。
