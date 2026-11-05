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

## 2026-11-04 継続作業：M05-04 Web-first・失敗種類の負例

- **確認対象HEAD**：`17145e12fea7098cfe4ba327882d446f8c8ac377`（本レポート追記前）。`docs/curriculum/ai-assisted-qa/modules/M05/README.md` Blob `ade6583523ea883e0a2190dd60d179cac6b4dbec`、`exercises/M05/exercise.md` Blob `6dc92d0d6f6d4cd921a04a1ce438d58f62d36634`、`exercises/M05/submission-template.md` Blob `484fb8ddc3b1faa2fe3b59fcb3a9425e2c64bb2a`。
- **今回反映**：M05教本の8.1へ、Actionabilityを待つ`click()`とWeb-firstの`await expect(...).toHaveText()/toHaveCount()`、一度だけ読む`count()`の差、Locatorの不存在・複数一致・操作不可と業務Assertion不一致、構文/型/Node実行時エラーを区別する表を追加。演習のP03/P04/P06へ実行コマンドと不採用の固定待機案、提出テンプレートへエラー種類別の記録欄を追加した。
- **隔離Linux実行で確認した事実**（リポジトリをcloneした実行・配布Shopや`course:run`ではない）：

| 対象 | 環境・操作 | 結果 |
| --- | --- | --- |
| 自動待機 | Python Playwright 1.57.0 / Debian Chromium 144.0.7559.96。ページ内の`disabled`ボタンを約180ms後に有効化し`get_by_role(...).click(timeout=3000)` | PASS、クリック完了まで実測255ms。固定sleep不要 |
| Locator不存在 | 同じ隔離HTMLで存在しないbuttonを`click(timeout=350)` | `TimeoutError`（期待どおりの失敗） |
| Locator重複 | `同じ名前`の2ボタンに単一`click(timeout=500)` | `strict mode violation`（期待どおりの失敗） |
| 操作不可 | 無効のままのボタンへ`click(timeout=350)` | `TimeoutError`、ログに`element is not enabled`（期待どおりの失敗） |
| 業務Assertion | `status`の実際の文言が`数量: 0`、期待が`数量: 1`。`expect(...).to_have_text(timeout=350)` | `AssertionError`（期待どおりの失敗） |
| 構文 | Node.js 22.16.0の`node --check`で閉じ括弧不足を入力 | 終了コード1、`SyntaxError: Unexpected end of input` |
| 型 | TypeScript 5.8.3の`tsc --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext`で`number`に`"1"`を渡す | 終了コード2、`TS2345` |
| Node実行時 | `node -e 'const absent=undefined; console.log(absent.value)'` | 終了コード1、`TypeError` |

- **区別と制限**：Python Playwrightの隔離HTMLはTypeScriptの`@playwright/test`およびScenario Shopの実行結果ではなく、Playwrightの待機・Locator・Assertion動作を小さく切り出した補助確認。Node/tscも本リポジトリの`pnpm-lock.yaml`で導入されたものではない。本人の`workspace/M05/`、8082専用Config、before/after Run ID・receiptの実証は引き続き未実施。
- **判定**：`M05-04`のチェックは「Web-first/自動待機・エラーの区別を演習と負例へ反映し、隔離実行で動作を検証した」範囲で完了。**受講者の習得・実ShopのPASSを意味しない**。`M05-01/02/03/05`と横断Chromium項目は未完了を維持。

**Progress: 24% (6/25)**。残り19項目は必要な専用Chromium実Run、固定配布Shop・受講者成果物/環境の証拠が不足。

## 2026-11-04 継続作業：M05-03の保証範囲

- **確認対象HEAD**：`94fda6d52c49cd8e4c1bf111b060be6d8a5f113f`。M05教本 Blob `00c9ae45b267884a49d73ea8ea944aa87ac5df7b`、M05演習 Blob `aff22b4943d323fdcff8fe8e7a9969edf7646685`、M05提出テンプレート Blob `353d38605497bc73a29f2728d980660920f62b8c`。
- 読み取り専用で照合した**製品実装**：`src/presentation/pages/cart-page.tsx` Blob `2718f5e23af7bc6362652969771ce15b9931d1f5`（`getCart`・`updateQuantity`とUI表示更新）、`src/application/use-cases/cart-use-cases.ts` Blob `222bdaa3568fc11bdbc3f0e8bab0e0bf13e02fa6`（Cart Use Case）、`src/infrastructure/database/dexie/database.ts` Blob `fb0e65aaaf16a4ce0c42f6c33be43d13b9f0eb54`（ブラウザ内Dexieの`carts`/`cart_items`テーブル）。実装を読んだだけで保存の実行成功を確認したとは言わない。
- M05教本§7.2・演習P05/P06・提出欄に、(1)ボタン可視/クリック、(2)追加通知、(3)Cartの対象行と数量、(4)同一Contextの再読み込み後の状態、(5)IndexedDB直接照合を分けた判断表を追加。UI表示・再読み込みと、DBへの直接保存・他Context/サーバー・注文作成の保証範囲を区別した。P05の削除ボタンは押さない。
- 前節の隔離Chromiumで「操作可能になったボタンのクリックは成功したが、`status`に数量0が残り、期待数量1のAssertionは失敗する」という現象を確認した。実際のScenario Shopの数量更新失敗を再現したわけではない。
- **判定**：`M05-03`は弱いAssertionと業務結果・保存を分ける**教材の判断基準**として完了。本人の8082 Run、Cartの業務テスト、IndexedDBへの書込み・再読み込み・別Contextの実証は未実施。`M05-01/02/05`、横断Playwright項目は未チェック。

**Progress: 28% (7/25)**。残り18件。

## 2026-11-04 M07の保全回帰テスト

- 固定HEAD `0da2101d602bb5e531336362bc77bc19f9b56eb0`、`tests/contracts/ai-assisted-qa-phase2-export-guard.test.mjs` Blob `55959b73ef97ea88ce84b5bd0d265c11a6c8a6a6`に**Phase 2固有のVitest 4件**を追加した。対象はM07演習Markdownに記載したGit/PRを使わない保全コマンド本体で、配布エンジンや製品コードではない。
- チェック対象：(1)3つの明示ファイルだけのtar作成・SHA-256照合・展開後内容一致、(2)`workspace/M05/../outside.txt`の拒否、(3)最終要素/親ディレクトリsymlink拒否、(4)アーカイブの自己入力拒否と既存ファイル不変。テストの検証環境はLinuxに限定し、一時ディレクトリ内のダミーデータで行う。
- GitHub上のソースでは、MarkdownからBashブロックを3件抽出し、ガードスクリプトを特定できること、テストファイルがJavaScriptとして構文解析できることを**静的に照合**した。**新規Vitest 4件そのもののCI実行結果は現段階で未確認**。前HEADのWeb CI successを新規HEADのPASSに流用しない。CI失敗ならログ・原因を確認する。
- これらは本人のCodespacesでの実保全・ダウンロード・復元、OpenCode学習支援の非介入を証明しないため、横断の`通常のOpenCode...安全にエクスポート`項目は**未チェック**にする。

**Progress: 28% (7/25)**。残り18件。

## 2026-11-04 継続確認：M05 P05の新規specとPhase 2保全

- **変更直前の確認HEAD**：`9d13270637a49005cd121230f5fc7f9da4d9ab04`。対応する[Web CI #41831786673](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41831786673)は`success`。確認した`Code Quality`、`Style Quality`、`Vitest (contracts)`、`Training runtime contracts`、`Chromium E2E (training-web-baseline)`もすべて成功。最後のChromium jobは`playwright.training.config.ts`と通常の基準specを使うものであり、M05〜M07の`course:run`実技受入ではない。
- **確認した不整合**：`exercises/M05/exercise.md`のP05では本人作成`workspace/M05/p05-cart-locator.spec.ts`と`workspace/M05/evidence/p05-direct-.../`の直接実行結果を要求するが、`exercises/M07/exercise.md`のGit/PR不要の保全例はM05の`product-link.spec.ts`のみを列挙し、P05本人spec・直接Runログ/JSON report・P03の型検査ファイルが保全例とPhase間の記録から漏れていた。バックアップをそのまま実施した場合、後からP05実技のコードと証拠を復元できない。
- **修正**：M07の保全対象リストへ`workspace/M05/p03-type-error.ts`と`workspace/M05/p05-cart-locator.spec.ts`を追加。直接Playwright実行の`console.log`・`playwright-result.json`・必要なattachmentを**実際のディレクトリ名・中身確認後に1ファイルずつ追記**するよう明記。`course:run`のUUID/receiptを直接実行に偽装しない。M07引継ぎテンプレートへP03/P05成果物と対応する実証拠欄を追加。M05の固定Skill変更許可は元のLocator修正とP05新規作成で別specに限定し、誤ったファイル編集を防ぐ。
- **M05 P05実装入口**：`workspace/M05/p05-cart-locator.spec.ts`を本人が作る際の、`../../training/playwright/support/reset-scenario`を参照する最小の未完成specを教材に追記。意図的な`throw new Error("TODO: ...")`を残し、未実装でもPASSする空testとしない。正解Locator/Assertionと本人の実行結果は配布しない。
- **回帰テスト**：`tests/contracts/ai-assisted-qa-phase2-export-guard.test.mjs`のLinux保全・復元fixtureにP03/P05の本人specと直接実行ログ/JSON reportを追加。教材の保全対象例と`course:run` receiptとの区別を確認するテスト1件を追加。GitHub HEAD `18ffc7261712b3fbdb80f1ade0f4bf30b50c8d6a`の静的照合で教材・引継ぎ・テストの参照が一致。**追加後のVitest/CI、本人Codespacesでの保全・再取得・復元は未実行**。ダミーfixtureの復元は学習者本人の実Run証拠ではない。

**受入境界**：Git/PRを使わない保全手順の教材・専用契約テストを改善したが、複合項目に必要な通常OpenCode支援の非介入、本人Codespacesの実保全・復元は未確認。M05-01/02/05の本人Chromium・P05の別Runも未確認。既存のチェックを流用・追加しない。

**Progress: 28% (7/25)**。未チェック18件は保持する。

### 今回追加の隔離Linux保全・復元確認

- 固定HEAD：`c030f1ffa7bbe5bba04c957df905aae360cf9bec`。リポジトリ全体や実受講者環境ではなく、この作業用Linuxの一時ディレクトリで、M07演習のアーカイブ検査と同じBash処理を7つのダミーファイルに対して実行した。
- 対象：M05`submission.md`、`p03-type-error.ts`、`p05-cart-locator.spec.ts`、`evidence/p05-direct-sample/console.log`、`playwright-result.json`、M06`new-case.spec.ts`、M07`diagnosis.md`。この`sample`はダミー出力で、実Runではない。
- `bash -e -c <演習の保全ガード>`：終了コード0。`tar --create --gzip --verbatim-files-from --no-recursion --files-from`が7ファイルを保管し、`sha256sum -c`が`workspace/M07/exports/phase2.tgz: OK`を返した。`tar -xzf`終了コード0。復元した7ファイルのバイト列が各元ファイルと一致（7/7）。
- この確認はファイルの選択・アーカイブの同一性だけ。P05を実Chromiumで動かしたこと、実際のTraceを取得したこと、GitHub Codespacesからダウンロードしたこと、個人の保管先へ保存したこと、OpenCodeの学習支援を検証したことを示さない。
- 新規契約テストを含む最新HEADの`pnpm test:contracts`とCIは本追記時点で未確認。前HEAD `9d13270637a49005cd121230f5fc7f9da4d9ab04`のCI successを今回の新規テストPASSとは扱わない。

**Progress: 28% (7/25)**。残り18件。実Run依存のチェックは付けない。

## 2026-11-04 継続：直近CIの失敗修正とM05 P05証拠保全

- **対象開始HEAD**：`bd9cb860793634c88e6eb4162932f109dafa0ea0`（PR #215）。[Web CI #41833867254](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41833867254)は`failure`。異常は`Style Quality`の`pnpm run lint:markdown`で、`docs/reports/2026-11-04_pr215-phase2-acceptance.md:239`と`training/ai-assisted-qa-course/exercises/M05/exercise.md:118`の`MD012/no-multiple-blanks`各1件。これが`verify`・`validate`の派生failureとなった。変更対象2ファイルの連続空行を除去し、ソース文字列で各ファイルの重複空行0件を照合。**修正後のCI successは未確認**。
- **M05 P05実行手順の欠落**：教材の直接実行コマンドは`sha256sum workspace/M05/p05-cart-locator.spec.ts`を終了後にのみ実行していた。実行中にspecが更新された場合、reportと実行したコードの同一性を検査できず、M05-05の証拠紐付けを誤る危険があった。
- **修正**：M05演習のP05直接実行コマンドに、通常ファイル・symlink拒否、実行前`spec-snapshot.ts`保存、snapshotと実行前spec SHA-256照合、終了後spec SHA-256再照合、`playwright-result.json`存在/通常ファイル確認、実行終了コードの呼出元への伝播を追加。結果ディレクトリは毎回`mktemp -d workspace/M05/evidence/p05-direct-XXXXXX`で独立。M05提出テンプレート・M07保全例・M07引継ぎテンプレートにsnapshotと両SHAの記録・保全を追加し、M07保全契約テストのfixtureもsnapshotを含むよう変更。`course:run`固有の`run-evidence.json`・`source_sha`や正式Run IDが**直接実行から自動作成されたとは扱わない**。
- **追加した専用契約テスト**：`tests/contracts/ai-assisted-qa-phase2-direct-run.test.mjs`を新規追加。教材からBashコマンドを抽出し、隔離された一時ディレクトリとPlaywrightを呼ばない`pnpm` stubで、(1)専用Config/対象spec/snapshot指定、(2)ログ・report・spec snapshotの同一出力先への保存、(3)実行中のspec変更拒否、(4)reportなし/非0終了の拒否、(5)symlink specの拒否を検証する。**この新規Vitestの実行結果は新CIで要確認**。
- **補助実行**：作業用Linuxで同じBashコマンドを手元の一時領域へコピーし、`pnpm`を実Playwrightではなく明示的stubへ差し替えて検査。正常時`exit 0`・snapshot同一、実行中spec変更`exit 1`、report不在`exit 1`、Playwright終了9を模擬すると`exit 1`、spec symlinkで`exit 1`。実Shop/8082の起動・Browser Context・`course:run` receiptと実受講者成果物は**検証していない**。

**判定**：M05-05、横断P03/P05実Chromium、M05-01/02、M06/M07本人実Runは実受入証拠が不足し、チェックを変更しない。次は最新HEADのStyle Quality・追加Vitestを確認し、本人Codespacesまたは同等の配布Shop環境でP05を実行する。

**Progress: 28% (7/25)**。未完了18件。

## 2026-11-04 継続：CI回帰修正と実Run受入の阻害条件

- **確認したHEAD**：`653a92deb041dfb5a9b71018ec92bb7aae77034d`で[Web CI #41839729762](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41839729762)が失敗。独立原因は2件。`Vitest (contracts)`では`tests/contracts/ai-assisted-qa-phase2-export-guard.test.mjs:97`の文字列Assertが、M07教材の直接Run証拠パス（先頭を`spec-snapshot.ts`に変更済み）に追従せず失敗。1,104件PASS、1件FAIL（期待失敗1件、skip15件）。`Style Quality`では本受入レポートの末尾空行が`MD012` 1件。下流`verify`・`validate`は派生失敗。
- **修正**：契約テストがM07教材に記載された`workspace/M05/evidence/p05-direct-<実際の識別子>/spec-snapshot.ts`およびJSON report名を照合するよう更新（Blob `74f1cea0dc73096284624d7b893191059c1abae5`）。本レポート末尾の余分な空行を除去（変更直後Blob `b76ad112d7a58ef6f72ebdec684422f6c320ad53`）。**修正後HEAD `622cb6b8655beda2b938d52a64129ce403dd4487` の[Web CI #41841463720](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41841463720)は最終確認時`in_progress`。成功とは判定していない。**
- **M05実行経路の実装照合**：`playwright.ai-assisted-qa.config.ts`（Blob `2f7b6ee0d09bee89a6e2ab9f57f9eca202add000`）は`PLAYWRIGHT_TEST_ROOT`を許可された`workspace/M05`内に限定し、`http://127.0.0.1:8082`と`AI_QA_OUTPUT_ROOT`を採用する。一方、通常のCI`training-web-baseline`は`playwright.training.config.ts`（Blob `198160ee1eb1d4f5dc784458ff7a25c091bb929a`）で`pnpm run training:web:baseline`を実行する。両者は**異なるConfig/対象spec**であるため、通常CIでChromiumが成功しても専用Config・本人specの実Runを示さない。
- **本人実技と参照specの区別**：`training/ai-assisted-qa-course/assessment/playwright/M05/cart-locator-inspection.spec.ts`（Blob `880e7dd60efe1d34ee1249e15a99df6bcbc6f6d5`）には参考用の2明細Cart Locator検証が存在する。正式採点`assessment/scoring-tests/M05.json`（Blob `be163deaa15f7fca8f2ae9edf6ab420aa91e44a0`）はM05-01/02/05について本人による予測・実装・別実行結果・根拠を要求する。参照specの存在や静的照合を学習者本人の達成とは扱わない。M05 P05の`workspace/M05/p05-cart-locator.spec.ts`は`course:run`の現行許可specに含まれず、専用Configによる直接実行と`run-evidence.json`のある実行を区別する必要がある。正式評価側への変更は#217、配布側は#218の責務。
- **Phase間契約の読取照合**：`M04/end.json`（Blob `bc54b5f494525f9654b9e0ab808653a324fa1597`）の2出力と`M05/start.json`（Blob `73c22e32a507a4e3fcf22cdf6e1c005c74c3ea2e`）の2入力はID/path/revision/contractが一致。M07の`end.json`（Blob `d01d6db74464923a43ea3d3fb383d027798c0087`）は4出力、M08の`start.json`（Blob `a47dc348ec80a9b904e4b92b4342fce3fe7d90b8`）はそのうち3入力を参照する。省かれた`M07-result-04`（`maintenance.spec.ts`）はM07の引継ぎテンプレートに記載あり。M08教材は`repaired-assertion.spec.ts`を限定的に利用するため、**4件全ての直接入力が必要とまでは判定しない**。本人の実ファイル・実Run証拠がないため横断受入は未完了。
- **実行環境の制約**：現在の作業環境から受講者のPrivate Codespaces、配布済み`course/shop`と`.course/distribution-manifest.json`、`workspace/M05`〜`M07`の本人作成ファイルは実行・取得できていない。GitHub Actions内で専用`course:run`が起動された証拠もない。従ってM05 P03/P05・M06 initial/repeat・M07 before/after・OpenCode協働・Git/PR不要の本人バックアップは`未実行`。これらをチェック済みにするには固定配布SHAの専用8082環境でRun ID、spec snapshot、report、Trace/終了コード等を採取して同じrevisionと照合する必要がある。Private 2コアCodespacesでの実受入は並行作業Plan上、PR #199のマージおよび公開配布後の工程に指定されており、本PR内での実施を偽らない。

**Progress: 28% (7/25)**。今回修正した2つのCI回帰は25受入項目外。学習者実Run・正式評価の達成チェックは追加しない。

## 2026-11-04 M06/M07点検と固定HEAD別のテスト・CI報告

- **今回の調査対象HEAD**：`37e8493524a20eb381757f215207542d3b3322d9`（PR #215の当該作業時点、baseはPR #199の`docs/plan-ai-agent-qa-curriculum-redesign`）。前HEAD `a538b5d75a756f7b2ae2c2d431facf3df63ae424` の[Web CI #41842768500](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41842768500)は`success`。**今回の追加変更後HEAD** `37e8493524a20eb381757f215207542d3b3322d9` の[Web CI #41845768521](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41845768521)は確認時`pending`であり、そのテスト結果をPASSとみなさない。
- **M05（技術的確認）**：`exercises/M05/exercise.md`（Blob `78c89553296a0a079e640493db294c2961b77fc5`）のP05直接実行は、既存のspec snapshot SHA前後照合・JSON report存在・非0終了拒否に加え、**report内に対象spec以外のtestが混入しないこと、対象testが1件以上あり、最後の結果と期待結果がともに`passed`であること**をNode.jsで確認するよう変更。空`suites`だけのJSONやskip、期待失敗、別specをPASSとしない。専用契約テスト`tests/contracts/ai-assisted-qa-phase2-direct-run.test.mjs`（Blob `190f470e72de2e350cc33a9aebc4fac4d3c33504`）に負例を追加した。ただし**追加後のVitest PASSは新CIで未確認**。実ShopのP05専用Chromium、本人作成spec、2明細の実行は未実施。
- **M06（技術的確認）**：`exercises/M06/exercise.md`（Blob `d38f1882030e4ab4fd2629a2925574e8e80e2e39`）に、`run-evidence.json`の`module_id/spec_path/label/run_id/exit_code/outcome/spec_unchanged_during_run/tests`を同一Runの`spec-snapshot.ts`とJSON reportに対応付ける指示を追加。**2件という数だけでなく**CASE-CART-004/005の各test名と業務Assertionを両Runで確認するよう提出テンプレートも修正。固定3 Caseの参考spec、削除004参考spec、数量更新005参考specの存在はGitHub上で確認済みだが、実Playwrightのinitial/repeatによる2件以上PASSや本人の独立Case構成は未確認。
- **M07（技術的確認）**：`exercises/M07/exercise.md`（Blob `a80b1459c5e58b06a97814a424ab5fa47cee3f47`）に、3番目のtestは**数量2への更新→Cart外へ移動→Cartへ再入場→数量2確認**が必要であり、`page.reload()`だけでは不足することを明記。Page Objectとfixtureを同じ`maintenance.spec.ts`へ置く指示を追加。`course:run`がsnapshot・SHAを取るのは対象spec単体であるため、外部helperファイルへ分割する場合はimport・別ファイルのSHAとbefore/after時点の保存が別途必要とした。提出・引継ぎテンプレートへ記録欄を追加。**M07本人の2件before／3件afterの別Runは未実施**。
- **担当境界の不整合**：`assessment/playwright/M07/maintenance-after/cart.spec.ts`（Blob `32ae928733c440daaf7a9cc294c68a03e6b9a604`）の3番目の参考testは`page.reload()`のみで、教材が要求する別ページ経由のCart再入場を検証していない。#217所有の`assessment/**`は本ブランチで変更せず、[PR #217への引継ぎ](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/217#issuecomment-6632850727)に正本の仕様差と修正・実Run検証条件を記載。
- **Playwright実Runの実施状況**：本人M05 `product-link` before/after＝未実行、M05 P05直接＝未実行、M06固定3 Case＝未実行、M06 004/005 initial/repeat＝未実行、M07失敗診断A＝未実行、M07 repaired before/after＝未実行、M07 maintenance 2件before/3件after＝未実行。専用8082配布Shop／学習者Private Codespaces／固定配布manifestの実環境を、この作業環境では操作できていない。前回の隔離Linux stubは**Playwrightや受講者の実Runではない**。
- **残リスクと再開条件**：教材・参考specの意味的整合だけでは目標達成とは判定できない。固定配布SHA・専用8082のChromiumで、実行された本人spec snapshot、`source_sha`、`spec_sha256`、対象test名・業務Assertion、別`run_id`、`exit_code/outcome`、JSON reportと必要なTraceを収集し、参照specや合成ログを本人の過去学習へ転用しないこと。正式AI評価は#217、配布機構は#218の範囲で調停する。

**報告項目の判定**：対象テスト、CIの確定結果と未確定結果、Playwright実Runの未実施範囲、必要な再開条件を固定HEADで報告した。**受入チェック25件のうち「対象テスト、Playwrightの実Run、CI、証拠/残リスクを固定HEADで報告。実行環境がない項目は未実行として残す」は報告業務として完了**。M05/M06/M07の実Run・本人技能達成を完了に変更しない。

**Progress: 32% (8/25)**。未完了17件。

## 2026-11-04 継続：Playwright JSON reporterの相対パス受入修正

- **開始HEAD**：`d4081e0d0ac4faf8d3e432c594b922358954ef08`。その[Web CI #41846124524](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41846124524)で`Vitest (contracts)`・`Training runtime contracts`・`Style Quality`・`Code Quality`・`Chromium E2E (training-web-baseline)`各jobの`success`を個別確認。確認時点でworkflow全体は`in_progress`。通常training baselineのChromium成功はM05〜M07本人実行とは異なる。
- **不整合**：Playwright v1.62.0のJSON reporter `packages/playwright/src/reporters/json.ts` は`spec.file`を`path.relative(this.config.rootDir, location.file)`で保存する（[v1.62.0原本](https://github.com/microsoft/playwright/blob/v1.62.0/packages/playwright/src/reporters/json.ts)）。新課程のConfigでは`rootDir`が選択された`PLAYWRIGHT_TEST_ROOT`（例：`workspace/M05`）なので、JSONの`spec.file`は`p05-cart-locator.spec.ts`等の相対パスになる。前バージョンのM05教材内検証は`path.resolve(spec.file)`でリポジトリルートから解決し、正常なレポートの対象specを誤って拒否する。
- **今回の修正**：`exercises/M05/exercise.md`（Blob `f4d4d198f73c36e20d73c5e0a4771d3e540f6f57`）はreportの`config.rootDir`が本人specの親ディレクトリと一致することを検証し、各`spec.file`をそのrootから解決するよう変更。前回の「対象test1件以上・全件passed・期待結果passed・別spec拒否」を維持。`tests/contracts/ai-assisted-qa-phase2-direct-run.test.mjs`（Blob `c59ba8d8b6cb78beaf9b7288a937b954338159aa`）の正常stubをPlaywrightの`rootDir`相対形式に修正。rootDir不一致、別spec、0件、skip、期待FAIL、実行中ソース変更、report欠落、非0終了、symlinkの負例は保持。
- **共有実行器の同種問題（未修正・担当外）**：`scripts/training/ai-assisted-qa-run-evidence.mjs`の`reportSpecs()`は`path.resolve(root, spec.file ?? "")`で`rootDir`相対ファイルをリポジトリルートから解決するため、`course:run`の実行が成功しても抽出テスト数が0となり`outcome=ungradable`へ誤判定する可能性がある。同じ抽出関数はRun再検証でも使う。[PR #217の引継ぎ](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/217#issuecomment-6633137546)へPlaywrightの根拠、コード経路、修正案、回帰条件を記載済み。共通scriptと正式評価を#215では変更しない。
- **追加変更HEAD**：`169e280c5501b17f65aa3aea0fc517ef6a16514a`。対応する[Web CI #41847121287](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41847121287)の`Style Quality`と`Code Quality`は確認時成功、`Vitest (contracts)`等は進行中。変更後のCI全体/本人Playwright実Runは未確認。本人Private Codespaces・配布manifest固定SHAによる本番受入は未実施。
- **チェック判定**：reporterのファイル照合修正と契約テスト更新は技術的前進だが、M05-05等の実Runを含む完了条件を満たしていない。**Progress: 32% (8/25)**を維持し、未完了17件をそのまま残す。

## 2026-11-04 M05 P03型検査・M07保全・Phase間契約の継続確認

- **開始HEADとCI**：`4f0da6d1b21ffb26da54e34bb5156ee16edc70dc`の[Web CI #41847988398](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41847988398)は`success`。本節の新規コード・テストをそのCI結果で検証済みとは扱わない。
- **M05 P03**：教材指定の型検査オプション（`--noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext`）を作業用Linuxの一時ディレクトリで実行。`number`引数に`string`を渡した例は`TS2345`/終了コード2、`number`へ修正した例は終了コード0。正式な本人`workspace/M05/p03-type-error.ts`ではなく隔離サンプルであり、本人のP03/P05受入証拠ではない。再発防止として`tests/contracts/ai-assisted-qa-phase2-typecheck.test.mjs`（Blob `a3c71a5f6f71f02ce2dea41c811848fa29248f64`）を追加。GitHub Actionsによる新テストの実行結果は未確認。
- **M07保全の不具合と修正**：`exercises/M07/exercise.md`（修正後Blob `6abf43727a6d218ff12ee6b7b057481cb9642441`）の手順3が`cat > phase2-files.txt`で既存一覧を上書きし、手順4で追記した実Run・Trace等の対象パスを消してしまう。手順5も`tar --file=phase2.tgz`で既存のアーカイブを上書きする。作成コマンドに`set -C`を適用し、既存の一覧/アーカイブ/チェックサムがある場合は失敗に変更。手順5のtarは標準出力を新規アーカイブへリダイレクトし、SHA-256照合を維持した。既存の保全物を削除・上書きする操作は行わない。
- **隔離Linuxでの保全コマンド確認**：`tar --create --gzip --file=- ... > phase2.tgz`で一時ファイルを保全し、`sha256sum -c`が`phase2.tgz: OK`、展開対象に想定ファイルが列挙された。同じ固定名への2回目の作成は非0終了で拒否され、既存アーカイブのSHA-256が一致した。この検査は隔離データを使ったコマンド確認であり、本人のCodespacesからのダウンロード・復元ではない。`tests/contracts/ai-assisted-qa-phase2-export-guard.test.mjs`（Blob `f5615d68be7f004b2b4a391e5f67a62a0031e0f0`）には一覧初期化/再実行、アーカイブ/チェックサム非上書きの負例を追加し、前回のパス逸脱・symlink・アーカイブ自己入力拒否テストも維持。新規Vitest結果はCIで確認が必要。
- **Phase間状態の固定参照**：公開の`states/M04/end.json`→`M05/start.json`（2入力）、`M05/end.json`→`M06/start.json`（1入力）、`M06/end.json`→`M07/start.json`（2入力）、`M07/end.json`→`M08/start.json`（3入力）は、参照される出力の`artifact_id/path/revision/contract_id`が入力と一致。`M05-result-02`、`M06-result-03`、`M07-result-04`等の**全出力が直接入力される契約ではない**ため、全件自動引継ぎ済みとは主張しない。`tests/contracts/ai-assisted-qa-phase2-handoff.test.mjs`（Blob `b5434abf3e4a03753a5db6491f654291fcb76664`）へ静的照合とrevision改変の負例を追加。本人のspec/Trace/Run・固定配布manifestの実ファイルは未確認。
- **変更後HEAD/CI**：本節の報告直前HEADは`e53b935d43e335d3e39c5cbfb1a5f8f9d8f8aaf6`で、[Web CI #41851507691](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41851507691)は確認時`pending`。後続commitに伴う別Runの成功は未確認。CI完了待ちは行わない。
- **受入判定**：上記3件は担当範囲内の技術的作業としてチェック済み。ただしM05 P03/P05本人実行、M07本人保全・OpenCode、M07→M08本人実成果物照合は必要な証拠がない。**Progress: 32% (8/25)**、未完了17件。受入親項目は据え置く。

## 2026-11-05 M05-01・M05-02の技術検証

- **検証対象**：教材`docs/curriculum/ai-assisted-qa/modules/M05/README.md`、演習`training/ai-assisted-qa-course/exercises/M05/exercise.md`、提出`training/ai-assisted-qa-course/exercises/M05/submission-template.md`、未完成`workspace/M05/product-link.spec.ts`、参考`assessment/playwright/M05/product-link.spec.ts`および`cart-locator-inspection.spec.ts`（参考実装は読み取りのみ）。
- **M05-01**：教本の`practice-function.mjs`、`practice-async.mjs`、`practice-await.mjs`をNode.js 22の隔離実行で確認し、関数の`false/true`、非同期の`1→2→3`、`await`漏れと正しい否定分岐の各期待出力に一致。演習のTypeScript短コードも隔離Node.js上のTypeScript transpileで`quantities[1]`の「上限を再確認」→`quantities[0]`の「範囲内」を確認。これは`pnpm exec tsx`の本人実行ではない。教材本文、未完成Mugリンク名`セラミックマク`、参考の正しい`セラミックマグ`、保つべき`href=/products/product-mug` Assertion、`course:run ... --label before/after`、提出の修正差分と証拠欄を照合。`tests/contracts/ai-assisted-qa-phase2-m05-foundations.test.mjs`を追加し、教材の実コードを抽出してNodeとCIの`pnpm exec tsx`で再検査する。本人のShop/Playwright before/after Runは#199最後の実受入へ残す。
- **M05-02**：製品SUT`src/presentation/pages/cart-page.tsx`（読み取りのみ）では商品ごとに`<article className="cart-item">`、商品リンク、`数量`ラベル付き`select`、`削除`button、SKU表示を持つことを確認。公開参考specは`product-mug`と`product-low-stock`を追加し、Cart全体の数量select/削除buttonを各2件、Mug明細へ`filter({has: link[name=セラミックマグ]})`で絞って各1件、数量`1`を確認し、削除をクリックしない。`tests/contracts/ai-assisted-qa-phase2-m05-locator.test.mjs`へ実装JSX・参考spec・教材の対応を検査する契約テストを追加。学習者の実画面操作、別SKUの一意性、受講者P05の独立実装は**未検証**。
- **変更範囲**：新規テスト2本のみ。教材は既存記述と対応しているため変更せず、参考`assessment/**`、製品`src/**`、共通実行器も変更しない。
- **CI**：契約テストを追加したHEAD`b9f937938782e199eea12ee4c5bfdd40a08ea87d`の[Web CI #41864156811](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41864156811)は確認時点で`queued`。CI完了待ちはしない。前回までの`training-web-baseline`成功は専用8082での実行証拠へ転用しない。
- **判定**：PR #215技術項目の`M05-01`と`M05-02`は教材・参考spec・コード対応と固有回帰テストを整備したため完了。実行環境・Runが必要な`M05-05`および公開参考specの専用Chromium実行、#199実受入は未完了。

## 2026-11-05 M05-05の専用Config・証拠経路の技術照合

- **確認した設定**：`playwright.ai-assisted-qa.config.ts`（Blob `2f7b6ee0d09bee89a6e2ab9f57f9eca202add000`）は`PLAYWRIGHT_TEST_ROOT`を設定解決器へ渡し、`testDir: settings.testDir`、`project=ai-assisted-qa-chromium`、`AI_QA_OUTPUT_ROOT`配下の`playwright-result.json`・HTML report・失敗時Trace/screenshotを定義。設定解決器`scripts/training/ai-assisted-qa-playwright-settings.ts`（Blob `4bc9b1ff7c901a287a60719796fb4f44e464089f`）はloopback HTTP 8082のみ許可し、認証情報・追加パスを拒否する。`.devcontainer/devcontainer.json`（Blob `5d7528b65e9d415593677bfee5d9960979db6657`）の転送対象は8081/6080であり、学習用8082を外部公開済みと誤解しない。同期された配布物がある場合は`verify-distribution`が先に実行される。
- **証拠の違い**：`scripts/training/ai-assisted-qa-run-evidence.mjs`（Blob `d7c88233102c9402db268b65a3ac37039856051e`）の`course:run M05`許可specは`product-link.spec.ts`のみ。`run-evidence.json`に`run_id`、`source_sha`、`spec_sha256`、snapshot、JSON report、開始/終了、実行結果が記録される。これに対し本人作成P05の`p05-cart-locator.spec.ts`は専用Configで直接実行する別経路であり、`course:run`のreceiptを自動生成しない。教材・提出欄に区別が記載済み。
- **回帰条件**：新規`tests/contracts/ai-assisted-qa-phase2-m05-config-evidence.test.mjs`にポート境界、testDir/Reporter/Trace、配布検証、P05直接実行と`course:run`の許可spec・証拠の相違を固定。ソースと設定文字列の対応は静的に確認した。新規契約テストのGitHub CI実行結果・専用Chromiumでの実Runは未確認。SUT/Config/共通実行器そのものは変更していない。
- **担当外の残件**：共有実行器`reportSpecs()`がPlaywright JSON reporterの`rootDir`相対パスをリポジトリルート基準で扱う問題は未修正。既存の[PR #217引継ぎ](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/217#issuecomment-6633137546)へ技術条件を記載済み。専用Shopの実Chromium・run receipt成功は#199最後の実受入で検証する。今回の技術タスクは静的な照合と専用契約テストの追加までとする。
- **変更後CI**：HEAD`8ed8c3c970df9d8e1408476d14357da06d92e50d`の[Web CI #41864643385](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41864643385)は確認時`queued`。完了待ちはしない。

## 2026-11-05 M05 P05公開参考specの専用Chromium実行条件

- **対象**：`training/ai-assisted-qa-course/assessment/playwright/M05/cart-locator-inspection.spec.ts`（Blob `880e7dd60efe1d34ee1249e15a99df6bcbc6f6d5`）。公開参考specのstaticな整合と2明細scopeはM05-02の契約テストに記録済み。これは本人`workspace/M05/p05-cart-locator.spec.ts`とは別ファイル。
- **未実行理由**：今回の作業環境はGitHub connector経由でコードを確認・commitしているが、実行可能なリポジトリcheckoutと`pnpm`/学習用サーバーが存在しない。接続済みGitHub Actionsの通常`Chromium E2E (training-web-baseline)`は`playwright.training.config.ts`/別testDirを使用するため、参考specの実行証拠にはできない。**公開参考specの専用Chromiumの実行とPASSは未確認**。
- **再開環境**：Node.js・corepack/pnpmと依存が導入され、Playwright Chromiumを利用できる学習用checkout。必要なポートは専用Configのloopback`127.0.0.1:8082`（通常Web 8081/Private noVNC 6080と異なる）。同期済みShopがある場合は配布manifestとsource SHAが一致して`verify-distribution`成功が必要。ない場合は専用Configの`build:web`/配布物Serve起動が成功すること。
- **再現コマンド**（リポジトリルートで実行。学習用環境の既存依存とブラウザ導入を確認する。生徒のspecではなく公開参考specを明示）：

  ```bash
  export PLAYWRIGHT_TEST_ROOT=training/ai-assisted-qa-course/assessment/playwright/M05
  export PLAYWRIGHT_BASE_URL=http://127.0.0.1:8082
  export AI_QA_OUTPUT_ROOT=output/training/ai-assisted-qa/m05-cart-reference
  pnpm exec playwright test cart-locator-inspection.spec.ts \
    --config=playwright.ai-assisted-qa.config.ts \
    --project=ai-assisted-qa-chromium --retries=0
  ```

- **取得・照合すべき証拠**：実行したGit HEAD、参考spec SHA-256、server/配布source SHAとConfig、実行時刻・終了コード・標準出力、`AI_QA_OUTPUT_ROOT/playwright-result.json`の`config.rootDir`と対象test名/実行数/最終結果、HTML report、失敗時のTrace/screenshot、指定商品のCart 2明細のscope・数量1・削除非実施。成功なら別のspecを混入させず対象1件以上全件PASSを確認する。Traceは`retain-on-failure`であり、成功時にTraceが常時生成されるとは限らない。
- **取り扱い**：この項目は「実行不可の場合は再開条件と未取得証拠を残す」というPR #215の技術対応として記録し、実Chromium検証済みとは扱わない。実受講者のP05実装・操作・正式受入は#199最後に行う。

## 2026-11-05 M06-01固定3 Caseの技術照合

- **仕様とコード**：正式`docs/spec/features/cart.md`（Blob `6342cbc95f72947b988044c7e86a3d39bdeac2eb`）は`BR-CART-001`で在庫/購入上限/99の最小値と、超過拒否・数量維持、`AC-CART-001`でその境界値を規定。公開未完成`workspace/M06/cart-cases.spec.ts`（Blob `c8342a9624de0f2fdca0e4c9f604a4ff8c78b851`）はCASE-CART-001/002/003の3testがそれぞれ`default/default/low-stock`をResetし、いずれもTODO例外で始まる。
- **参考実装の責務**：`assessment/playwright/M06/cart-cases.spec.ts`（Blob `a339551956f66144afa7f748e6129a55db6234b4`、読み取りのみ）では001はMugを追加してCart数量1、002はMug数量5の追加による上限超過拒否と元数量1の維持、003は`low-stock`のシャツM（在庫3）を選び3点追加した後の再追加拒否と数量3維持をそれぞれ業務Assertionで確認している。学習用`resetScenario`の適用と公開fallbackと本人のPhase 1成果物の区別はM06教材に記載済み。
- **修正**：`training/ai-assisted-qa-course/exercises/M06/exercise.md`（修正後Blob `47593c5cb1477cbd15dc2a13a493c566cdc36ea4`）の固定3 Case実行直後へ、TODO例外を削っただけでは業務Assertionがないこと、001/002/003に必要な結果とBR/AC、実行数やPASS表示だけで修了認定しない条件を追記した。受講者向けの未完成specを完成答案に置換していない。
- **回帰**：`tests/contracts/ai-assisted-qa-phase2-m06-fixed-cases.test.mjs`（Blob `b5ad1bb2f5b6ceedfc9d4f8a0bf5846a08ed13da`）を追加し、3testの分離・Reset・TODOの残存、参考specの各商品・操作・数量/拒否Assertion、TODOだけ取り除いた弱いspecが業務検証条件を満たさないことを静的に照合する。`course:run`単独の終了コード0はAssertion充足の保証にならない。正式評価の意味的採否・実Runは#217/#199の受入で別検証し、今回の静的契約テスト自体を評価器とは扱わない。
- **実行状態**：この作業では参考specの専用Chromium実行と本人実装は未実施。[Web CI #41865378412](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41865378412)はHEAD`700436c4a4ca7fb41e09e1593201ef791e2c8ddc`で確認時`queued`。CI完了を待たず、M06-01固定3 CaseのPR #215技術項目のみ完了と判定する。

## 2026-11-05 M06-01別Case（004/005）の技術照合

- **本人入力と参考を区別**：公開`training/ai-assisted-qa-course/inputs/M06/new-case.spec.ts`（Blob `8eaad67efa9b8f63db3f0187cf7de594fd3ff2a5`）には`CASE-CART-004`の未完成testが1件のみある。学習者は別の`CASE-CART-005`を新しいtestとして追加する。参考`assessment/playwright/M06/remove-item.spec.ts`（Blob `e9272e0a57545800b0c5dc1e428e7ee13b36412e`）と`quantity-update.spec.ts`（Blob `00eedfc14f9d2e5b8e74f0c0d8370ee1e9dd8789`）は別ファイル・別testであり、受講者用に完成状態をコピーしない。
- **業務Assertion**：削除004はdefault Reset、Mug追加、削除前数量1、削除後の商品明細0・Cart空を検証。数量更新005は別のdefault Reset、Mug数量1→selectで2へ変更、数量2を確認、同じCartを再読み込み後も数量2を検証する。製品Cart UI（`src/presentation/pages/cart-page.tsx`、読み取り）は数量selectの候補を`index + 1`として生成し、数量変更と削除buttonは`updateQuantity`/`removeItem`の別経路である。Web画面で数量0を選択する架空E2Eは要求しない。
- **契約テスト**：`tests/contracts/ai-assisted-qa-phase2-m06-separate-cases.test.mjs`（新規）に未完成入力、参考2本の独立Reset/業務Assertion、selectの数量保持、Web UIの数量0不可、教材のinitial/repeat・spec snapshot・提出欄の追跡条件を固定。公開参照specの有無と静的Assertionの存在は実Runや本人の独立実装を証明しない。
- **完了境界**：本PRの技術的な`M06-01`新規Caseの対応付けは完了。学習者の`new-case.spec.ts`へ正解を埋めず、#199最終実受入で両Case各Runの2件以上PASS・Run/配布SHA/receipt/Traceを照合する。共通実行器の誤判定は#217の担当。

## 2026-11-05 M06-02 Reset・Context分離の技術検証とCI回帰

- **前回CI失敗**：HEAD `e1a85c77b8f9b9d4ddce920920fe849721fdab0d`の[Web CI #41865858515](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41865858515)は`failure`。失敗ジョブは`Vitest (contracts)`と`Style Quality`、後続の`verify/validate`は派生失敗。契約テストは`ai-assisted-qa-phase2-export-guard.test.mjs`の`fixture.manifest`を一時ルートへ結合せず`ENOENT`、`ai-assisted-qa-phase2-typecheck.test.mjs`はTypeScript 6.0.3で`--ignoreConfig`なしの単一ファイル型検査が`TS5112`により失敗。Style Qualityは`phase2-export-guard`・`m05-config-evidence`・`m05-locator`の書式不一致を検出した。修正箇所は対応コミットを参照し、今回追加したテストの成功はまだ確認していない。
- **修正**：M05の教材`exercises/M05/exercise.md`にTypeScript 6.0.3の`--ignoreConfig`を追加し、P03型検査契約テストの実行オプションと一致させた。M07保全契約テストは`path.join(fixture.root, fixture.manifest)`でファイルを解決するよう修正した。前回指摘された書式にも調整を加えた。CI結果を確認するまで解消済みとは断定しない。
- **M06-02既存実装**：`training/playwright/support/reset-scenario.ts`（Blob `d9bd8c183f4cfb89e0aaccad6c35eb617bca2749`）は、現在の`page`から`__TEST_API__.reset({scenario})`、reload、metadataのscenario一致検証を実施する。新しいBrowser Contextを生成する処理はない。Playwrightのtest`page` fixtureと、同一Context内のIndexedDB/Seed初期化は別の責務。既存の`tests/contracts/ai-assisted-qa-test-control-reset.test.mjs`はTestControlServiceのSeed・時計・Session/Guest Identity復元と、Reset失敗時の非破壊を検証済みであり重複実装しない。
- **M06-02追加契約**：`tests/contracts/ai-assisted-qa-phase2-m06-reset-isolation.test.mjs`で`resetScenario`を隔離したモックPageで実行し、通常時の`goto→API reset→reload→metadata`順、default/low-stockの独立したcontext模擬状態、metadata不一致の例外、固定3+参考004/005の各test開始時Resetと`--retries=0`を検証する。fixtureは**実ChromiumやIndexedDB実接続の代替ではない**。教材`exercises/M06/exercise.md`のP04へContextとResetの境界、逆順実行の実Run証拠条件を追記した。
- **判定**：PR #215のM06-02技術作業（実装と教材照合、隔離契約テスト追加）は完了。実Shopで順序を入れ替えた本人の初回/再RunやChromium環境の検証は#199最終実受入へ引き継ぐ。最新HEADのCIは未確認、完了待ちしない。

## 2026-11-05 M06-03弱いAssertionの負例

- **根拠**：`docs/spec/features/cart.md`の`BR-CART-001`/`AC-CART-001`は上限超過時の操作拒否と変更前数量維持を要求する。M06教本§3.1・3.2も、追加ボタンの可視性や通知だけではCartの業務状態を保証できないことを説明している。固定参考specには001の数量1、002の拒否後数量1、003の拒否後数量3のAssertionがある。
- **今回の回帰条件**：`tests/contracts/ai-assisted-qa-phase2-m06-fixed-cases.test.mjs`に、固定3 Caseそれぞれの参考specから数量Assertionを意図的に削除した場合は、そのCaseの契約上の必須Assertionを満たさなくなる負例を追加。元の参考specは同条件を満たすことを同じテストで確認する。通知・クリックだけの偽PASSを形式的に受け入れない。公開参考specと製品SUTは変更しない。
- **限界**：この負例は**ソース契約の変異検証**であり、Chromium上で不具合を再現した証拠でも、実際の製品が誤数量を返したという発見でもない。学習者のbefore/afterと正式AI評価は#199最後の実受入に残す。CIの実行完了はまだ確認していない。

## 2026-11-05 M06-05の結果区分とM06参考spec実行の制約

- **実装との対応**：共有`scripts/training/ai-assisted-qa-run-evidence.mjs`では、環境障害を`blocked`、正常終了かつ対象test1件以上・全件passedを`passed`、対象test failedを`failed`、判定不能を`ungradable`とする。`exit_code`、`run_id`、`source_sha`、`spec_sha256`、reportと各test結果をreceiptに格納する。**未実行は`outcome`の値ではない**。receiptが生成されていない場合や対象Caseが含まれない場合に`passed`を作らない。
- **今回の教材修正**：`exercises/M06/exercise.md`と`submission-template.md`へ、Playwright結果のstatusと`course:run`のoutcome、環境BLOCKED、Test/AssertionのFAIL、未実行、判定不能を分ける条件を追加した。`tests/contracts/ai-assisted-qa-phase2-m06-separate-cases.test.mjs`にrunnerの4 outcome/receiptフィールドと教材記述の照合を追加した。
- **既存検証**：`tests/contracts/ai-assisted-qa-assessment.test.mjs`に、同一Runのreportとspec snapshot照合、initial/repeatの時間順序逆転拒否、配布source SHA不一致の拒否が実装されている。これらは共有評価器に属するテストの**コード確認**であり、この作業において新しい実Runを取得したものではない。対象Case IDとAssertionの意味まで妥当かは正式評価で別途検証し、#217へ引き継いだ。
- **共有実行器の未修正事項**：`reportSpecs()`がJSON reporterの`config.rootDir`相対パスをリポジトリルート基準で解決する問題は、[PR #217の指摘](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/217#issuecomment-6633137546)へ引継ぎ済み。正常な参考specでも`ungradable`へ誤判定されるおそれがある。#215で共有scriptを修正しない。
- **M06参考specの実行未確認**：M06固定3件と004・005の公開参考specを、`PLAYWRIGHT_TEST_ROOT=training/ai-assisted-qa-course/assessment/playwright/M06`・専用Config`playwright.ai-assisted-qa.config.ts`・8082で実Chromium実行したRunは未取得。現在のGitHub connector環境にはpnpm依存を導入した作業用checkoutと稼働Shopがなく、通常`training-web-baseline`は別Configである。参考specの個別実行は同Configで`cart-cases.spec.ts`、`remove-item.spec.ts`、`quantity-update.spec.ts`を指定する。固定3件と新規2件は現在**別ファイル**であり、参考ファイル2本の成功を学習者の`new-case.spec.ts`の同一Run 004/005成功と読み替えない。対象HEAD・SHA、JSON reportの対象test名/件数/結果、終了コードとRun時刻、失敗時Traceを後続で確認する。これは実受入完了ではない。
- **完了判定**：M06-05のPR #215担当である結果区分と技術的な証拠契約の照合は完了。ただしM06公開参考spec実Chromium項目は未チェックのまま維持し、実行可能な環境が必要な旨を残す。本人実受入は#199の最後。

## 2026-11-05 M07-02・M07-04の診断素材と修正前後の区別

- **診断AとB/C**：`training/ai-assisted-qa-course/exercises/M07/failure-cases.md`（Blob `9f9bde60b1fbaa6b3590504cd4b70913bb62e7e1`）はAを実行可能な誤Assertion、Bを合成Reset metadata不一致、Cを合成Retry変動と定義。`workspace/M07/failure-assertion.spec.ts`（Blob `82addbcc4e98ab9c98246c8287e8358f04c1caff`）と参考`assessment/playwright/M07/expected-failure/intentional-assertion.spec.ts`（Blob `38e72157755ed41cd75b018fceaf6d9bc41a36ec`）は、default Reset→Mug追加→Cartの後で存在しない商品見出しを`M07_INTENTIONAL_ASSERTION_FAILURE`として期待している。**Aの失敗原因は意図的なAssertion条件**であり、実Shopを壊すための変更や実環境での再現成功を報告するものではない。
- **before/afterの別責務**：`workspace/M07/repaired-assertion.spec.ts`（Blob `e4aade58ba8317c8a67740d54af66c7653944bdf`）はCartへ移動した後にTODO例外を投げる未完成入力で、Aの存在しない見出しAssertionは含まない。参考`assessment/playwright/M07/repaired/repaired-assertion.spec.ts`（Blob `175079db4b70e57edfde4c13554949bce77f065b`）はMugの見出しと数量1の業務Assertionを持つ。実教材はAの`main`、修正対象の`before`と`after`を別Runにするよう指定している。参考ファイルを本人答案へコピーしない。
- **Trace・ログの境界**：専用Configは`trace: retain-on-failure`と`screenshot: only-on-failure`。失敗時の添付が生成される条件を示すが、実際のTrace/Screenshot/JSON reportは**未取得**。B/CのログをAの実RunやTraceとして提出しない。`training/ai-assisted-qa-course/exercises/M07/submission-template.md`にはA/B/Cの素材区分、Run・失敗行・仕様/Reset・否定証拠とTrace/logの示す範囲を記録する欄がある。
- **契約テスト**：`tests/contracts/ai-assisted-qa-phase2-m07-diagnostics.test.mjs`（新規）へAの対象商品/Reset/誤Assertion識別子、B/Cの合成扱い、修正対象TODOの失敗と参考afterの業務Assertion、専用ConfigのTrace・Screenshot・reportと3つの別Runを照合する回帰条件を追加。実Chromiumによるbefore/after各Runは#199の最後に検証する。
- **判定**：M07-02とM07-04のPR #215で対応可能な技術的照合を完了。実Trace・失敗行・学習者によるAIパッチ採否・実Playwright比較までは確認していない。正式実受入と混同しない。

## 2026-11-05 M07 OpenCodeと保守参考specの境界

- **通常OpenCodeの学習用制約**：`exercises/M07/exercise.md`に、本人の最初の失敗診断→追加証拠を一つ示すヒント→本人がコード変更と別Runを取得→実結果に基づく復習、の手順を追記。AIが完成答案を実装したり、Assertion削除やRetry/Timeout延長を無検証で採用したりしないこと、M07の`course:tutor`と正式`course:assess`が異なること、入力するログ/TraceからSecret・認証状態・個人情報を除くことを明記。`tests/contracts/ai-assisted-qa-phase2-m07-diagnostics.test.mjs`へ、この教材上の境界の回帰条件を追加した。**実モデルで段階ヒントの応答を実測したわけではない**。共通Tutorは#217、最終受入は#199の担当。
- **M07-05参考specの未解決**：#217 branch`work/pr199-formal-assessment`（確認HEAD `5b8f37686a7b89c8541d7d2ceb836d0d90072f9d`）と#215 branchの`assessment/playwright/M07/maintenance-after/cart.spec.ts`は同じBlob`32ae928733c440daaf7a9cc294c68a03e6b9a604`。保守前2件・保守後3件、各testのfixture Reset・Page Objectは存在するが、3件目が`page.reload()`だけで**Cart以外のページへの移動と再入場を実施しない**。#215の演習・提出欄では実際の別ページ経由を必須としている。既存の[PR #217引継ぎ](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/217#issuecomment-6632850727)は未解決のため、M07-05の技術タスクは未チェック。所有外の参考specを#215で変更しない。

## 2026-11-05 #218の配布経路とM05〜M07の静的な整合

- **比較対象**：#218 Draft HEAD `b49c09b598dcd63b32517c20620fc6a7527b64e9` の `training/course-sync/manifest.json`（Blob `36483d0852190e170ab7e83d70a3624261faf5e4`）、共有 `scripts/training/ai-assisted-qa-course-core.mjs`（Blob `8fb42941a0400b83c6e02494c039d25cd7fb103e`）、専用 `ai-assisted-qa-playwright-settings.ts`（Blob `4bc9b1ff7c901a287a60719796fb4f44e464089f`）。本項目は#215から読み取りのみで確認した。
- **教材・入力・状態の配布**：manifestの`local_files`にはM05が8件、M06が9件、M07が12件含まれる。各モジュールの講義README、quiz、exercise、提出template、start/end状態JSON、必要な未完成specが対応する配布先へ割り当てられている。`load_files`はM05の`product-link.spec.ts`、M06の`cart-cases.spec.ts`・`new-case.spec.ts`、M07の`failure-assertion.spec.ts`・`repaired-assertion.spec.ts`・`maintenance.spec.ts`等を`workspace/Mxx/`へ配置する。学習者が自作するM05 P05 specやM06のCASE-CART-005は完成答案として同梱しない。
- **配布固定条件と保護**：manifestの`source_sha`は同期時に埋める`${SOURCE_SHA}`で、state契約revisionは`ai-assisted-qa-course-v3`。`generated.shop_build`は`pnpm run build:web`から`course/shop/**`を生成する。通常配布の`forbidden_paths`は`assessment/reference-solutions/**`・`scoring-tests/**`・`completed-states/**`、`.env*`、Secret、評価資料、GitHub workflow等を禁止する。正式採点用の`assessment_asset_allowlist`とは別経路である。
- **検証と非破壊性**：`verifySyncedCourseDistribution`は配布ファイルごとのSHA-256、source SHA/revision、状態遷移の入力/出力、Shop indexとmanifest照合を検証する。`loadModule`は事前に配布sourceを検証し、学習者ファイルに既存の異内容があればコピー前に拒否する。`checkState`は状態/参照を確認するが、環境の起動や本人実Runは`execution.status=unverified`と返す。専用Playwright設定はHTTP loopback `127.0.0.1:8082`等に限定され、8081/6080とは区別する。
- **判断と残件**：M05〜M07教材の配布先・固定Shop/Resetの前提・Run出力先・機密情報の境界について、現時点の静的なソース契約に矛盾は見つからない。#218の専用タスクリスト自体は確認時`0/21`であり、配布生成・外部Skill全件・シークレット検査の実実行を今回再確認したわけではない。#215でmanifestや共有スクリプトを変更せず、配布実受入は#218/#199に残す。

## 2026-11-05 #217の共有実行器・正式評価・M07参考specの未解決照合

- **確認元**：#217 Draft HEAD `5b8f37686a7b89c8541d7d2ceb836d0d90072f9d`、共有`scripts/training/ai-assisted-qa-run-evidence.mjs`（Blob `d7c88233102c9402db268b65a3ac37039856051e`）、`assessment/playwright/M07/maintenance-after/cart.spec.ts`（Blob `32ae928733c440daaf7a9cc294c68a03e6b9a604`）。どちらも#215の比較対象と同じBlob。#215では読み取りのみ。
- **未修正1：JSON reporterの相対パス**：`reportSpecs`は現在も`path.resolve(root, spec.file ?? "")`を使う。一方、Playwright JSON reporterの`spec.file`は`config.rootDir`相対であり、実specの集約・`readRunRecord`の照合で誤った`ungradable`を生むおそれがある。報告済み：[#217コメント](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/217#issuecomment-6633137546)。実Chromiumでの再現結果は未取得。
- **未修正2：M05 P05の証拠境界**：`MODULE_SPECS.M05`は現在も`product-link.spec.ts`のみ。P05の本人作成`p05-cart-locator.spec.ts`は教材側の直接Playwright実行に限定され、正式`course:run`のreceiptがない。正式評価で直接実行証拠を受け入れるか、独立receiptを要求するかは#217判断待ち。報告済み：[#217コメント](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/217#issuecomment-6630325393)。
- **未修正3：M07 P05の参照3件目**：参照`maintenance-after/cart.spec.ts`は2件→3件でtest/fixture/業務Assertionはあるが、3件目は`page.reload()`のみ。教材と提出欄が求める「Cart以外へ移動してCartへ戻る」に一致しない。報告済み：[#217コメント](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/217#issuecomment-6632850727)。#215のM07-05完了チェックは付けない。
- **追加の正式採点境界**：M06固定3件のTODO例外削除だけでPlaywright 0終了となり得ること、004/005の独立test・初回/repeatの両Run・業務Assertionを確認する必要性も[#217へ連絡済み](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/217#issuecomment-6635799444)。
- **今回の判定**：#217への引継ぎ内容・固定HEAD・未修正状態の照合という#215技術タスクは完了。#217の実装修正、正式評価、参考specのM07-05適合、実Playwrightの証拠は**未完了**。#215で共有scriptや採点資産を変更せず、後続#199最終受入で#217の採用HEADを再照合する。

## 2026-11-05 CI書式修復と担当範囲の最終差分レビュー

- **前HEADのCI**：`9d5c02f640961f97890c9d8a72829899e124bae4`の[Web CI #41932914294](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41932914294)は`failure`。すべての`Vitest (contracts)`・`Training runtime contracts`・`Code Quality`・既存`Chromium E2E (training-web-baseline)`等は成功し、`Style Quality`のみ失敗。これは新課程の8082専用Chromium実証ではない。
- **フォーマット修復**：`tests/contracts/ai-assisted-qa-phase2-export-guard.test.mjs`、`...-m05-locator.test.mjs`、`...-m06-reset-isolation.test.mjs`、`...-m06-separate-cases.test.mjs`の4件を、リポジトリが使用するPrettier 3.8.1の実際の`format`出力に揃えた。診断用の一時テストは削除済み。前回のM05型検査とM07保全fixtureの修正は`Vitest (contracts)`の成功で裏付けられるが、この新しい整形HEADでの`Style Quality`は確認時点で未完了。
- **差分レビュー**：#215 PRの変更パス25件を列挙して、M05〜M07の教材・演習・提出/クイズ・担当固有`tests/contracts/ai-assisted-qa-phase2-*`・受入報告・タスクリスト内に収まることを確認した。製品`src/**`、`app/**`、正式`docs/spec/**`、共通Reset/Run/CI、`assessment/**`、配布manifestに変更はない。本人用未完成specを参考答案で置換していない。
- **残る仕様差**：#217の`run-evidence.mjs`のPlaywright reporter相対パスとM05 P05直接実行receiptの扱い、M07保守後3件目が`page.reload()`のみで別ページ再入場を満たさない点は未解決。#218は教材の配布対応のみ静的照合済み。#215では担当外実装を修正しない。
- **未実行**：M06参考固定3件と004/005の8082専用Chromium実Run、M07保守前2件/保守後3件の実Run、本人Private Codespaces/OpenCodeの修了実受入、独立した正式AI評価は未取得。再開コマンド・ポート・必要なreport/Trace/SHAは先行節と#199受入表に記録し、未実行をPASSへ変更しない。
- **新HEAD/CI**：整形修復と一時テスト削除時のHEAD `b6e72bb18fea269204257d463fec6876e261af5b`に対する[Web CI #41936747958](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41936747958)は確認時点`pending`。CIが成功するまで「最新HEADのCI確認」のチェックを付けない。後続の報告・Plan更新commitはさらに新しいHEADとなるため、最新CIの判定は引き続き未確認。
- **判定**：PR #215の担当範囲・教材/参考/Config/Resetの最終差分**レビュー作業**は完了。M07-05の参考実装整合、専用実Chromium、最新CIの品質ゲート、および#199実受入は完了と判断しない。

## 2026-11-05 M06公開参考specの実行手順と追加のCase ID不整合

- **専用Chromiumの実行可否**：現在のGitHub接続環境では`pnpm install`済みのローカルcheckout、実行用`course/shop`または`dist`、8082上のShopが得られないため、M06参考specのChromium Runを取得できない。`.github/workflows/ci.yml`の`training-web-baseline`は`PLAYWRIGHT_BASE_URL=127.0.0.1:8082`で起動するが、コマンドは`pnpm run training:web:baseline`（`playwright.training.config.ts`配下）であり、M06公開参考specを`playwright.ai-assisted-qa.config.ts`で実行していない。このCI成功をM06実Runと代用しない。
- **参照spec固定Blob**：`assessment/playwright/M06/cart-cases.spec.ts`は`a339551956f66144afa7f748e6129a55db6234b4`（CASE-CART-001/002/003、3test）、`remove-item.spec.ts`は`e9272e0a57545800b0c5dc1e428e7ee13b36412e`（削除004相当、1test）、`quantity-update.spec.ts`は`00eedfc14f9d2e5b8e74f0c0d8370ee1e9dd8789`（005、1test）。いずれも読み取りのみ、本人の`workspace/M06/`とは別。
- **実行再開手順**：Node.js/pnpmと依存、Playwright Chromium、固定source SHAの配布Shopまたは非配布の`build:web`が使えるcheckoutを用意する。`PLAYWRIGHT_TEST_ROOT=training/ai-assisted-qa-course/assessment/playwright/M06`と`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8082`を指定し、専用ConfigのwebServer（配布済みなら`verify-distribution`、未配布ならbuildして8082でServe）を利用する。**学習者の`course:run`ではなく公開参考specの直接実行**として区別する。

  ```bash
  export PLAYWRIGHT_TEST_ROOT=training/ai-assisted-qa-course/assessment/playwright/M06
  export PLAYWRIGHT_BASE_URL=http://127.0.0.1:8082
  mkdir -p output/training/ai-assisted-qa
  reference_run_failed=0
  # mktemp -dで各回の出力先を新規作成し、同名reportの上書きを防ぐ
  AI_QA_OUTPUT_ROOT=$(mktemp -d output/training/ai-assisted-qa/m06-reference-fixed-XXXXXXXX) || exit 1
  export AI_QA_OUTPUT_ROOT
  run_status=0
  pnpm exec playwright test cart-cases.spec.ts --config=playwright.ai-assisted-qa.config.ts --project=ai-assisted-qa-chromium --retries=0 || run_status=$?
  printf '%s\n' "$run_status" > "$AI_QA_OUTPUT_ROOT/exit-code.txt"
  if [ "$run_status" -ne 0 ]; then reference_run_failed=1; fi
  git rev-parse HEAD > "$AI_QA_OUTPUT_ROOT/head-sha.txt"
  sha256sum training/ai-assisted-qa-course/assessment/playwright/M06/*.spec.ts > "$AI_QA_OUTPUT_ROOT/spec-sha256.txt"

  AI_QA_OUTPUT_ROOT=$(mktemp -d output/training/ai-assisted-qa/m06-reference-initial-XXXXXXXX) || exit 1

  export AI_QA_OUTPUT_ROOT
  run_status=0
  pnpm exec playwright test remove-item.spec.ts quantity-update.spec.ts --config=playwright.ai-assisted-qa.config.ts --project=ai-assisted-qa-chromium --retries=0 || run_status=$?
  printf '%s\n' "$run_status" > "$AI_QA_OUTPUT_ROOT/exit-code.txt"
  if [ "$run_status" -ne 0 ]; then reference_run_failed=1; fi
  git rev-parse HEAD > "$AI_QA_OUTPUT_ROOT/head-sha.txt"
  sha256sum training/ai-assisted-qa-course/assessment/playwright/M06/*.spec.ts > "$AI_QA_OUTPUT_ROOT/spec-sha256.txt"

  AI_QA_OUTPUT_ROOT=$(mktemp -d output/training/ai-assisted-qa/m06-reference-repeat-XXXXXXXX) || exit 1

  export AI_QA_OUTPUT_ROOT
  run_status=0
  pnpm exec playwright test remove-item.spec.ts quantity-update.spec.ts --config=playwright.ai-assisted-qa.config.ts --project=ai-assisted-qa-chromium --retries=0 || run_status=$?
  printf '%s\n' "$run_status" > "$AI_QA_OUTPUT_ROOT/exit-code.txt"
  if [ "$run_status" -ne 0 ]; then reference_run_failed=1; fi
  git rev-parse HEAD > "$AI_QA_OUTPUT_ROOT/head-sha.txt"
  sha256sum training/ai-assisted-qa-course/assessment/playwright/M06/*.spec.ts > "$AI_QA_OUTPUT_ROOT/spec-sha256.txt"
  test "$reference_run_failed" -eq 0
  ```

- **出力保全**：上記はLinux/Bashでの再開例。各Runの`AI_QA_OUTPUT_ROOT`は`mktemp -d`の成功を確認してから`export`し、一意に確保する。固定3件・004/005初回・004/005再実行のJSON/HTML/添付を別ディレクトリに保存する。終了コードはPlaywright直後に書き込み、失敗時も結果を残す（`|| run_status=$?`により`set -e`有効時も非0終了を捕捉して記録する）。全Runの終了コードを保存したあと、1回でも失敗していれば手順全体も非0終了にする。3回の対象test ID/件数と別ディレクトリであることを照合するまで成功とはしない。
- **取得すべき証拠**：実行環境・採用Git HEAD/参照spec SHA、Shop/配布source SHAとConfig、3 Runそれぞれの終了コード、`playwright-result.json`内の`config.rootDir`・対象testのspec.file・期待件数（固定3、initial2、repeat2）・個別状態、HTML report、失敗時Trace/Screenshot/Video、Reset Seedと実行順序。成功時は`retain-on-failure`のTraceを必須としない。参考specが成功しても本人の独立実装・初回/再実行成功ではない。
- **追加不整合（#217担当）**：`remove-item.spec.ts`のtest名は`M06 reference: remove the only item from the guest cart`で`CASE-CART-004`を含まない。一方005参考test名は`CASE-CART-005`を含み、教材/提出は両Case IDと別Runの照合を要求する。削除の業務内容は004に対応するが、reportのtest名からの機械的照合を困難にする。[#217へ追加引継ぎ済み](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/217#issuecomment-6645631921)。具体的な評価失敗は未再現なので断定しない。
- **判定**：本項目は**未完了**。再現可能な環境と3 Runの実証が必要であり、設定と実行方法の記録だけでチェックを付けない。本人実受入は#199の最後に実施する。

## 2026-11-05 最終コードHEADのCI成功

- **検証対象HEAD**：`9e5dc5ab7496720aee579660ab9f0a125001c562`。このHEADは本項追加前のPR #215最新コミットで、M05〜M07の教材と専用契約テスト、既存のPrettier修正、M06参考spec再開手順とタスクリストを含む。
- **GitHub Actionsの結果**：[Web CI #41938306165](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41938306165) は `completed/success`。29ジョブ中27件が`success`、2件が`skipped`（`Extended E2E (mobile-chromium)`と`deploy-production`）で、`failure`は0件。`Vitest (contracts)`、`Training runtime contracts`、`Style Quality`、`Code Quality`、`Vitest (unit/integration/component/repository)`、`build-production`、`Chromium E2E (training-web-baseline/required/accessibility/cross-role/mobile-boundary)`、`verify`、`validate`が成功した。
- **意味と限界**：`tests/contracts/ai-assisted-qa-phase2-*`と既存M05〜M07の共通契約テストが品質ゲートを通過したことを確認した。`training-web-baseline`は`pnpm run training:web:baseline`＋`playwright.training.config.ts`であり、`playwright.ai-assisted-qa.config.ts`を使ったM06参考spec、M07参考spec・本人specの専用Chromium成功ではない。CI上の`passed`を本人学習目標・正式採点PASSへ転用しない。
- **今回の判定**：「M05〜M07の契約テストと既存検証を、最終**実装コード**を含むHEADでCI確認する」技術項目を完了とする。本項とタスクリストの追記で新しい**文書のみのHEAD**が作成されるため、そのHEADのCI成功までは主張しない。更新によって実装・テストの変更があれば改めて同一HEADで検証する。
- **引き続き未完了**：M06公開参考5testの専用Chromiumを使う固定/initial/repeatの3 Runは未実施。#217のM07保守後参考specは3件目の別ページ遷移が未実装で、専用実Runもない。#199最終実受入へ引継ぎ済み。

## 2026-11-05 PR #215レビュー指摘の補修とM07保守Run再開条件

- **検証範囲**：PR #215（補修開始時のHEAD `657e600762f56e621cd91b25c107f1c0ad8075ee`）のCodeRabbitレビュー8件を調査。M05 `cart_items.variantId`から`product_variants.id/sku`への照合、M06の`spec-snapshot.ts`/`run-evidence.json`/JSON reportの責務、M06参考Runごとの一意な出力先を教材・レポートで補修した。
- **M07保全**：Codespacesの元アーカイブを展開して外部コピーの保存成功と誤判定する手順を廃止。WSL/Linuxのローカル非公開保管先にダウンロードした`phase2.tgz`のSHA-256を照合して復元する。Codespaces側で採取した原本SHAとの独立照合も必須。復元先の既存ディレクトリ・symlinkを拒否する。保全先は`umask 077`とディレクトリ権限700、作成ファイル権限600を用いる。アーカイブ生成**後**に保管先・復元結果を追記した`phase2-handoff.md`は、同じ非公開領域へ個別に再ダウンロードして両端のSHA-256一致を確認する。実受講者環境でのダウンロード・復元は未実施。
- **回帰契約**：`tests/contracts/ai-assisted-qa-phase2-export-guard.test.mjs`に権限制限、元ファイル削除後のダウンロードコピー復元、改変コピー・既存復元先・symlink拒否を追加。新規`tests/contracts/ai-assisted-qa-phase2-m07-maintenance.test.mjs`は保守前2testの個別Reset/数量Assertion、保守後3test/fixture/Page Object、教材の別ページ再入場要求、before/afterの別Runとspec SHA証拠を静的に検査する。**これは専用Chromium実行の代用ではない**。
- **PR #217との境界**：#215で参照する`assessment/playwright/M07/maintenance-after/cart.spec.ts`はBlob `32ae928733c440daaf7a9cc294c68a03e6b9a604`で、3件目が`page.reload()`のみ。#217 HEAD `44afe46fe2d53ec4f1f7d94f671a07d9e3621c3e`では同ファイルがBlob `7a488032ae98efcbcf63fd867234fd7b44ee2613`になり、`page.goto("/products/product-mug")`→`page.goto("/cart")`を実装済み。#215に変更を重複反映しない。#217修正の統合後に採用SHAを再確認し、実Chromiumのbefore/afterを取得するまでM07-05は未完了。
- **M06参考Chromium**：本レポートの固定3件・004/005初回・再実行コマンドは`mktemp -d`でそれぞれ新規出力先を作るよう修正。今回のGitHub接続作業環境では実行可能なcheckout/Shop/8082がないため、3 Run・実結果・Traceは**未取得**。前HEADのWeb CIが成功していても、`playwright.ai-assisted-qa.config.ts`の参照5test実行とは判定しない。

### M07公開参考specのbefore/after（統合後の専用Chromium実行例）

PR #217の保守後参考修正が採用されたGit HEADのcheckoutと、pnpm依存・Chromium・8082上のShopを準備する。配布済みShopを利用する場合は専用Configが要求する配布manifest/Shopの検証も先に通す。**次は本作業で実行したログではなく再開用コマンド**。出力ディレクトリは実行ごとに一意にし、実行終了コードを直後に採取する。Linux/Bashの例。

```bash
export PLAYWRIGHT_BASE_URL=http://127.0.0.1:8082
mkdir -p output/training/ai-assisted-qa
reference_run_failed=0
export PLAYWRIGHT_TEST_ROOT=training/ai-assisted-qa-course/assessment/playwright/M07/maintenance-before
AI_QA_OUTPUT_ROOT=$(mktemp -d output/training/ai-assisted-qa/m07-reference-before-XXXXXXXX) || exit 1
export AI_QA_OUTPUT_ROOT
  run_status=0
pnpm exec playwright test cart.spec.ts --config=playwright.ai-assisted-qa.config.ts --project=ai-assisted-qa-chromium --retries=0 || run_status=$?
  printf '%s\n' "$run_status" > "$AI_QA_OUTPUT_ROOT/exit-code.txt"
  if [ "$run_status" -ne 0 ]; then reference_run_failed=1; fi
git rev-parse HEAD > "$AI_QA_OUTPUT_ROOT/head-sha.txt"
sha256sum "$PLAYWRIGHT_TEST_ROOT/cart.spec.ts" > "$AI_QA_OUTPUT_ROOT/spec-sha256.txt"

export PLAYWRIGHT_TEST_ROOT=training/ai-assisted-qa-course/assessment/playwright/M07/maintenance-after
AI_QA_OUTPUT_ROOT=$(mktemp -d output/training/ai-assisted-qa/m07-reference-after-XXXXXXXX) || exit 1
export AI_QA_OUTPUT_ROOT
  run_status=0
pnpm exec playwright test cart.spec.ts --config=playwright.ai-assisted-qa.config.ts --project=ai-assisted-qa-chromium --retries=0 || run_status=$?
  printf '%s\n' "$run_status" > "$AI_QA_OUTPUT_ROOT/exit-code.txt"
  if [ "$run_status" -ne 0 ]; then reference_run_failed=1; fi
git rev-parse HEAD > "$AI_QA_OUTPUT_ROOT/head-sha.txt"
sha256sum "$PLAYWRIGHT_TEST_ROOT/cart.spec.ts" > "$AI_QA_OUTPUT_ROOT/spec-sha256.txt"
test "$reference_run_failed" -eq 0
```

参考コマンドは両Runの終了コード・証拠を保存したうえで、どちらかが失敗した場合は手順全体も非0終了にする。

受入時は、beforeで2件・afterで3件の**対象testがすべて実行**されたこと、testごとのReset/独立性、数量1・2の業務Assertion、3件目の別ページ経由のCart再入場、終了コード、JSON reportの`config.rootDir`と`spec.file`、spec SHA/HEAD、必要な失敗時Trace/Screenshotを照合する。共有実行器の正式採点/学習者`course:run`とは別の**公開参考spec直接実行**であり、これだけで本人修了とはしない。

**Progress: 94% (31/33)**。残件はM06参考5testの専用実Chromiumと、M07保守後参考の統合・専用実Runの2件。レビュー補修と静的契約を追加しても実Run未取得のチェックを完了へ変更しない。GitHub Actionsの新HEADでの結果は実際に確認できたRunだけを追記する。

## 2026-11-05 PR #215追加修正：CI lintと参考Run証拠の保全

- **発端のCI**：HEAD `0ddf5abd18a03e0a065c991ea180d9caab20c068` の[Web CI #42031867491](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42031867491)は`failure`。`Style Quality`ではPrettier自体は成功し、`docs/reports/2026-11-04_pr215-phase2-acceptance.md`のMD012（旧462行の連続空行）とMD018（旧473行の行頭`#217`）でMarkdown lintが失敗。後続の`verify`/`validate`失敗はこの品質ゲートに伴う。両箇所を補修した。
- **専用Runの成果物保全**：M06固定3件・004/005初回・再実行とM07 before/afterの計5 Runについて、Playwright終了コードを`run_status=0`と`|| run_status=$?`で捕捉し、`set -e`使用時でも`exit-code.txt`へ残す。各Runの`AI_QA_OUTPUT_ROOT`は`mktemp -d`を単独代入して成功確認後に`export`し、ディレクトリ作成失敗を見逃さない。固定HEAD・参照spec SHA・JSON/HTML report・失敗時添付は各Runの一意な出力先に保存する。孤立Bash確認で`export VAR=$(false) || exit 71`は71で終了しない一方、`VAR=$(false) || exit 71`は71で終了することを確認した。
- **実Chromiumの実行可否**：GitHub接続先のソースは参照・更新できるが、現在のコマンド実行コンテナに対象checkout、pnpm依存、Shopのビルドと8082サーバーがない。Gitの直接取得はDNS解決失敗。インストール済みChromiumバイナリ単体では専用Configの対象specを動かせない。既存Web CIの`training-web-baseline`は専用参考specを実行しない。既存workflowの編集・新workflow構造の追加は本ブランチの所有範囲とAGENTS.mdのL2承認境界に抵触し得るため、無断で行わない。**5 Runの実行結果は未取得**。
- **M07レビュー指摘**：#215側の`assessment/**`は読み取り専用で、3件目のCart外への再入場が欠ける。#217のHEAD `44afe46fe2d53ec4f1f7d94f671a07d9e3621c3e`、Blob `7a488032ae98efcbcf63fd867234fd7b44ee2613`では修正済み。ただし#215には未統合であり、後続で統合HEAD・2/3件の専用Chromium Runを確認するまでレビューthreadおよびM07-05を未完了とする。
- **進捗**：**Progress: 94% (31/33)**。CI結果は新HEADで判定し、M06/M07の専用実行項目は未完了のまま維持する。

## 2026-11-05 CI配布Shopを使った専用Chromium検証可否と手順回帰

- **実行用Shopの取得**：HEAD `88a367c3eac0645a2d6bd215b5dcd80a5980c88d` の[Web CI #42037759176](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42037759176)（27件success/2件skipped）からビルド成果物 `web-dist-automation`（artifact ID `13420295187`）を取得した。ZIPには`index.html`とWebの静的ファイル312エントリがあり、ローカルのloopback HTTP `127.0.0.1:8082`でGET/HEAD 200を確認した。Shopビルドは再生成せず、このartifactだけを使用した。
- **Chromiumブロック**：作業コンテナのChromium `144.0.7559.96`をPlaywright Pythonから起動できたが、`page.goto("http://127.0.0.1:8082/")`が`net::ERR_BLOCKED_BY_ADMINISTRATOR`で拒否された。管理済みChromium設定は`URLBlocklist: ["*"]`。`localhost`・`file:`・`data:`への遷移も同じ理由で拒否。ポリシー変更や回避策は実施していない。実Shop・8082の存在のみでは実Chromium検証可能な環境とは判定できない。
- **手順の隔離回帰**：`tests/contracts/ai-assisted-qa-phase2-reference-run-preservation.test.mjs`を追加。受入レポート内のM06固定/初回/repeat（計3 Run）とM07 before/after（計2 Run）のBashコードを取り出し、`pnpm`・`git`の隔離stubとfixture用specで`bash -e`実行する。出力先の独立性、実行コマンドのConfig・project・test root、保存したHEAD・SHA、JSON report、失敗終了コードを確認する。**stubにPASSを付けてもChromiumのspec成功とはみなさない**。
- **残る受入条件**：M06固定3件・CASE-CART-004/005初回/repeatの専用TS Playwright実行と、M07 before2/after3の専用TS Playwright実行は未取得。#217所有のM07 after参考specが統合されるまでは3件目の別ページ遷移も未充足。未完了の2チェックとレビューthreadは維持する。**Progress: 94% (31/33)**。

## 2026-11-05 PR #215専用Chromiumジョブの追加

- **作業承認と変更境界**：本会話で明示された承認に基づき、共通`.github/workflows/ci.yml`へ例外的にPR #215専用`pr215-m06-reference`ジョブを追加した。条件は`pull_request`・番号`215`・当該head branch・同一repositoryであり、他PR・push・scheduleでは起動しない。製品SUT、既存Seed/Reset、正式採点`assessment/**`は変更しない。
- **実行環境**：既存`build-automation`の`web-dist-automation`を同一workflow実行内で取得。PlaywrightとChromiumの依存を導入して、ビルド済みShopを`127.0.0.1:8082`のローカル静的サーバーで配信する。`PLAYWRIGHT_SKIP_WEB_SERVER=true`で二重ビルド/起動を防止する。新規配布manifestがないCI artifactに対し`PLAYWRIGHT_USE_PREBUILT_DIST=true`を指定しない（専用Configはmanifestがなければ例外とする）。
- **実行と保全**：`tests/contracts/ai-assisted-qa-phase2-m06-reference-ci.mjs`から、固定`cart-cases.spec.ts`3件、004/005`remove-item.spec.ts`・`quantity-update.spec.ts`2件の初回、同2件の再実行を`--retries=0 --workers=1`で実施する。各Runの別出力先に`exit-code.txt`、`head-sha.txt`、`spec-sha256.txt`、`console.log`、Playwright JSON/HTML report、失敗時のTrace/Screenshot/Videoを残す。`summary.json`にはShop`dist/index.html`のSHA、対象HEAD、各Runの結果と件数を記録。レポートの`config.rootDir`、`spec.file`、project、テスト件数、全testの期待/実際のPASS、retry/skip不在を検証する。1件でも不整合があればジョブを失敗させ、`if: always()`で証拠を14日間アップロードする。
- **受入境界**：これは**M06公開参考specのCI上での専用実Chromium検証**であり、学習者の独立実装・初回/repeat受入ではない。CIがPASSで対象test・HEAD・artifactの同一性を確認できた場合のみ、専用タスクリストのM06技術項目を完了へ変更する。作業時点では実CI結果未確認につき31/33を維持。M07は#217所有の保守後参考specが統合されていないため、参考before/after実Runとレビューthreadを未完了のまま維持する。

## 2026-11-05 M06実Chromium初回証拠とJSON照合修復

- **実Chromium実行**：PR #215 HEAD `aeb18179146d7b98bafba7f368544b83bf09e216` の[Web CI #42049665690](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42049665690)で`PR #215 M06 reference Chromium`が実際に起動。checkout merge HEAD `b55d3fdbc242531c520fb80198a7c7f628978454`、専用`playwright.ai-assisted-qa.config.ts`、loopback 8082、`--retries=0 --workers=1`で実行した。[Run artifact #13426925325](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42049665690/artifacts/13426925325)のJSON・console・終了コード・spec SHAを照合した。
- **3 Runの生結果**：固定`cart-cases.spec.ts`は3 testすべて`passed`、実行終了コード0、`stats.expected=3`、`skipped=unexpected=flaky=0`。初回`remove-item.spec.ts`と`quantity-update.spec.ts`も2件`passed`、終了コード0、`stats.expected=2`。再実行も同じく2件`passed`、終了コード0。いずれも個別RunディレクトリのJSON reportを確認した。
- **ジョブ失敗の直接原因**：実際のテスト失敗ではない。Playwright JSONは同じ`cart-cases.spec.ts`内の3件を`specs[]`に3要素として記載するが、独自検証器が`spec.file`の重複を含む配列と`["cart-cases.spec.ts"]`を比較したため、固定Runだけ`observed_test_count=0`・`FAIL`と誤判定し、ジョブが非0終了した。初回/再実行は別ファイル各1件なので誤判定しなかった。
- **修復**：`tests/contracts/ai-assisted-qa-phase2-m06-reference-ci.mjs`で`spec.file`集合を重複除去して、参照すべきファイル集合との厳密比較を維持。テスト総数、各testのproject・期待PASS・実PASS、retry/skip拒否はそのまま残した。新規`tests/contracts/ai-assisted-qa-phase2-m06-reference-ci.test.mjs`に重複spec成功、異なる2spec成功、すり替え、rootDir・skip・retryなどの負例を追加。`checkout_head_sha`（CI merge SHA）と`pr_head_sha`（PR source SHA）を別々に記録する。
- **CIと担当境界**：`verify`の必須判定にM06ジョブをPR #215のときだけ追加。他PR・push・scheduleではskipが必要。M07の保守後参考修正は#217 HEADで確認されているが#215に未統合なので、M07-05と未解決レビューthreadを維持する。
- **判定**：初回証拠の3+2+2件はブラウザ実行PASSだが、CIジョブは検証器の誤判定により`failure`。修復後の最新HEADでのジョブ・成果物が成功するまで、M06タスクリストは未チェックのまま維持する。**Progress: 94% (31/33)**。

## 2026-11-05 M06公開参考Chromiumの技術受入完了

- **確定実行**：[Web CI #42051038880](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42051038880)の`PR #215 M06 reference Chromium`が`success`。PR source HEAD `803cf2cc62e3a9ce63cc554da1c66419cefba979`、CI merge checkout HEAD `072dc67392a25caf2fb9f0fe6d561dcaa7a9646e`。`playwright.ai-assisted-qa.config.ts`、`ai-assisted-qa-chromium`、`http://127.0.0.1:8082`、`--retries=0 --workers=1`で実際に実行した。
- **Run別の結果**：[Artifact #13426668109](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42051038880/artifacts/13426668109)をダウンロードして`summary.json`・各`playwright-result.json`・`exit-code.txt`・spec SHAを独立照合した。`fixed-1dts3y`は3/3 PASS、`initial-mRp0I8`は2/2 PASS、`repeat-tlgozu`は2/2 PASS。3 Runの終了コードはすべて0。Playwrightの`stats.skipped=0`、`unexpected=0`、`flaky=0`、個別testの`expectedStatus=passed`・実`results[0].status=passed`・project一致を確認。初回と再実行は異なる出力先である。
- **証拠の同一性**：CI配布Shopの`dist/index.html` SHA-256は`eb6083240069c456206ffbdf478739803d1679347f3caab02642837c73cc75d1`。参照spec SHA-256は`cart-cases.spec.ts=563fadd2327a2c8559a0a13502e7f60ad03c9a665d7a6112394bd9031197342f`、`remove-item.spec.ts=487f6bfde1592195b67a949da4ba9d1d28bd6b727bb017a9ccaf92b0bda490f6`、`quantity-update.spec.ts=72c19bf7629c0a15b8758623b050ccdff25b46ada027d73ebc4354f97e2afaa9`。`config.rootDir`はM06参考spec領域。検証器は同一ファイル内の複数testを正しく数え、独立した各testの数・状態まで照合した。
- **判定範囲**：PR #215の「公開参考specを専用Chromiumで技術検証する」項目を完了。学習者の`workspace/M06`独立実装・本人初回/repeat受入、独立した正式AI評価には流用しない。参考004のtest名に`CASE-CART-004`が含まれない点は#217側の未統合差異として維持。M07保守後3件目の別ページ経由のCart再入場も、#217の修正の統合と専用before2/after3実Runがないため未完了。
- **進捗**：**Progress: 97% (32/33)**。最新のタスクリスト・本レポート追記後のHEADに対するCI結果は別途確認し、未実行のM07をPASSとしない。

## 2026-11-06 M07保守前2件・保守後3件の分離検証

- **対象と変更境界**：PR #215の現HEADでは`maintenance-before/cart.spec.ts`の2testを実行可能。ただし`maintenance-after/cart.spec.ts`（Blob `32ae928733c440daaf7a9cc294c68a03e6b9a604`）は3件目が`page.reload()`のみで教材のCart外→Cart再入場条件を満たさない。#217の固定commit `44afe46fe2d53ec4f1f7d94f671a07d9e3621c3e`には修正版（Blob `7a488032ae98efcbcf63fd867234fd7b44ee2613`）が存在する。
- **今回の実装**：`.github/workflows/ci.yml`にPR #215のみで実行する`pr215-m07-reference`ジョブを追加。`actions/checkout`で#217の固定commitから対象の1ファイルをsparse checkoutし、commit/blobを検証したうえで、PR #215のCI作業ツリーに一時・未追跡のM07参考test rootを作成する。製品コード、正式`assessment/**`の追跡ファイル、PR #217本体は変更しない。
- **検証条件**：保守前の独立2testと保守後の独立3testを、同じCIの配布Shopを8082で配信して別Run・`--retries=0`で実行。`tests/contracts/ai-assisted-qa-phase2-m07-reference-ci.mjs`がPlaywright JSONの`config.rootDir`・test名・対象spec・project・各testの期待/実結果・retry/skip/flaky不在を検証する。実行終了コードとconsole、report、PR #215 source HEAD、CI merge SHA、#217の固定commit/blob SHA、ビルドとspecのSHAを`summary.json`と別々の成果物へ記録する。失敗時にも`if: always()`で成果物を14日間保存する。契約テストには受入2/3件および件数、別test、誤project、期待失敗、skip/retry、report欠落の負例を追加。
- **現時点の判定**：この手段で取得するafter3 Runは**#217固定ソースの分離検証**であり、#215の採用HEADで3件目の正しい実装が動いた証拠にはならない。#217を統合して再検証し、関連レビューthreadを確認するまで`M07-05`は未チェック。**Progress: 97% (32/33)**を維持。CI結果未取得時点でPASSを記載しない。

## 2026-11-06 M07の分離実Chromium検証結果

- **実行結果**：[Web CI #42130225394](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42130225394)の`PR #215 M07 before and PR #217 after Chromium`が`success`。M07保守前`maintenance-before/cart.spec.ts`は独立2testが2/2 PASS、終了コード0。PR #217の固定ソースを一時配置した保守後`cart.spec.ts`は独立3testが3/3 PASS、終了コード0。両Runで`stats.expected=2/3`、`skipped=0`、`unexpected=0`、`flaky=0`。各testの`expectedStatus=passed`、実`results[0].status=passed`、project・テスト名・rootDir一致を確認した。
- **実行証拠**：[Artifact #13462787992](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42130225394/artifacts/13462787992)の`summary.json`、保守前`before-UzAZna/playwright-result.json`と保守後`after-pr217-MKGFYW/playwright-result.json`を取得し、終了コード・spec SHA・HTML reportと突合。実行先は`http://127.0.0.1:8082`、`ai-assisted-qa-chromium`、retry 0、worker 1。
- **参照元の固定**：PR #215 source HEAD `2a00b56b98f2eda3ef373629039381f4b579d546`、CI checkout merge SHA `f725a2629fa290e2eeaec798323d2d852ba36352`、PR #217 source HEAD `44afe46fe2d53ec4f1f7d94f671a07d9e3621c3e`、PR #217 after spec Blob `7a488032ae98efcbcf63fd867234fd7b44ee2613`。保守前spec SHA-256 `66846a3ec5fc666221790631ffdfac48abdaf7fb31059ec05be3342be18079d8`、保守後spec SHA-256 `bd04d3007c486e1825f55c694c81099e38fd8b7f17bf897d8dc47cd2fcede372`、Shop `dist/index.html` SHA-256 `8ba722e733bb843db6170d1639d74571fac64044d350237f0209457974e34891`。
- **3件目の内容**：#217固定Blobは数量2のAssertion後に`page.goto("/products/product-mug")`でCart外へ移動し、`page.goto("/cart")`で戻り、数量2のAssertionを再実行する。単なる`page.reload()`ではない。fixtureで各test開始前に`resetScenario(page, "default")`を行い、`CartPage`を共有する実装を確認した。
- **判定と残作業**：両ソースを分離した実Chromium検証は完了。ただし、#215で追跡される現`assessment/playwright/M07/maintenance-after/cart.spec.ts`は旧Blob `32ae928733c440daaf7a9cc294c68a03e6b9a604`のまま。**#217修正が#215の採用HEADに統合されたことも、そのHEADでbefore2/after3を実行したことも確認できていない**。そのため`M07-05`は未完了、レビューthreadも未解決、**Progress: 97% (32/33)**。CIの書式ゲート・全体結論は最終HEADで別途確認する。
