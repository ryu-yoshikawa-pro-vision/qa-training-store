# PR #199 統合・横断受入の残タスク

対象：[PR #199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。子PR #213〜#219は統合済み。以降は**未達の受入条件だけ**対応する。既に完了した実装、208動作の基本分析、11教材・クイズ生成、全量同期をやり直さない。

**新規セッションの再開入口**：[PR #199 継続作業手順](./2026-11-08_101200_pr199-continuation.md)。実行順、既存証拠、BLOCKED時の進め方と引継ぎ先は同文書にまとめる。受入条件とチェック状態は本Planが正本。

## 2026-11-08 B案：マージ前受入と後続受入（承認済み）

ユーザーの指示に従い、PR #199の追加QA契約実装を原則停止し、マージ前の配布安全性・第三者権利・独立レビュー・最終CIに集中する。**検証条件の削除・無条件PASS化ではなく、受入期限の変更**とする。元44条件（既済10・元マージ前28・本人のマージ後6）および旧39個別検証（実証済み20／未完了19）の履歴は保持する。

### マージ前に完了させる7個別条件

| 旧個別条件 | マージ前の完了条件 | 現状 |
| --- | --- | --- |
| **1.2** | 最終Web／Template／ZIPの実配布ファイルとCI ArtifactにSecret・PII・模範解答・採点内部資料が混入していないことを実物検査 | 未受入 |
| **1.3** | 固定Skill全配布ファイルの権利者・一次許諾／ライセンス・必要なLICENSE/NOTICEを確認。許諾不能の素材を配布しない | BLOCKED（一次許諾未確認） |
| **1.4** | 公開JS・画像・フォント等の配布物と一次ライセンス・表示要件を全件突合 | 未受入 |
| **7.1** | #199統合差分のコード・セキュリティ・配布・教材の独立レビュー、指摘対応と再検証を保存 | 未実施 |
| **7.2のマージ前部分** | 正式Caseの未受入／FAIL／BLOCKED、後続移管の正当性、#210の製品不具合、公開・機能利用制限を実行者とは別の確認者がレビュー | 未実施 |
| **8.3** | 全変更確定後、**同一最終HEAD**の必須Web/Mobile CI、Build・検証Artifact、skipped・failureを確認 | 未受入（前HEADのMobile CIはFAIL） |
| **8.4** | 権利・安全性・独立レビュー・CI・残リスクの根拠を揃え、マージ可否を判定 | 未実施 |

**追加のマージ前安全条件（旧2.4・2.5・5.5・5.6に関する前提）**：本人の明示同意なしにOpenCode／Providerへ送信しないこと、認証・費用・権限・保持が未確認の操作は安全に停止すること、通常チューターが正式評価やLevel 2合格判定へ混入しないことを、実装経路と拒否テストで確認する。実証できない外部送信／正式評価は実行不能とし、その拒否を確認する。安全性が確認できない場合は該当項目をマージ前に戻す。認可・Secret・データ保護に関する重大FAILを後続扱いにしない。

### 後続へ移管する12個別条件と7.2の残範囲

| 旧個別条件 | 受入時点／未完了範囲 | 状態 |
| --- | --- | --- |
| **2.4・2.5** | 実OpenCode・Provider利用開始前。START/SEND拒否、実送信payload、権限、料金、保持／削除、Session復元 | 未受入 |
| **3.6** | 公開前。実スクリーンリーダー、実配布・復元の手動操作 | 未受入 |
| **4.3・4.4・4.5** | 教材内容完成承認前。82理解事項、51学習目標、5 Phase引継ぎ、M00／M05条件の意味レビュー | 未受入 |
| **5.5・5.6** | 本人Private CIと正式AI評価利用・合格認定前。実GitHub API・実モデル校正、重大誤PASS 0 | 未受入 |
| **6.3・6.4・6.5・6.7** | Scenario Shop正式製品受入前。959動作Case＋横断51 Case、Forbidden・Native、7画面幅・a11y、Web／Android競合・DB rollback | 未受入 |
| **7.2の残範囲** | 全正式Case実行受入時。実行者と別の確認者が全Caseの証拠と結果をレビュー | 未受入 |

**件数の扱い**：旧未完了19項目＝マージ前7＋後続12。7.2はマージ前の「未受入項目の独立レビュー」と、後続の「全正式Caseの独立結果レビュー」に分離する。両方が完了するまで旧7.2のチェックは付けない。従来の「20/39」と「上位8作業0/8」は当時の検証履歴として残し、B案の7件へ換算しない。従来の本人受入6条件は、今回の後続12件とは別に維持する。

**マージ・公開の意味**：#199のコード・教材・基本分析の統合であり、Public Template公開、第三者素材の再配布許諾、正式AI評価の合格確定、Scenario Shop全機能の製品適合PASSを意味しない。正式Case採否CSVの`execution_acceptance=未受入`と`independent_review=未実施`を維持する。マージ後にも未受入内容を完了・公開・正式運用可能と表示せず、後続受入が完了するまで対象機能を制限する。許諾未確認・重大セキュリティ問題・必要な独立レビュー／CI未完了ならマージ不可。merge、公開、課金、PR closeは別の明示指示があるまで実行しない。

## 現在の対象

| 区分 | 元の44受入条件 | 扱い |
| --- | ---: | --- |
| 完了済み | 10 | 追加作業なし。既存証拠を再利用 |
| 従来のマージ前未完了 | 28 | 下記8作業へ集約した履歴。B案では前掲7条件と後続未受入へ再配分 |
| マージ後の本人受入 | 6 | マージ判定には含めず後続工程で実施 |
| 合計 | 44 | 条件は削除・無条件で完了扱いにしない |

**次の8作業は元の受入責任を保存する実行単位であり、B案の7マージ条件とは異なる。** 28条件分の受入責任と各条件の必要証拠は維持する。作業8つのチェックをすべて付けるには、対応する元の条件がすべて成立している必要がある。

[整理前の44条件と詳細な実施履歴（固定commit）](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/c608e6c211b40ae7890b64d96d1ebd0755b78d6f/docs/plans/2026-11-04_143600_pr199-integration-acceptance-tasks.md)を過去記録として参照する。以下の「旧行」はこの固定commitの行番号であり、完了済み条件や古い作業ログを再登録しない。

## 従来の個別検証の進捗（20/39の履歴・未受入条件を保存）

**実証済み 20/39件、未完了 19件。** これは元のマージ前28条件を満たすための**個別検証・判断の内訳**であり、元条件の28件や上位8作業の完了数とは異なる。上位8作業は全条件成立まで未完了のまま。完了済み20件のうち18件は既存Runと**固定HEAD `fbb1bbfcbb638a53b682a5f2657adc9d9c6655e7`**の実証拠を再照合した結果である。今回追加の5.4は**固定HEAD `0fd2d8c8e16067d3fa9831feeedd89ed7ef22bff`**の実`course:run`と評価器による検証であり、受講者本人の実技ではない。

- `[x]`は**その行に記載した具体的検証だけ**が完了した意味。参考spec、モック、構造検査、旧HEAD成功を実モデル・本人実操作・最終内容受入へ流用しない。
- 同じCI/Artifactを複数の異なる観点へ使う場合、検証内容を行ごとに区別する。テスト件数やファイル数を作業件数へ換算しない。
- 最新HEADが変わった場合も固定SHAの実証済み履歴は残すが、新HEADへの適用を自動承認しない。「最終HEADのCI」は別の未完了行で判定する。
- 次回は**B案マージ前の未完了条件**を優先し、実証拠が揃った旧個別行だけ`[x]`に更新する。外部権利・本人認証・実機・独立確認がBLOCKEDなら必要な当事者と入力を明記し、別の実行可能行に移る。作業件数が変わる場合は既存28条件の対応を保ち、分母の変更理由を記す。

### 1. 公開・配布成果物と第三者権利（旧行137・178・226）：1/4

- [x] **1.1** 固定SHA配布manifestの567件を確認し、禁止パス登録0件・同期前後のSHA一覧一致を確認した。（旧行137・178） [Artifact #13600459011](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42438837128/artifacts/13600459011)
- [ ] **1.2** 最終Web/Template/ZIPの未知PII、バイナリ内情報、画面に映る個人情報、完成評価資料の全除外を実物で検証する。（旧行137・178）
- [ ] **1.3** 固定Skill 105ファイルの権利者・一次ライセンス・再配布許諾・NOTICEを確定する。権利根拠なしはBLOCKED。（旧行178・226）
- [ ] **1.4** 公開JS・画像・フォント等の第三者素材の許諾と必要表示を全件確認する。（旧行178・226）

### 2. 通常AI送信・権限・保存と正式評価の分離（旧行138・140・170・246・247）：3/5

- [x] **2.1** 通常チューターの入力選択、Secret/PII・サイズ上限・送信直前再検証の契約13件を実行した。（旧行138・246） [Vitest contracts job](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42438837128/job/128614576830)
- [x] **2.2** 公開教材・本人選択ファイルのno-followとsymlink差替え拒否の回帰テストを実行した。（旧行138・246） [commit fbb1bbfc](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/fbb1bbfcbb638a53b682a5f2657adc9d9c6655e7)
- [x] **2.3** 独立したHOME/XDG、`:memory:` DB、deny-all権限と正式評価への状態混入防止の契約テストを実行した。（旧行140・170・247） [チューター契約13件PASS](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42438837128/job/128614576830)
- [ ] **2.4** 実OpenCode CLIのSTART/SEND拒否・プロセス未起動、実送信payload、exitと最小権限を確認する。（旧行138・140・246）
- [ ] **2.5** 実Providerの料金・保持/削除、OpenCodeセッション復元と正式評価履歴の非混在を実証する。本人認証のない項目はBLOCKED。（旧行140・170・247）

### 3. 公開教材Web・配布と非破壊性（旧行139・157・176）：5/6

- [x] **3.1** 同一HEADの配布manifestの567件・revisionと同期前後のSHA一覧一致を検証した。（旧行139・176） [配布Artifact #13600459011](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42438837128/artifacts/13600459011)
- [x] **3.2** M00〜M10の教材/クイズ11組を実Chromium E2Eで表示・操作・採点・復習した。（旧行139・157） [教材E2E 69件PASS](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42438837128/job/128614609667)
- [x] **3.3** 各教材/クイズのdesktop・tablet（768px）・mobileの横幅とaxe自動検査を実行した。（旧行157） [同E2E job](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42438837128/job/128614609667)
- [x] **3.4** HTML/JSON異版、旧回答保全、クイズ中断再開、キーボード操作の負例E2Eを実行した。（旧行139・157） [同E2E job](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42438837128/job/128614609667)
- [x] **3.5** バックアップ/復元の正常・改ざん・symlink・版不一致等の契約15件を実行した。（旧行176） [Vitest contracts job](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42438837128/job/128614576830)
- [ ] **3.6** 実スクリーンリーダーでの読み上げ・フォーカス確認と、実配布/復元の残る手動受入を実施する。後続の本人6条件と混同しない。（旧行157・176）

### 4. 82理解事項・51目標と引継ぎ（旧行163・164・167・169・248）：2/5

- [x] **4.1** 同一HEADのknowledge-graph validateを実行し、339ノード・51目標・82理解事項・22状態の構造を検証した。（旧行164） [配布Artifact #13600459011](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42438837128/artifacts/13600459011)
- [x] **4.2** PR差分のimpactを取得し、残る手動確認候補152パスの分類と受入先を既存記録に対応付けた。（旧行164） [変更影響の記録](../reports/2026-11-08_pr199-knowledge-graph-impact-triage.md)
- [ ] **4.3** 82理解事項の意味・粒度・重複・前提順・実技/クイズ/採点の整合を1件ずつレビューする。（旧行163）
- [ ] **4.4** 51目標の説明・例・誘導・別条件・提出証拠・Level 2判定・復習先を1件ずつレビューする。（旧行167）
- [ ] **4.5** 5つのPhase引継ぎとM00 P04/M05 P05の意味・実Run・SHAを照合し、独立判断の未確認を区別する。（旧行169・248）

### 5. 正式評価・実Run・実モデル校正（旧行174・223）：4/6

- [x] **5.1** M06完成参照specの固定3件・追加初回2件・再実行2件を実ChromiumでPASSした。本人Runではない。（旧行174） [M06 reference job](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42438837128/job/128614609774)
- [x] **5.2** M07完成参照specのbefore2件・after3件を実ChromiumでPASSした。本人Runではない。（旧行174） [M07 reference job](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42438837128/job/128614577105)
- [x] **5.3** M10のPR head/Run/Check/Artifact/digestと拒否条件の固定応答契約9件をPASSした。実API照合ではない。（旧行174） [Vitest contracts job](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42438837128/job/128614576830)
- [x] **5.4** M06/M07の正式`course:run`のreceipt・spec snapshot・Playwright JSON report・業務Assertion・別Runを固定HEAD `0fd2d8c8`の実Chromiumで検証した。M06は3 Run／4チェック、M07は5 Run／7チェックが評価器でPASS（意図的失敗2 Runを含む）。完成参照specを用いた開発側検証であり、受講者本人の修了や実モデル校正は含まない。（旧行174） [実証拠Artifact #13604004761](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42447943699/artifacts/13604004761)
- [ ] **5.5** 専用M10 workflowの実PR head・attempt・Check・Artifactを本人のPrivate環境で確認する（認証・有効化までBLOCKED）。（旧行174）
- [ ] **5.6** M04/M07/M10の実モデルで正答・誤答・別解・不正証拠・Prompt Injectionを校正し重大誤PASS 0件を確認する。（旧行223）

### 6. Scenario Shop正式Case・Web/Android/DB（旧行205・206・207・208・209・211）：3/7

- [x] **6.1** Checkout拒否・suspended/withdrawnログイン拒否・Forbiddenの4件で各23テーブルの前後digest一致を確認した。（旧行205・209） [DB Artifact #13600374602](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42438837128/artifacts/13600374602)
- [x] **6.2** 同一HEADのcross-role Chromium E2Eを試行2で実行し、ジョブの成功を確認した。初回Locator失敗の未修正を保持する。（旧行205） [Web CI試行2](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42438837128)
- [ ] **6.3** 採用条件959件＋横断51件と正式Case/Assertion/Role/State/実Artifactを個別に照合し、PASS/FAIL/未実行を確定する。（旧行205・211）
- [ ] **6.4** 停止staffのForbidden循環とSession/DB・Androidの観測を最終SUTで判定し、製品FAILを解消または残リスクとして確定する。（旧行206）
- [ ] **6.5** 製品Webの指定7画面幅・全状態・画像差分・キーボード/axe・保存ArtifactをCase単位で確定する。教材Webのa11yと混同しない。（旧行207）
- [x] **6.6** HEAD `a367f5e7` の[Mobile CI #42456368784](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42456368784)でAndroid API 34／x86_64エミュレータのMaestro 17 Suiteが全件SUCCESS。実[Runtime Artifact #13608233136](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42456368784/artifacts/13608233136)の17 JUnitと端末情報、実APK SHA-256 `90c0af0252aea55bd6b157139094c495f02a62a0f19c7162afa436d71a10fd03`を[Build Artifact #13608097791](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42456368784/artifacts/13608097791)と照合した。商品→Cart→ログイン→Checkout→注文→注文一覧、Review、アプリ再起動後のCartとCheckout再開のNavigationを確認。専用SQLite DB上のNative Contract Harnessが購入・Cart・認証拒否・Review・外部キー制約を実検証した。（旧行208）**対象はNative Customer。停止staffのForbidden循環と業務DBの全Case rollbackは6.4／6.7で未受入。**
- [ ] **6.7** Web IndexedDB/DexieとAndroid SQLiteの競合/失敗/rollbackを採用Caseごとに照合する。4件のdigestだけで全数PASSとしない。（旧行209）

### 7. 独立レビュー（旧行184・210）：0/2

- [ ] **7.1** PR #199統合差分の独立コード/セキュリティ/配布/内容レビューを実施し、担当と指摘・再検証を保存する。（旧行184）
- [ ] **7.2** 正式採用Caseの証拠と結果を実行者とは別の確認者がレビューし、判定と差戻しを記録する。（旧行210）

### 8. 最終HEAD・マージ前判断（旧行183・185）：2/4

- [x] **8.1** SHA `fbb1bbfc`のWeb CI（試行2）成功を確認した。後続変更後の最終CIとは別。（旧行183） [Web CI #42438837128](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42438837128)
- [x] **8.2** 同SHAのMobile CI成功を確認した。後続変更後の最終CIとは別。（旧行183） [Mobile CI #42438837135](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42438837135)
- [ ] **8.3** 作業1〜7の全変更が確定した**最終HEAD**の必須Web/Mobile CI・Artifactを照合する。（旧行183）
- [ ] **8.4** 最終受入・公開権利・独立レビューとBLOCKED/FAILを整理し、マージ可否を根拠付きで判定する。（旧行185）

## 元のマージ前受入条件（旧詳細・後続移管の根拠）

以下は元の28条件の検証要件を保存した記録であり、B案で全項目をマージ前に完了するという意味ではない。マージ前の判断は冒頭の「B案：マージ前受入」に従う。

- [ ] **1. 公開・配布成果物の非公開情報除外と第三者権利を受け入れる**（旧行137、178、226）
  - 同じ最終HEADの実Web Build、Template、配布manifest、CI Artifactを照合し、`assessment/reference-solutions/**`、`scoring-tests/**`、`completed-states/**`、完成spec・正式workflow・旧教材・個人成績、`.env`・認証情報・個人データの混入を検査する。既存の禁止パス・負例テストを再利用する。ファイルの存在を確認できない場合は安全と判定しない。
  - 固定`qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324`と配布済みJS/フォント/画像等について、再配布できる権利者・出典・一次ライセンス・LICENSE/NOTICEの全件監査と配布先の表示を確認する。[固定Skill監査](../reports/2026-11-07_pr199-fixed-skill-license-audit.md)で許諾を確認できていないため、現在の公開判断は**BLOCKED**。不存在を権利侵害の証明とも許諾の証明とも扱わない。
  - **完了条件**：最終配布ファイルの一覧・除外/負例結果、第三者権利の一次根拠と必要通知、未許諾/BLOCKEDの解消。実際のPublic Template作成はマージ後の本人作業。

- [ ] **2. 通常AIの送信・権限・保存と独立正式評価の分離を受け入れる**（旧行138、140、170、246、247）
  - 通常チューターから外部OpenCodeへ送る最終payloadを検査し、本人の明示確認、必要教材/本人回答/Run要約だけの選択、ファイル別・総量の上限、Secret/PII/無関係ファイルの拒否、拒否時の外部プロセス未起動を**実ランタイム**で確認する。OpenCode V2のread/edit/command権限、外部通信・履歴の保存先、復元・保持・削除も実装/説明と突合する。
  - 段階ヒント、別条件、誤解別復習、再開と、M04/M07/M10の独立正式AI評価の送信内容・Phase state・非公開履歴・再評価が混ざらないことを確認する。通常会話やクイズ正答を正式合格へ流用しない。有料モデルへの自動切替や講師の個別承認は追加しない。
  - **完了条件**：送信実体、コマンド/exit、拒否負例、最小権限、通常/正式評価の状態・履歴の不変性。本人認証・料金やProviderの実保持条件を確認できなければBLOCKEDとし、本人環境での後続操作と区別する。

- [ ] **3. 公開教材Web・配布版・非破壊性の最終受入**（旧行139、157、176）
  - 11教材/クイズ・22開始/終了状態・固定Shop・Skill-local依存・`course:load/check`・正式採点用の固定SHA取得について、Web/TemplateのMarkdown/JSON/revisionと配布manifestを同一版で照合する。Git `source_sha`（40桁）と教材SHA-256（64桁）を区別し、版不一致を利用者へ説明、旧回答・提出物・個人評価履歴を無断で同期/上書きしない。
  - Desktop/Tablet/Mobile、直URL、キーボード/フォーカス/画面読み上げ・axe、XSS/HTML出力・Secret/完成資料の不混入、公開Build/Smokeと旧Webの非回帰を検証する。**Scenario Shop製品画面の受入とは別**に扱う。既存の成功済みWeb生成・クイズ・同期テストを追加実装しない。
  - Git/PR不要のPhase 1/2バックアップ・復元と、`.env*`・隠し認証情報・symlink・改ざん・版違い・既存ファイル衝突の拒否を既存契約/最終CIで確認する。本人による実ダウンロードと復元は後続で別判定する。
  - **完了条件**：対象SHA、manifest・revision、実ブラウザ操作/a11y、セキュリティ負例、非破壊契約・Artifactの結果。

- [ ] **4. 82理解事項・51目標とPhase引継ぎの意味的整合を受け入れる**（旧行163、164、167、169、248）
  - 82理解事項（現在`draft_requires_content_review`）と51目標を、粒度・重複・前提順序・説明節・例・誘導・別条件・実技・クイズ観測点・提出証拠・Level 2判定・復習先まで対象ごとにレビューする。ID一致やクイズ正答だけで内容・本人の実技をPASSにしない。
  - 既存`knowledge-graph.mjs validate/table/impact --changed-files`と最終HEADの出力を再利用し、PR全差分の変更影響候補は整理前181パスから、[図版29件の対応付けと残152パスの分類記録](../reports/2026-11-08_pr199-knowledge-graph-impact-triage.md)により**直接対応付け133件・手動レビュー候補152件**となった。残る候補はグラフ登録対象外の採点資料42件・契約テスト等72件・既存受入条件へ引き継ぐ38件に分類し、必要な内容・実行の照合と影響なしの根拠を残す。候補数を不具合数や必須修正数と扱わず、仕様/Skill改訂・移動/削除時の影響を引き続き確認する。
  - M02→M03、M04→M05、M05→M06、M07→M08、M09→M10の引継ぎID/revisionと本人提出物・公開fallbackの区別を照合する。M00 P04の架空誤回答を本人が独立訂正する条件、M05 P05のbefore失敗・after成功・独立main成功の3 Run、receipt/spec SHA・M06/M07非回帰を教材と採点契約に突合する。
  - **完了条件**：82/82と51/51の内容判断、181候補の影響結果、5つの引継ぎ・M00/M05の条件、確認者/根拠。人間の内容レビューが未実施なら未承認と記す。

- [ ] **5. 正式AI評価の実Runと実モデル校正を受け入れる**（旧行174、223）
  - M06/M07の新規Playwright Run・receipt・対象spec SHA/Assertionを評価器が限定実行・照合し、旧Run・架空Report・他Phaseの証拠を拒否することを確認する。M10はPR head・Run/attempt・Check/Artifact・対象specの実GitHub API照合を扱う。本人Private repoでのみ可能な実操作は後続へ分離し、開発側のAPI契約・負例を先に確定する。
  - M04/M07/M10の独立OpenCode正式AI評価を、利用可能な**実モデル**で正答・誤答・部分・別解・旧Run・Prompt Injection・障害/不正証拠まで校正し、重大な誤PASS 0件を確認する。認証・費用・権限が成立しなければBLOCKED。モックCIを実モデル校正へ換算しない。
  - **完了条件**：実Runと対象SHA、実モデルID/認証・費用/権限の確認、校正結果と負例、未実行理由・再開条件。

- [ ] **6. Scenario Shopの正式CaseとWeb/Android/DB技術受入を完了する**（旧行205、206、207、208、209、211）
  - 分析済みの79要件・208動作、動作959採用条件＋6引継ぎ条件、29横断要件51採用条件を再分析しない。[正式Case採否](../reports/2026-11-07_pr199-formal-case-adoption-decisions.md)に既存テストAssertion・Role/Session・State・Seed/Reset・Case IDを対応付け、条件別に既存Runを再利用できるかを判定する。**208動作へ一律に新規E2Eを作らない**。
  - 最終SUT/test SHA、操作・期待/観測、Platform、DB before/after、競合/rollback、Run/job/attempt、コマンド/exit、Trace/動画/画像/Console/Network/ReportをCaseごとに検証し、PASS/FAIL/BLOCKED/未実行/TEST ERRORを分ける。欠損の理由と再開条件を記録する。
  - 停止staffのForbidden戻り先循環・Session/DB不変性、製品Webの幅320/390/767/768/1023/1024/1440px・Empty/Loading/Error/Conflict・Keyboard/Focus/axe、妥当なAndroid実機/エミュレータでのMaestro・Navigation・SQLite、Web IndexedDB/DexieとAndroid SQLiteの失敗・取引不変性を実証する。Mobile build成功や一部のDB digest一致を全CaseのPASSにしない。
  - **完了条件**：正式Caseごとの根拠と残リスク、製品FAIL・環境BLOCKED・未実施の区別。製品SUT/正式仕様/既存Seed/Reset・既存製品テストは読取り専用。修正は独立[PR #210](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/210)で扱い、未マージ修正を#199のPASSに流用しない。

- [ ] **7. 統合差分と正式Caseの独立レビューを完了する**（旧行184、210）
  - 統合後のコード・教材・評価器・配布・安全性を、必要なbase・呼出経路・テスト/CIを含めて独立レビューする。子PRで解決済みのスレッドを未完了として再起票しない。新たな根拠ある指摘を修正・再検証する。
  - 正式Caseについて、実行者と独立した確認者が期待/観測・Case ID/Role/Platform・PASS/FAIL/BLOCKED・証拠の実在・既知不具合/修正先/残リスクをレビューする。本人の自己判定やCI成功を独立レビューの代わりにしない。
  - **完了条件**：対象SHA、レビュー担当と証拠、指摘と解消/再検証、残件。

- [ ] **8. 最終HEADの必須CIとマージ前判定を確定する**（旧行183、185）
  - 作業1〜7の差分が確定した**同一最終HEAD**で、Web Style/Type/Contracts/Unit/Integration/Component/required Chromium E2E/Build、Android/iOSの必須Static/Build/Maestro等をチェックし、success/failure/skipped/未実行を区別して必要なArtifactを実在確認する。過去HEADの成功は代替にしない。
  - PR本文/Planは現時点の結果だけに揃える。マージ前のFAIL/BLOCKED/要承認と後続の本人受入を区別し、権利・セキュリティ・製品技術受入の不足を未確認のままPASSとしない。
  - **完了条件**：最終SHA、必須ジョブ・Artifact、個別受入結果・独立レビューと未解決事項、マージ可否の根拠。merge・Draft解除・closeは明示依頼まで禁止。

## マージ後の本人受入（従来の6条件・今回移管した12条件とは別）

2026-11-01の合意どおり、Public Templateの実公開と本人のPrivate repo/2-core Codespacesの操作はマージ後。元の未完了6条件を後続工程で追跡し、未実行・要認証・要料金確認の状態を維持する。Phase 3の教材/評価実装はマージ前の対象だが、Phase 3の**本人受講は任意**。

| 元の旧行 | 本人が行う受入 | 実施条件・証拠 |
| --- | --- | --- |
| 219 | Phase 1：Private 2-core CodespacesでM00ロード、ファイル編集・保存・再ロード競合、Ports・通常AI利用 | 本人権限・費用・Secret許可/拒否、実画面と変更前後・本人の独立判断 |
| 220 | 固定SkillをPython 3.11で起動しM02→M03の技法runtime/負例まで実行 | 固定SHA、Skill-local参照・scripts、request/response、fingerprint・valid・exit |
| 221 | Phase 2：Shop/Seed/Reset/Playwright、M05〜M07の本人Case・Trace・再Run・保守 | 本人作成spec、業務Assertion、実Run/Trace |
| 222 | Phase 3を選んだ場合だけ本人Private GitHub CIとM08〜M10実行 | 本人のworkflow有効化、費用、PR/Run/attempt/Check/Artifact |
| 224 | Phase 1/2の本人提出物・非公開評価履歴をGit/PRなしでエクスポート/復元 | 本人ダウンロード、同一revision、既存ファイル非破壊、Secret拒否 |
| 225 | 本人環境での11教材/22状態・Shop・SkillとWeb/Templateの版一致・操作 | 最終配布SHA/manifest、版不一致・画面幅・キーボード/a11y実操作 |

第三者権利の**監査は作業1のマージ前必須条件**。本人の最終公開判断・Public Templateの実作成はマージ後。本人の実OpenCode会話・Provider保持条件・料金判断も、作業2/5で可能な開発側検証とは別に実受入する。後続項目を前倒しでPASSにしたり、開発側の残検証ごと後送りしたりしない。

## 完了済みの条件（再作業しない）

以下は元44条件のうち受入済み10件。再度チェックボックスを置かない。

| 旧行 | 完了範囲 |
| --- | --- |
| 135・136 | Web依存閉包と固定Shop全量同期・ハッシュ検証 |
| 146・147・148 | 子PR全件統合、共有差分調停、旧課程・製品SUT分離 |
| 154・155・156 | 公開11教材・クイズと途中保存・revision |
| 177 | 79要件・208動作の基本分析、既存Case候補の突合 |
| 182 | 必須Mobile CIのPRトリガー復元 |

関連成果物：[正式Case採否・一部Web実行証拠](../reports/2026-11-07_pr199-formal-case-adoption-decisions.md)、[ライセンス監査](../reports/2026-11-07_pr199-fixed-skill-license-audit.md)、[Web配布Artifact監査](../reports/2026-11-07_pr199-web-distribution-artifact-audit.md)。これらを先に参照し、**不足している条件だけ**対応する。

## 作業境界と判定規則

- 本PRの`src/presentation/**`、`src/application/**`、`src/infrastructure/**`、`src/domain/**`、`src/seeds/**`、`app/**`、`docs/spec/**`、既存Seed/Reset・製品用テストは読み取り専用。製品修正はPR #210。統合済み子PRは再分割・再マージしない。
- 固定外部`qa-workflow-skills`本体は変更しない。105ファイルという件数を新しい固定要件とせず、manifest登録全ファイルのSHA・entrypoint・Skill-local依存・禁止パスで判定する。
- Case採否と製品PASS、構造検証と意味レビュー、モックと実モデル校正、開発CIと本人実操作、コードレビューと正式Case独立レビューは別判定。ただし**同じ検証結果とArtifactは複数条件で共用し、再取得を目的としたテストは作らない**。
- FAIL/BLOCKED/未実行をPASSにしない。各作業では対象SHA、仕様・差分、検証コマンド・Run・Artifact、結果、残る不足と再開条件を記録する。必要な追加修正は該当する作業へ統合し、新しい重複タスクを発生させない。
- 外部公開、課金、merge、force push、branch削除、PR close、release/tagの作成削除は本人の明示許可まで行わない。
