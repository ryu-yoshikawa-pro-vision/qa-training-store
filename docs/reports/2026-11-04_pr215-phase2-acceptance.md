# PR #215：Phase 2教材・実技の受入確認

## 対象と実施方法

- 作業PR：[#215](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/215)（Draft、baseは`docs/plan-ai-agent-qa-curriculum-redesign`）
- 内容確認の対象HEAD：`268d06236e5b068b924f1d71e296a6ad6b0bb4f1`。本レポート追加前のHEADであり、教材・演習・クイズの静的確認に使用した。
- 方法：GitHub上の当該HEADのファイル・Blob SHA・関連する製品仕様・公開ルーブリック・既存テストを読み取り、15学習目標、M05〜M07のP01〜P06、各クイズ、start/endの入出力契約を照合した。クイズは設問・正答・選択肢の誤答理由・復習先・objective ID・knowledge IDの対応を確認した。
- 実行環境：GitHub接続経由の静的確認。リポジトリをローカルに取得できない環境のため、`pnpm`・TypeScript型検査・Playwright Chromium・配布Shop/Resetの実行は**未実施**。実際の受講者による判断・修了認定も実施していない。既存CIの別HEADの成功を、今回の実Runとして流用しない。

## 完了した静的確認（実Runの代替ではない）

1. **M07-03**：教材の「RetryとTimeout」節、P03の合成C、M07-Q03、Phase 2公開ルーブリックを照合。固定待機・再試行だけで原因修正にしないこと、最初の失敗・Reset・Locator・ネットワークを根拠に仮説を切り分ける受入基準が一致することを確認。合成ログを実Runとは扱わない。
2. **クイズ内容の照合**：M05 12問（Blob `f3683f4aa9b634e23d6e2f42daadd5f5cf375da1`）、M06 8問（`3128bdb33196042fbe09b1377bef25e5f1e4b533`）、M07 7問（`2615f72e1deabc7b89046e924bc1a14cc3a61e99`）、計27問を確認。15の全学習目標に設問があり、正答値は各設問で一意、全選択肢に理由、全問に復習先・出典・存在する知識ノードIDがある。クイズ正解はTypeScript実装・独立Case実行・本人の原因切分け・正式AI評価の証拠に数えない。
3. M05〜M07の教本・演習・提出テンプレート・開始/終了状態・公開ルーブリックを読み取り、P01〜P06の記入欄を確認。ただし実行済みではなく、15目標すべての受入は未完了。
4. M04 endの`M04-result-01/02`とM05 startのID/revision、M07 endの`M07-result-01〜04`とM08 startの引継ぎ定義を照合。M08 startが`M07-result-04`（保守後spec）を受け取る定義はない。本人の修了証拠がない場合は公開fallbackを利用するが、本人の完了実績を補わない。

## このPR内での修正

- `docs/curriculum/ai-assisted-qa/modules/M05/README.md`：Cartの数量や表示と注文DB保存を区別。Locatorのタイムアウト・strict mode violation・操作可能状態の違いを明示。
- `docs/curriculum/ai-assisted-qa/modules/M06/README.md`：Playwrightの失敗結果と、業務受入の環境BLOCKEDを区別。終了コードとreceipt/report・対象Caseの照合方法を記載。
- `docs/curriculum/ai-assisted-qa/modules/M07/README.md`、`training/ai-assisted-qa-course/exercises/M07/exercise.md`：Cartを別ページから開き直す条件と、単なる`reload()`を区別。
- `training/ai-assisted-qa-course/exercises/M07/handoff-template.md`：`M07-result-04`を含む4種類のbefore/after Run、spec SHA・report・Exit code、Git/PRに依存しない安全な保全の記録欄を追加。完成回答や架空PASSは記載していない。

## 未完了と再開条件

| 対象 | 現在の状態 | 完了に必要な証拠・依存 |
| --- | --- | --- |
| M05-01〜05 | 未完了 | P03誤型と修正後の`tsc`非0/0、M05 Locatorの修正前後、P05二明細の専用8082 Chromium Run、Run ID/対象spec/report |
| M06-01〜05 | 未完了 | 固定3 Caseと別Case 004/005の実装を分け、004/005各2件以上の`initial`/`repeat`独立Run、Reset/Context・期待/観測・receiptの一致 |
| M07-01〜02、04〜05 | 未完了 | 実失敗AのTrace・標準出力・Screenshot・report、修正前後別Run、保守前2件と後3件の独立Run・仕様Assertion |
| 実行・横断確認の6項目 | 未完了 | M05 P03/P05、M06 004/005、M07 before/after、8082配布Shopと証拠/Reset隔離、15目標の提出・状態照合、変更HEADの検証ログ |
| 知識グラフの意味レビュー | 未完了 | M05〜M07の30理解ノードは共有Graphで`draft_requires_content_review`。教材節、実技・評価の観測、前提順序を#199で内容確認・調停 |
| M04→M05、M07→M08の実引継ぎ | 未完了 | 本人のID/revision/Run・配布元SHAを実ファイルで確認し、M08側の`M07-result-04`受領の要否を#199/#216で判断 |
| 通常AI学習・Gitを使わないエクスポート | 未完了 | 実モデルによる通常チューター動作、個人データ・秘密情報を除いた保全/復元、#217の正式評価・#218の配布との境界を実証 |

## CI・他ブランチへの引継ぎ

- 変更前HEAD `dd0d2398e101a1ae4a644eb40b38928308322a17` の[Web CI Run 41782026755](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41782026755)：`Style Quality`でMarkdown lint失敗。原因は **#199が所有する** `docs/plans/2026-11-04_143600_pr199-integration-acceptance-tasks.md:3` のMD039（`[ #199 ]` の余計な空白）。他のジョブの成功をこのPR固有のM05〜M07実Runの成功とはみなさない。共有ファイルは#215から変更しない。
- #217/#199へ：`training/ai-assisted-qa-course/assessment/playwright/M07/maintenance-after/cart.spec.ts` の3件目は`page.reload()`のみ。教材P05の「別ページへ移動→Cartへ再訪」と一致しない。正式評価用の参照specは#215から修正しない。
- #216/#199へ：`training/ai-assisted-qa-course/states/M08/start.json`に、M07 end出力`M07-result-04`（`maintenance.spec.ts`）の入力宣言がない。引継ぎに必須かを確認し、必要なら統合側で変更する。
- #199へ：M05〜M07の30理解ノードは現状すべて`draft_requires_content_review`。このレビュー結果は自動的に人間承認へ変更しない。Graph本体と共通テスト、製品SUTはこのPRから編集しない。

## 前回確認時点の進捗

**Progress: 8% (2/25)**。上記2件は静的基準のみを完了。追加の実行証拠が必要な23件は未完了のまま保持する。

**Next**：専用8082の配布Shop、依存導入済み環境とChromiumを使い、M05の型検査とLocator Run、続けてM06独立Case、M07 before/afterを実行する。各Runの実際のID・report・spec SHAを記録し、成功した項目だけチェックする。CIの完了待ちは行わない。

## 再開後の確認：30理解ノード・教材・実技の対応

- 確認対象HEAD：`1704d9209ac4209978d7e23c19839e4dcdc15e40`（本追記より前）。知識グラフBlob `1333e120e8f97af85961701563309f04a82ae3e6`、M05〜M07教本、P01〜P06の演習、提出テンプレート、クイズ27問と公開採点基準15件を読み取った。リポジトリ内の専用Playwright実Run、受講者の判断、実モデルの採点は**実施していない**。
- **30/30ノード**で`can_do`・教材見出しの既存リンク・少なくとも1件の採点基準が存在し、参照先のMarkdown見出しに欠落なし。Graphの`requires`に、確認対象3モジュール内の循環はなかった。クイズの知識IDとの対応はM05で12/16、M06で7/7、M07で7/7（M05の残り4ノードはクイズが直接紐付かず、実技・採点基準で確認する構成）。
- **M05の意味的照合**：Node/pnpmと実行対象の区別→TypeScriptの値/型/関数→import/exportとawait→Locator/Action/Assertion→失敗分類と8082実行証拠という順序を確認。K-M05-11〜16は配列/オブジェクト/関数/HTML Locator/失敗分類の具体的な行動とP01〜P05を対応付ける。型検査だけではCartの業務結果を認定しない。
- **M06の意味的照合**：Case/BR/ACからReset・独立test・業務Assertionへの対応、004削除と005数量更新の別責務、実行コード/Run ID/receipt/reportとの対応、PASS/FAIL/未実行/BLOCKEDの区別を確認。問題のある表示だけのAssertionを業務PASSに換算しない。M06-Q03の復習先をCase→specの節へ修正した。
- **M07の意味的照合**：実失敗Aと合成B/Cを別扱いにし、Test/Product/Environment/Flakyの仮説、Traceの証明範囲、Retryの限界、業務Assertionを残すPOM/fixture、2件から3件への別Runを確認。参照実装のCart再訪と`reload()`の差は未解決のまま#217へ引継ぐ。

| 理解ノード | 教材と実技で確認する判断（`can_do`） | 対応する公開採点基準 | 知識グラフの教材参照先 |
| --- | --- | --- | --- |
| `K-M05-01` | テストの実行環境と対象アプリを区別する | `M05-CR-01, M05-CR-05` | `#1-プログラムと実行環境の基礎知識` |
| `K-M05-02` | 依存導入とコマンド実行の違いを説明する | `M05-CR-01` | `#実行の流れ` |
| `K-M05-03` | 短いコードの値と型を追う | `M05-CR-01` | `#2-変数と値データに名前を付ける` |
| `K-M05-04` | 短いテスト関連コードを修正する | `M05-CR-01` | `#4-関数と型繰り返す処理に名前を付ける` |
| `K-M05-05` | 別ファイルの関数やライブラリを参照する | `M05-CR-01` | `#5-ファイルをまたいだ機能の共有import-と-export` |
| `K-M05-06` | 待つ必要のある処理と結果の順序を説明する | `M05-CR-01, M05-CR-04` | `#コードを読む` |
| `K-M05-07` | 画面操作対象を識別し、動作を構成する | `M05-CR-01, M05-CR-02` | `#コードを読む` |
| `K-M05-08` | 可視性と業務結果が同じではないことを判断する | `M05-CR-03` | `#コードを読む` |
| `K-M05-09` | 構文・型・実行時・Assertionエラーを区別する | `M05-CR-04` | `#待機と失敗の読み分け` |
| `K-M05-10` | 実際に動いたspecと結果の保存先を照合する | `M05-CR-05` | `#実技と確認` |
| `K-M05-11` | 配列の添字と要素を追い、添字を変えた結果を説明できる | `M05-CR-01` | `#k-m05-11` |
| `K-M05-12` | プロパティ参照・変更の結果を説明し、配列の添字と混同しない | `M05-CR-01` | `#k-m05-12` |
| `K-M05-13` | 条件式の真偽から実行経路と結果を説明できる | `M05-CR-01` | `#k-m05-13` |
| `K-M05-14` | 引数・戻り値・関数の関係を説明し、短い関数を変更して結果を確認できる | `M05-CR-01` | `#k-m05-14` |
| `K-M05-15` | Role・アクセシブル名から一意のLocatorを選び、実行して確認できる | `M05-CR-02` | `#k-m05-15` |
| `K-M05-16` | 型検査の成功と業務正しさを区別し、構文・型・実行・Assertionの失敗を分類できる | `M05-CR-04` | `#k-m05-16` |
| `K-M06-01` | 前提・操作・期待結果をコードと結び付ける | `M06-CR-01, M06-CR-03` | `#6-実行証拠evidenceを読む` |
| `K-M06-02` | 実行順に依存しない前提を準備する | `M06-CR-02` | `#2-毎回同じ状態から始めるテストの独立性` |
| `K-M06-03` | 仕様と観測点が一致するか見直す | `M06-CR-03` | `#3-仕様どおりのassertionを選ぶ` |
| `K-M06-04` | テスト実行と結果証拠を結び付ける | `M06-CR-04` | `#6-実行証拠evidenceを読む` |
| `K-M06-05` | 実行した事実と障害の区別を行う | `M06-CR-05` | `#5-テスト結果の4つの状態を正しく区別する` |
| `K-M06-06` | 別CaseのReset・Action・Locator・業務Assertionを選んで新規specを作成し、単独実行できる | `M06-CR-01` | `#k-m06-06` |
| `K-M06-07` | 一意の要素選択・Action成立・仕様上の業務結果を別々に検証できる | `M06-CR-03` | `#k-m06-07` |
| `K-M07-01` | Test/Product/Environment/Flakyを混同しない | `M07-CR-01` | `#失敗を追う手順` |
| `K-M07-02` | 失敗箇所と原因候補の証拠を探す | `M07-CR-02` | `#4種類の実行証拠` |
| `K-M07-03` | 固定待機を根拠なく増やさない | `M07-CR-03` | `#33-なぜ待機時間の延長やリトライで解決してはいけないのか` |
| `K-M07-04` | 最小修正と新しい実行証拠を確認する | `M07-CR-04` | `#42-before-runとafter-runを比較する` |
| `K-M07-05` | 重複・保守費用に応じて抽象化を選ぶ | `M07-CR-05` | `#保守性の判断` |
| `K-M07-06` | 画面操作をPage Objectへまとめ、仕様Assertionの責務を保持して別Runで検証できる | `M07-CR-05` | `#k-m07-06` |
| `K-M07-07` | fixtureのスコープを理解し、各テスト前Resetとテスト間独立性を確認できる | `M07-CR-05` | `#k-m07-07` |

### 共有知識グラフを変更せずに引き継ぐ事項

1. `K-M05-06` の`review_path`はPlaywright実例の「コードを読む」であり、async/await自体の説明節（M05 §6）を直接指していない。`K-M05-08`もAssertionの保証範囲ではなく§7.1の実例を指す。正しい説明へ誘導する参照先の精度を#199で検討する。
2. `K-M06-01`の`review_path`は「実行証拠を読む（§6）」を指すが、`can_do`は「Caseとspecの対応」。M06-Q03の復習先は担当範囲で§1に修正済み。Graphの参照先も#199で§1への更新を提案する。
3. `K-M05-09`の`can_do`はエラーの区別のみを表し、ノード名と目標`M05-04`にある自動待機・Web-first assertionを実行証拠と結び付ける表現がない。#199で`can_do`の明確化が必要か判断する。
4. `K-M05-11`〜`K-M05-16`には個別の`requires`辺がない。各ノードは対応するM05目標・クイズ・採点基準につながるため参照切れではないが、詳細な前提順序・変更影響の表現として十分かを#199で確認する。
5. 上記の確認はAIによる教材・Graphの意味的レビューであり、**人間の承認は未実施**。`knowledge-graph.json`の`draft_requires_content_review`を`approved`へ変更しない。

### M05 P03の隔離された型検査（実受講者のRunではない）

- 実行環境：この作業用コンテナのNode.js 22 / TypeScript `tsc 5.8.3`。リポジトリを取得した環境やpnpm lockfileどおりの依存環境ではない。
- `workspace/M05/p03-type-error.ts`相当の**一時コード**を作成し、`tsc --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext`を直接実行。数値引数へ`"1"`を渡すと`TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.`、終了コード`2`。数値`1`へ修正後は終了コード`0`。
- 実際の配布`workspace/M05`ではなく、Chromiumも起動していないため、`M05-01`・横断P03/P05の完了とはしない。次は配布済みShop上の同じ手順で別Runとreceiptを取得する。

**この段階のProgress: 12% (3/25)**。知識グラフ30ノードの内容レビューと更新要否の引継ぎを1項目追加。実Runの必要な項目は未チェック。

## 再開後の確認：15学習目標の教材・演習・状態・公開評価基準

- 確認対象HEAD：`d260c1a29f98b4684780dbe9340e18f6ed058f7e`。M05〜M07各`README.md`、`exercise.md`、`submission-template.md`、`start.json`、`end.json`、`assessment/scoring-tests/Mxx.json`（読み取り専用）、`quizzes/Mxx.json`を照合した。
- 3モジュールともP01〜P06が演習/提出欄にあり、start/endの`revision`は`ai-assisted-qa-course-v3`で一致する。15目標すべてで教本記載、開始/終了の目標ID、単一の公開評価基準、少なくとも1つのクイズ復習先を確認した。
- 目標ごとの静的対応は以下の通り。**クイズでの正解は該当実技の達成ではない**。未実行の状態で`course:check`・`course:assess`・Playwright実RunをPASSとは判定しない。

| 学習目標 | 公開評価基準 | 復習先のクイズID | 演習・状態の確認 |
| --- | --- | --- | --- |
| M05-01 | M05-CR-01 | M05-Q01/Q02/Q07/Q08/Q09/Q10 | P01〜P04、M05 start/end |
| M05-02 | M05-CR-02 | M05-Q03/Q11 | P05、M05 start/end |
| M05-03 | M05-CR-03 | M05-Q04 | P05/P06、M05 start/end |
| M05-04 | M05-CR-04 | M05-Q02/Q05/Q12 | P03/P04/P06、M05 start/end |
| M05-05 | M05-CR-05 | M05-Q06 | P05/P06、M05 start/end |
| M06-01 | M06-CR-01 | M06-Q03/Q06/Q07 | P01/P05、M06 start/end |
| M06-02 | M06-CR-02 | M06-Q01 | P04/P06、M06 start/end |
| M06-03 | M06-CR-03 | M06-Q02/Q03/Q08 | P01〜P03、M06 start/end |
| M06-04 | M06-CR-04 | M06-Q04 | P04/P06、M06 start/end |
| M06-05 | M06-CR-05 | M06-Q05/Q06 | P05/P06、M06 start/end |
| M07-01 | M07-CR-01 | M07-Q01 | P01〜P03、M07 start/end |
| M07-02 | M07-CR-02 | M07-Q02 | P01〜P03/P06、M07 start/end |
| M07-03 | M07-CR-03 | M07-Q03 | P03、M07 start/end |
| M07-04 | M07-CR-04 | M07-Q04 | P04〜P06、M07 start/end |
| M07-05 | M07-CR-05 | M07-Q05/Q06/Q07 | P04〜P06、M07 start/end |

### 状態の引継ぎ確認

- M05 start：`M04-result-01/02`を参照。M05 end：`M05-result-01/02`を出力し、M06 startは`M05-result-01`を参照する。
- M06 end：`M06-result-01/02/03`を出力。M07 startは`M06-result-01/02`を参照する。
- M07 end：`M07-result-01/02/03/04`を出力。M08 startは`M07-result-01/02/03`のみを参照する。この非対称性が意図した引継ぎかは#216/#199へ報告済み。
- 完成見本から本人の修了証拠を作らず、本人固有の`source_sha`・spec・Run ID・初期Role/State/Dataについては実ファイル未入手のため**未確認**のままとする。M07正式AI評価の受入は#217の責務。本人Private 2コアCodespaces受入は決定済みの後続工程とする。

**この段階のProgress: 16% (4/25)**。上記の確認で完了とするのは教材/提出欄/状態/評価基準/復習先の**静的な個別照合**だけ。残り21件は必要な実Runなどを取得するまで未完了。

## 再開後の保全手順と検証の限界

- `training/ai-assisted-qa-course/exercises/M07/exercise.md`に、M05〜M07の本人spec/提出物、Runごとの`run-evidence.json`、`spec-snapshot.ts`、`playwright-result.json`、必要なTraceを**個別に確認・選択**し、Git/PRを使わず保全する手順を追加。教材`modules/M07/README.md`のhandoffから参照する。
- 保管先は`workspace/M07/exports/`。既存の配布用`workspace.gitignore`には`/M07/`があり、アーカイブを誤って公開Gitへ追加するリスクを下げる。**暗号化しないアーカイブ**なので、本人だけがアクセスできる場所へ保存し、Secret・認証情報・個人情報を含む場合は保全対象から除く。対象Runを選んでから追記し、全`workspace/`や全Traceを無検査でアーカイブしない。
- **隔離コンテナでの補助検証**：ダミーのM05提出物・M06 spec・M07 Run記録の3ファイルを用い、bashのallowlist、`tar -czf ... -T phase2-files.txt`、`sha256sum -c`、`tar -xzf --no-same-owner --no-same-permissions`による復元、各ファイルの`cmp`、`git check-ignore workspace/M07/exports/phase2.tgz`を実施。全件成功。ただし**固定配布Shop/実Codespacesでの保全・ダウンロード・復元結果ではない**。
- `scripts/training/ai-assisted-qa-run-evidence.mjs`の読み取りでは、Run単位で3種類の証拠ファイルと必要に応じたattachmentを記録する。外部AI正式評価へ全Traceを送信する契約はない。OpenCodeの段階ヒント・復習導線と本人判断の独立性、受講者Codespacesでのバックアップ実証は引き続き未確認とする。
- 本保全項目は演習記述と隔離環境のコマンド確認まで進めたが、タスクリストの「通常OpenCodeの確認・安全なエクスポートの実地検証」は未達なので**チェックを付けない**。

**Progress: 16% (4/25)**。残り21項目の未実行/BLOCKEDは保持する。

## 2026-11-04 継続作業：契約テスト失敗の修正、M05 P05実行入口、M07分類基準

### CI（この追記より前のHEAD）

- PR #215のHEAD `446959323fc2c377be74a6bc0d409dd058e3623f`に対する[Web CI Run 41824466912](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41824466912)は **failure**。失敗の起点は`Vitest (contracts)`の`tests/contracts/ai-assisted-qa-curriculum.test.ts:956`（M06-Q03の復習先）。`Style Quality`、`Training runtime contracts`、Webの各Chromium jobは成功したが、マージ可能とは判定しない。
- このブランチで変更したM06-Q03の参照先`#1-caseのどの部分をコードにするか`が、共有契約テストの固定期待値`#6-実行証拠evidenceを読む`と不一致だった。クイズの参照先を元の契約へ戻し、`modules/M06/README.md`の§6にCaseの前提・操作・期待/BR/AC→spec→Run証拠の表を追加。固定参照先が説明内容と一致するよう調整した。**同一内容の契約テスト再実行はこの環境では未実施**。次のHEADのCIで成否を確認する。
- 共有テストの復習先期待値が固定されており、改善したい参照先を変更するとCIが失敗する構造である。今後参照先を変更する場合は共有テストも#199で調停する。

### M05 P05の直接実行経路

- `scripts/training/ai-assisted-qa-run-evidence.mjs`のM05許可リストは`product-link.spec.ts`のみ。P05で新規作成する`p05-cart-locator.spec.ts`は`course:run`では実行できない。
- `playwright.ai-assisted-qa.config.ts`と`ai-assisted-qa-playwright-settings.ts`を確認し、`PLAYWRIGHT_TEST_ROOT=workspace/M05`、`AI_QA_OUTPUT_ROOT`に一意のディレクトリ、`--config=playwright.ai-assisted-qa.config.ts`、`--project=ai-assisted-qa-chromium`で直接実行するコマンドを`exercises/M05/exercise.md`に記載。`submission-template.md`に対象spec/出力/log/終了コード/JSON reportの提出欄を追加。
- 直接実行は新課程Configを使うが、`course:run`の`run-evidence.json`や`source_sha`付きreceiptを生成しない。正式な自動照合が必要なら#217のrunner/evaluation契約で変更の要否を判断する。**Chromiumの実Runは未実施**。よってM05-02・M05-05と横断P05のチェックは保持する。

### Git/PR不要の保全手順の安全性修正

- 前回の`tar -T`実行前検証には、ファイル名が`workspace/M05/`などで始まれば`../`を含むパスも通せる欠陥があった。今回は`realpath -e`の正規化、許可モジュール配下への限定、正規パスの同一性、最終要素のsymlink拒否、`exports/`の入力除外、`--verbatim-files-from --no-recursion`を加えた。
- 本作業用の隔離Linux環境で、一時的なダミー資料からアーカイブを作り、SHA-256照合と展開結果の同一性を確認。実在する外部ファイルへの`../`参照、外部を指すsymlink、生成アーカイブ自身の参照を拒否した。これは**学習者Codespacesでの実保全ではない**。
- `course:sync`や配布本体、既存Seed/Resetは変更していない。

### M07-01：診断基準の教材・提出欄への反映

- 固定HEAD `897e1c83186a22c082c6cad8ca5c8a245fc9ca40`、`training/ai-assisted-qa-course/exercises/M07/failure-cases.md` Blob `9f9bde60b1fbaa6b3590504cd4b70913bb62e7e1`、`submission-template.md` Blob `50f6dfae584f5c58eec35233866b8ac5a9e5607f`で判断基準を照合。正式仕様`docs/spec/features/cart.md`（Blob `6342cbc95f72947b988044c7e86a3d39bdeac2eb`）と既存`reset-scenario.ts`（Blob `d9bd8c183f4cfb89e0aaccad6c35eb617bca2749`）も読み取った。
- Test / Product / Environment / Flakyについて、最初に見るべき仕様・前提Role/State/Data・Reset metadata・Run/Traceと、原因を断定する前に必要な追加確認を4分類で整理。素材A（未実行なら未確認）と合成B/Cを区別し、提出テンプレートで観測事実・仮説・否定根拠・次の確認を別欄にした。手作業の静的照合で各分類・資料参照・実Runの未実施表示を確認した。
- `M07-01`の完了は**失敗分類と切分け手順の整備**に限定する。`M07-02`の実失敗Trace・Screenshot・別Run、`M07-04/05`の修正前後実Run、受講者自身の診断達成を意味しない。

**Progress: 20% (5/25)**。`M07-01`の分類手順整備を追加で1件チェックし、実Chromium、固定配布Shop、受講者本人の成果物が必要な20項目は未完了。

### 製品Web実装との照合と今回の教材修正

- 確認対象HEAD：`eabe951e7d8ee59ba9df389e8a5f8403089b5cda`。製品SUTは読み取り専用で、`src/presentation/pages/cart-page.tsx` Blob `2718f5e23af7bc6362652969771ce15b9931d1f5`を確認。Web数量UIは`<select>`であり、変更は`cartUseCases.updateQuantity`を呼ぶ。M06教材に、Web版のデータはブラウザ内のIndexedDBを使うと明記されている。
- M07教材の「数量+ボタン」例、存在を確認していない「カート更新APIの200/500」を前提にした根拠、Run metadataの「対象コミットSHA」を、実際のWeb実装と`course:run` receipt（配布元`source_sha`、`spec_sha256`）に整合する表現へ修正。一般的なサーバー型システムのAPI 500例は、演習対象Scenario Shop Web版の診断と区別した。
- `modules/M06/README.md`の`run_id`例「run-2026...」は、実際の`ai-assisted-qa-run-evidence.mjs`の`randomUUID()`形式と一致しなかったため、UUIDである旨へ修正。実行していないRun IDの見本値は記載しない。
- 以上は教材の事実整合を改善する変更であり、本人によるPlaywright実RunやM05〜M07の学習目標達成を意味しない。共有runnerの調停：[PR #217への連絡](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/217#issuecomment-6630325393)、統合：[PR #199への連絡](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199#issuecomment-6630333042)。

**Progress: 20% (5/25)**。実Runが必要な20項目のチェックは維持せず、未完了のまま残す。
