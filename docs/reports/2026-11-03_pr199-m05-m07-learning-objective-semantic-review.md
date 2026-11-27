# PR #199：M05〜M07学習目標・知識ノード意味的レビュー（2026-11-03）

## 対象・判定

レビュー基準HEAD：`60f88867bd8e7fd23c78da4daf7e008d2231d8f0`。M05〜M07の各5学習目標（計15件）と、M05の16・M06の7・M07の7知識ノード（計30件）について、`level2`、`can_do`、教材README、実技`exercise.md`、`submission-template.md`、採点基準`scoring-tests/Mxx.json`を照合した。先行の[四択直接対応なし8ノード](./2026-11-03_pr199-eight-unquizzed-knowledge-semantic-review.md)で確認した`K-M05-01/03/04/05`の4件は今回の追加件数へ二重計上しない。**今回の新規静的確認は15目標・26ノード。**

**結果**：対象目標と知識ノードには、教材の説明、本人の操作・判断、少なくとも1採点基準の対応を確認した。明確な教材間の直接矛盾は確認しなかった。ただし固定Skill、Playwright、Codespaces、受講者の実提出物、採点実装・実モデル校正の成功は確認していない。全ての`draft_requires_content_review`を解除する根拠にはならない。

## M05：TypeScript・Locator・実行環境（5目標、16ノード）

| 目標と採点基準 | 照合した説明・実技 | 独立に確認する必要がある内容 |
| --- | --- | --- |
| `M05-01` / `M05-CR-01` | README第1〜6章でNode.js・pnpm・型・変数・配列・オブジェクト・分岐・関数・`import/export`・`async/await`を解説。TypeScript短コード演習とP01〜P04で予測、変更、実出力、型診断を要求 | `K-M05-01`〜`07`、`11`〜`14`。特に`03/04/05`をLocator修正だけで達成にしない。独立ファイルの`tsc`と`tsx`を混同しない |
| `M05-02` / `M05-CR-02` | README第6A・7章のHTML・Role・アクセシブル名とLocator。既存Mugリンクと別に、P05でCartの2明細から一意な数量select・削除buttonを選ぶ | `K-M05-07/15`。Cart全体の複数件・明細へscopeした一意性と、実画面で確認した値を分離 |
| `M05-03` / `M05-CR-03` | README第7.2節の表示と業務Assertionの差。P05のread-only数量Assertion、P06の`expect`削除案拒否 | `K-M05-08`。クリックや表示だけで商品詳細やCartの業務上の完了を宣言しない |
| `M05-04` / `M05-CR-04` | README第6・8章、P03で構文・型・実行時の別診断、P04でPromise/awaitの順番、P06で根拠のない固定待機案拒否 | `K-M05-06/09/16`。対象ファイルを指定した`tsc --noEmit`が行われたか、型の成功を業務PASSにしないか |
| `M05-05` / `M05-CR-05` | README第9〜10章、既存`product-link.spec.ts`のbefore/after、Config/testDir、8082テストserver・8081通常Web・6080 Private noVNC、`course:run`のrun_id/report/spec snapshot | `K-M05-01/10`。**指定specの実Run**とConfigの正しい説明が必要。P05/P06の選択・拒否だけでは`M05-05`の実行達成とみなさない |

**ノード別確認**：`K-M05-01`実行環境・対象アプリ、`02`依存/コマンド、`03`基本型・配列・オブジェクト、`04`分岐・関数、`05`import/export、`06`async/await、`07`Locator/Action、`08`業務Assertion、`09`待機/失敗分類、`10`Runと成果物、`11`配列添字、`12`object参照、`13`条件比較、`14`引数・戻り値、`15`Roleと一意なLocator、`16`型/実行/Assertionの失敗。各`can_do`に教材の具体例・実技と採点基準の対応があるが、実操作・本人の独立判断は未受入。

## M06：CaseからのE2Eと独立実行（5目標、7ノード）

| 目標と採点基準 | 照合した説明・実技 | 独立に確認する必要がある内容 |
| --- | --- | --- |
| `M06-01` / `M06-CR-01` | 通常追加・上限超過/数量保持・low-stock境界の固定3 Caseと、削除`CASE-CART-004`、数量更新`CASE-CART-005`を別testで実装。P05で本人M04承認Caseが実行可能ならさらに別test | `K-M06-01/06`。固定3件の補完だけでは新規specを構成したとしない。公開fallbackをPhase 1修了の証拠にしない |
| `M06-02` / `M06-CR-02` | 各test前Reset、test間のContext/初期状態、P04/P06の順序変更と再実行 | `K-M06-02`。他testのCart状態を前提にせず、別順序でも独立の証拠が必要 |
| `M06-03` / `M06-CR-03` | P01〜P03で数量1→2・再読込保持、削除buttonと数量selectの操作経路、UI選択肢とAPI拒否の区別 | `K-M06-03/07`。選択肢がないだけでは業務拒否を実証しない。Webから数量0を選択できると仮定しない |
| `M06-04` / `M06-CR-04` | `new-case.spec.ts`を`initial`/ `repeat`として別実行し、source_sha・spec_sha256・Run ID・reportを照合 | `K-M06-04`。異なるRunの成功を同一実行の結果として引用しない |
| `M06-05` / `M06-CR-05` | `PASS`・`FAIL`・`未実行`・`BLOCKED`を区別し、P05/P06の失敗原因と実行可否を記録 | `K-M06-05`。実行を試みていない状態をFAILと混同せず、環境障害を製品不具合と断定しない |

**ノード別確認**：`K-M06-01`Case→spec、`02`Seed/Reset/Context、`03`業務Assertion、`04`report/receipt/Trace、`05`結果分類、`06`別Caseの新規spec、`07`Locator/Action/業務結果の分離。教材本文・実技・採点基準への対応あり。固定3 Caseの`main`、別2 Case以上の`initial`と`repeat`を個別の実行証拠で確認するまで受入しない。

## M07：失敗診断・before/after・POM/fixture（5目標、7ノード）

| 目標と採点基準 | 照合した説明・実技 | 独立に確認する必要がある内容 |
| --- | --- | --- |
| `M07-01` / `M07-CR-01` | README第1章、診断AのAssertion失敗、合成B/Cとの区別、P01〜P03のTest/Product/Environment/Flaky仮説と反証 | `K-M07-01`。可能性を実際の製品原因と断定しない |
| `M07-02` / `M07-CR-02` | README第2章、Run/Trace/Screenshot/log、P01〜P03/P06の証拠と限界 | `K-M07-02`。retain-on-failure/only-on-failureなのでPASSにTraceがなくても未実行と断定しない |
| `M07-03` / `M07-CR-03` | README第3章、P03で合成CのRetry成功を分析、Timeout延長を原因修正と扱わない | `K-M07-03`。原因ごとの反証方法と必要証拠があるか |
| `M07-04` / `M07-CR-04` | README第4章、診断用Aとは別のTODO失敗`repaired-assertion.spec.ts`をbefore/afterで比較、P04〜P06で業務Assertionを維持 | `K-M07-04`。修正前後の別Run、異なるspec SHA、同じ配布SHAを照合。Assertionを削除してPASSにしない |
| `M07-05` / `M07-CR-05` | README第5〜6章、Page Object＋標準fixtureへの共通化と3件目の数量再読込Case。**before 2件、after 3件以上**の実Runを明示 | `K-M07-05/06/07`。採否説明だけでPOM/fixtureの実装と別Runを省かない。各test前Reset、業務AssertionをPage Objectに隠さない |

**ノード別確認**：`K-M07-01`原因分類、`02`Trace/log、`03`Retry/Timeout、`04`最小修正・別Run、`05`POM/helper/fixture採否、`06`Page Objectへの操作共通化、`07`各test前Reset/fixture scope。いずれもREADMEの解説と実技・採点への対応を確認した。

## 特に確認が必要な境界

1. **M05**：`M05-CR-05`の`required_evidence`はP05/P06も参照するが、学習目標`M05-05`には指定specの実行が含まれる。採点コードが実Runのreceipt/reportとConfigを確認せず誤PASSしないか、担当セッションによる負例検証が必要。
2. **M05 P03**：`tsx`の実行成功は型検査ではない。対象workspaceファイルを引数で指定した`tsc`実行と診断の前後を確認する。
3. **M06 P05**：本人がM04で承認した新CaseがUI/Seedで実行可能な場合は、その独立testを省けない。実行不能/欠落ならfallbackと理由を区別し、Phase 1承認Caseの代替合格としない。
4. **M06 P06**：`CASE-CART-004`（削除button）と`CASE-CART-005`（数量select→再読込保持）が別testであり、少なくとも2件が初回/再実行それぞれでPASSしたか確認する。
5. **M07**：合成B/Cログの分析・診断Aの実Run・修正対象TODOのbefore/after・POM/fixtureのbefore/afterは異なる証拠。前の成功を別責務の成功へ流用しない。
6. **M07 P05/P06**：afterが2件PASSだけなら追加3件目は未受入。Page Objectに仕様Assertionを移して個々の検証責務を失わせた変更は採用しない。

## 引継ぎ・未実施

残りM08〜M10の意味的レビュー、82知識ノード全体の横断見直し、教材の実操作・本人のLevel 2実証拠、採点・公開校正106 Case、Playwright実Run、OpenCode固定Skill、Codespaces実受入、最終HEADのCIは本報告では完了としていない。既存の教材・演習・採点・知識グラフ・SUT・分析台帳・Planは変更していない。
