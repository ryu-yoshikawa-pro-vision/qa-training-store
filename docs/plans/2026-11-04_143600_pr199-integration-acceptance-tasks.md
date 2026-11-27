# PR #199 統合・横断受入の残タスク

対象：[PR #199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。子PR #213〜#219は統合済み。以降は**未達の受入条件だけ**対応する。既に完了した実装、208動作の基本分析、11教材・クイズ生成、全量同期をやり直さない。

**新規セッションの再開入口**：[PR #199 継続作業手順](./2026-11-08_101200_pr199-continuation.md)。実行順、既存証拠、BLOCKED時の進め方と引継ぎ先は同文書にまとめる。受入条件とチェック状態は本Planが正本。

## B案：マージ前受入と後続受入（2026-11-08承認、2026-11-24現在）

PR #199の追加QA契約実装を原則停止し、マージ前受入と後続受入を分ける。元44条件（既済10・元マージ前28・本人のマージ後6）および旧39個別検証（実証済み20／未完了19）の履歴は保持する。2026-11-23の本人決定により受入時点を明確化し、2026-11-24の一次資料確認で1.4の具体的なライセンス疑問を解消した。未受入の条件をIssueへ移しただけでPASSにはしない。

### B案の7個別条件と現在の受入時点

7項目の識別子と履歴を保つ。以下の「受入時点」と「現在の状態」が現行判断であり、古いチェックポイントや旧詳細行と食い違う場合は本節を優先する。
2026-11-23決定で時点を変更したのは1.2のみ（マージ前から公開前へ）。1.3は本人決定で固定Skill分を受入済み。2026-11-24、公式メンテナーが`standard-navigation@0.0.5`を含む全過去版への現行MIT適用を明示した一次回答を確認し、NOTICEへ正しいcopyright lineを追加した。現在の各ゲートは下表が正本であり、履歴節の当時のBLOCKEDは現行判定ではない。

| 旧個別条件 | 現在の受入条件・時点 | 現状 |
| --- | --- | --- |
| **1.2** | 実配布ファイルとCI ArtifactにSecret・PII・模範解答・採点内部資料がないことを実物確認する。**PRマージ前ではなく、Public Template／その他の外部配布前に完了する** | **未受入・Issue #228で継続**。Issueへの分離はPASSではない。旧remote HEAD `00670f8c…` の既存Artifactでは既知pattern/pathの走査は0件だが、learner template本体と画像内容は未検査。Issueが完了するまで未監査のTemplate・ZIP・配布Artifactを公開しない。 |
| **1.3** | 固定 `qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324` の本人作成13 Skillに既存learner MIT Licenseを適用し、配布意思を記録する。第三者由来の具体的ファイルが判明した場合だけ個別に扱う | **PASS（固定13 Skillに限る）**。2026-11-23本人決定を[固定Skill監査](../reports/2026-11-07_pr199-fixed-skill-license-audit.md)と[配布通知](../../training/ai-assisted-qa-course/templates/learner-THIRD_PARTY_NOTICES.md)へ記録。旧監査のBLOCKEDは当時の履歴。 |
| **1.4** | **マージ前**に、実際に配布する第三者JS・画像・フォント等の固定出典、ライセンス、必要表示を照合する。本人指示によるCodex生成商品画像9件は対象外 | **PASS**。Web CI [#45221560995 attempt 1](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/45221560995)のPR HEAD `d0bd9ac903042e9c6b9a982a85a08a187123a92a` production Artifact `web-dist-production` #14840456705（digest `ff0a0533c9e69755b9ae31b7b4973a1e517416c0623dd33bcbf02298a86026e1`）を取得。322 entries、CRC errorなし。実Bundle `_expo/static/js/web/entry-db8c13f14c3a340a7803e37a57eec1e7.js`（3,739,296 bytes、SHA-256 `dc222004d1a3abf04c9cc51c5f7d52d3d80a299e4c8c06a3adb1438a4dc0c096`）に`standard-navigation`実装があり、Artifact NOTICE（24,637 bytes、SHA-256 `51c168eaa76be0f72f6402f57a33bd0ba53998f36d51f7d13cb699983e260e7d`）は同一HEADのlocal Build出力とbyte-identical、MIT全文・`Copyright (c) 2026 React Navigation Contributors`・固定出典を含む。61 package-version／2,326 source-entryのfrozen-lockfile分析、OFL全文、PNG5件の固定出典を合わせて照合した。Artifact自体にはsource mapなし。Issue #7のmaintainer回答で旧`0.0.5`への現行表示適用も確認済み。Issue #8の上流repository／将来npm packageへのLICENSE同梱依頼はOPEN・未回答だが、downstream表示の受入とは別範囲。|
| **7.1** | #199統合差分のコード・セキュリティ・配布・教材の独立レビュー、指摘対応と再検証を保存 | **PASS（レビュー対象範囲）**（独立reviewerが統合差分を確認。P0–P2なし、P3を修正・再確認。後続Case全件レビューは別条件） |
| **7.2のマージ前部分** | 正式Caseの未受入／FAIL／BLOCKED、後続移管の正当性、#210の製品不具合、公開・機能利用制限を実行者とは別の確認者がレビュー | **PASS（マージ前の移管レビュー範囲）**（Case状態・後続12条件・利用制限を独立確認。全正式Case結果のレビューは後続） |
| **8.3** | 全変更確定後、**同一最終HEAD**の必須Web/Mobile CI、Build・検証Artifact、skipped・failureを確認 | **FAIL**。HEAD `d0bd9ac903042e9c6b9a982a85a08a187123a92a`のWeb CI [#45221560995 attempt 1](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/45221560995)は全30 jobs中29 SUCCESS、条件付き`Extended E2E (mobile-chromium)`のみskip。Mobile App CI [#45221560580 attempt 1](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/45221560580)では必須`Native Static / Run Expo Doctor`がFAILし、ログは`expo-sqlite expected ~57.0.7, found 57.0.5`。確認時点でMobile workflowはqueued/in progress、Android BuildはSUCCESS、iOS Buildはqueued、Android Maestroはin progressで、全workflow conclusionはまだ取得できていない。必須job failureにより8.3はPASS不可。e026の旧runが記録した`~57.0.6`とはexpected表示が異なるため、今回ログの`~57.0.7`を正確な結果として記録する。依存・workflowはこのPRで変更しない。今回の最終受入記録commit後のCIはGitHub APIで別途確認し、前HEADの結論を流用しない。 |
| **8.4** | 現行のマージ前条件、独立レビュー、CI、残リスクを根拠付きで判定 | **未受入・現時点でマージ不可**。1.4は同一コード／NOTICE payloadのWeb production ArtifactでPASS。8.3はMobile `Native Static / Run Expo Doctor`がrequired job failureでFAILし、最終受入記録commit後のrun conclusionも未確認。1.2はIssue #228で外部公開前受入・未監査配布物の公開禁止を維持し、マージ前条件には戻さない。1.3・7.1・7.2は既存の限定範囲でPASS、Provider実利用は対象外。別PRでExpo依存差を修正・main統合後、PR #199で安全に取り込んで8.3/8.4を再判定する。 |

### 2026-11-24 `standard-navigation@0.0.5` 一次根拠とNOTICE生成確認

- `pnpm-lock.yaml`は`standard-navigation@0.0.5`のintegrity `sha512-YAmzwAiiQVocZxO/VGPFiQHcu5pKiz09QIGC0MK6aRMoa3E0QkoTQgcqJr7ZZ3OMiNhu4DkaGElFI5htjOIDbw==`を固定し、`pnpm why --recursive standard-navigation`で依存元が`expo-router@57.0.31`と確認した。旧固定source commit `0016fae7800b9f27bab91326697b740a6d2266dc`の`package.json`は`version: 0.0.5`、`license: MIT`だがcopyright line/LICENSEはなく、install済み`lib/src/index.js`は186 bytes（SHA-1 `d40cb46e4c2d14fda8b6868c5f7c61ece44c27d1`）。author metadataは帰属証拠に使わない。
- 公式LICENSE追加commit [`33f3d3c976a24bad9fe32583939318bc143fa41b`](https://github.com/react-navigation/standard-navigation/commit/33f3d3c976a24bad9fe32583939318bc143fa41b)のMIT noticeは`Copyright (c) 2026 React Navigation Contributors`。旧sourceからのcompareは5 commits/4 files（LICENSE追加、package.jsonとlock更新、`src/index.tsx`変更）を示すため、後発LICENSEと同一repositoryであることだけから旧版への適用を推定しない。公式[Issue #7の質問・回答](https://github.com/react-navigation/standard-navigation/issues/7#issuecomment-6474665803)でLICENSE追加者が全`standard-navigation`過去versionに適用すると明言したことを一次根拠とする。Issue [#8](https://github.com/react-navigation/standard-navigation/issues/8)は確認時にOPEN・コメント0。#7がdownstreamの旧版適用を解決した一方、#8の上流repository／今後のnpm packageへのLICENSE同梱依頼は未回答。
- learner NOTICEの該当rowと説明に固定source、後発LICENSE commit、MIT copyright line、Issue #7回答を記録した。MIT全文を維持し、emailや他のNOTICE項目は追加・削除していない。`pnpm run build:web` exit 0。local Buildの生成`dist/THIRD_PARTY_NOTICES.md`はsource public markerとbyte-identical（SHA-256 `51c168eaa76be0f72f6402f57a33bd0ba53998f36d51f7d13cb699983e260e7d`）、copyright lineとMIT bodyを含む。これをpush後のWeb CI production Artifact（HEAD `d0bd9ac9…`、artifact #14840456705、digest一致、322 entries/CRC clean、entry JS内に対象実装、Artifact NOTICEもlocal生成物とbyte-identical）と照合した。Artifactにsource mapはないため、2,326 entry／61 package-versionの依存closureは既存のfrozen-lockfile source-map解析証拠と区別して利用した。
- B案1.4の具体的な適用不確実性は解消した。権利侵害の認定ではない。1.2 Issue #228の公開前ゲート・未監査配布物の公開禁止は別条件で継続する。

### 2026-11-23 `dc9408b90f8009cb8d87de2e774306e4ca392682` CI追記

GitHub Web CI production Artifact `14817077162`を取得し、APIのdigestと実ZIP SHA-256が一致（`21292446…`）、322 entries、CRC failureなし、source mapなしを確認した。JS本体とNOTICE/OFLの実ファイルとhashを上表へ記録した。Web runのfailed jobsは`Full learner distribution (#199)`、`M06/M07 actual course:run`、依存する`verify`。最初の異常は両distribution経路が`THIRD_PARTY_NOTICES.md`に含まれるGmail連絡先をpublic-content personal-email patternとして拒否したこと。guardやsecurity checkは変更せず、learner向け帰属表からメール欄だけを除き、copyright holder/yearと出典を保持する候補修正を作成した。候補`build:web`と`tests/contracts/web-public-build.test.ts` 10/10はPASSしたが、dirty worktreeを拒否する`course:sync`は修正commit前のためまだ実行できていない。Mobile run `45172067487`は初回確認時点でin_progress。1.4は`standard-navigation@0.0.5`帰属根拠不足によりBLOCKEDのまま。権利侵害の認定ではない。

### 2026-11-23 NOTICE privacy repair checkpoint（push前）

`dc9408b9…`のMobile App CI `45172067487`は後続のrun API確認でSUCCESSに確定した。Web CI `45172067403`の二つのdistribution failureはNOTICEメール連絡先を検出した同一原因のまま。security guardは変えず、NOTICEのstandaloneメール項目を除去した。独立reviewerの指摘で、メールではない`swmansion.com`出典表記を`react-native-screens@4.26.0`行へ復元した。

候補source NOTICEは34,057 bytes／SHA-256 `43b16a6d3352f93d58a5bd2968afe5b87f832b8093c7cb20cda20df6a9a8bc5b`。lockfile準拠のローカルBuildはexit 0、JS `entry-2eacba5967e32f773219f7b9a8ab134a.js`は3,739,226 bytes／SHA-256 `611c693f6acaf56fe4474f48d8df2502c3cd444791bbdd0c1a258968231d7799`、生成NOTICEは23,898 bytes／SHA-256 `2b6a3998b3d3f4ca8a7adcf5d0b7111046c80b38c0918b94037041b5550af8b6`、OFLは4,004 bytes／正本と同一SHA-256 `92df93e7fa51c9c96dea4f8d3149f79be3407162f805595e60c7c2a17e314deb`。source／生成NOTICEのemail patternは0件。focused Web public-build contract 10/10、format、Markdown lint、changed/full text lint、security check、diff checkはPASS。dirty source worktreeを拒否するcourse sync/distribution gateはclean commit後に実行する。

1.4は`standard-navigation@0.0.5`の具体的なcopyright attribution不足でBLOCKEDのまま。次はこの修正とRun記録のcommit、既存PR branchへの通常push、clean source上のdistribution gate、最終SHA Web/Mobile CIとproduction Artifact確認。8.3は未確定、8.4は未受入・マージ不可。

### 2026-11-23 clean course distribution validation（候補commit）

Commit `0324dbd260043fd356178262159d917ec0cad606`のclean treeで、固定外部Skillと同一HEAD assessmentの読み取りを伴う`pnpm course:sync --source-sha 0324dbd260043fd356178262159d917ec0cad606 --target <TEMP_ROOT>/pr199-course-sync-0324dbd2`を実行した。sandbox既定ネットワークではfixed raw GitHub content fetchが失敗したため、公開固定revisionへのread-only network accessを許可した再実行がexit 0で完了した。配布先で`node scripts/training/ai-assisted-qa-course.mjs verify-distribution`もexit 0：569 files verified、Shop 322、state 22、assessment references 17。同期したNotice SHA-256 `2b6a3998b3d3f4ca8a7adcf5d0b7111046c80b38c0918b94037041b5550af8b6`、JS SHA-256 `611c693f6acaf56fe4474f48d8df2502c3cd444791bbdd0c1a258968231d7799`がcandidate Buildと一致し、learner Noticeのemail patternは0件。配布物を外部公開していない。

これは`0324dbd2`のlocal candidateの検証。Run記録だけを含む後続commitがあれば、その最終HEADに対するCI Artifact確認を8.3で行う。1.4は`standard-navigation@0.0.5`の具体的copyright notice不足でBLOCKED、8.3は最終HEAD未検証、8.4は未受入。

### 2026-11-23 本人確定事項（現行ルール）

- **固定Skill**：固定commitの13 Skillは本人作成の著作物で、既存の学習者用MIT Licenseを適用し学習者Templateへ配布する本人意思がある。著作権者や本人からの再配布許諾を繰り返し確認しない。第三者から取り込まれた具体的なファイルが実際に確認された場合に限り、そのファイル名・出典・根拠を示して個別に扱う。
- **生成画像**：`config/product-image-assets.json`が参照する商品画像9件は、本人指示でCodexを使用して生成した。外部画像サイト由来として権利調査を繰り返さない。第三者既存作品の使用・複製を示す具体的な証拠が出た場合だけ、対象画像に限定して扱う。Expo Router／React Navigation等の既存配布素材や外部ライブラリは別の第三者素材である。
- **外部Provider**：実OpenCode／外部Providerの接続、認証、料金、保持／削除の受入および正式AI評価の利用開始はPR #199のマージ前実施対象・完了条件から除外する。外部送信・実Provider利用・正式評価の利用開始は承認されていない。未承認送信を防ぐ既存のfail-closed実装と拒否テストは維持し、これらの拒否契約を実Provider受入へ読み替えない。
- **配布安全性**：未完了の1.2は[Issue #228](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/228)で独立追跡する。Issueへの分離はPASSではなく、Issueの検査と受入が完了するまでlearner Template・配布ZIP等の未監査物を公開しない。1.2は公開前条件であり、PR #199のマージ前条件にはしない。

従前の監査・判断は実施当時の履歴として残す。現在の受入条件と状態はこの表が正本であり、下記の古いチェックポイントおよび元28条件の履歴より優先する。PR本文もこの状態へ合わせる。

### 2026-11-22 当時の証拠チェックポイント（履歴）

- #210はmainへ統合済み。今回のPR #199 HEAD `fbc8e551a01882b5e6d8c846edc23f3beea96660`にはmain `b8beb9f05db93acd509ca4c35741a7dbab1b4ccd`が含まれる。正式Caseの実受入結果は製品修正だけでは更新しない。
- [Web CI #45020508148](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/45020508148) attempt 1はIntegration 2件、Contracts 16件、Chromium cross-role 1 failed/1 flakyでFAIL。`verify`は必須結果集約のfailure。Web/Template/Spec buildとdistribution verification jobは成功したが、Artifactが存在することだけでは1.2の全バイナリ走査完了を示さない。
- [Mobile App CI #45020508179](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/45020508179) attempt 1はNative Static、Android/iOS Build、Android Maestro、`native-ci / verify`を含めSUCCESS。これはWeb CIのfailureを相殺せず、8.3は未達。
- Integration 2件はPR専用の`tests/integration/pr219-actor-revocation.test.ts`が修正前の`RESOLVED`を期待し、transaction内再認可の`AUTHENTICATION_REQUIRED`拒否と食い違う。Contractsの16件は、last-admin interleaving 2件（旧`LAST_ADMIN_PROTECTED`期待、実際`PERMISSION_DENIED`）、supported-behaviors validatorの初回証拠不一致を共通原因とする13件、修正済み在庫境界に残った`it.fails` 1件。PR専用stale Cart E2Eは旧`/checkout/payment`期待に対して`/cart`を観測した。
- main既存`e2e/web/cross-role-lifecycle.spec.ts`のstatus Locator曖昧性はPR差分外の既存製品テストであり、本PRでは変更しない。別の製品テスト保守PRが必要。
- Supported Behaviorsの歴史的`source_commit=383efc9107ef3d5f78c5659473277166c1bba2de`は保持する。CIが検出した行ずれは52 Use Case methods/205 evidence refs、72 implementation refs、13 behavior source refs、117 behavior IDsに及ぶ。line-only driftと#210の意味変更を分離し、更新後に全79要件・208動作validatorを再実行する。formal Caseの`execution_acceptance=未受入`は維持。
- 以前の[配布物監査](../reports/2026-11-07_pr199-web-distribution-artifact-audit.md)は過去HEAD固定の履歴であり、最新HEADの未知PII・画素内容・全配布ファイルを保証しない。固定Skill一次許諾は[既存監査](../reports/2026-11-07_pr199-fixed-skill-license-audit.md)で当時未確認だった。第三者素材も当時は全件の一次権利根拠が未取得だった。現在の1.3判断は冒頭の2026-11-23本人決定を適用する。
- 独立reviewでTutorは価格確認後もProvider auth/availability/retention確認なしに送信できるP1、親directory symlink race P1が確認されたため、外部AI安全条件は当時未達だった。static contractの通常Tutor/正式評価履歴分離・calibration failure拒否は確認範囲の証拠だが、Provider retentionの一次根拠と実Provider認証・料金・保持/削除、本人Private環境のpayloadは未検証だった。P1修正・拒否テストが成立するまでTutor送信を安全受入しないという当時の対応は、fail-closed実装と拒否テストを維持する現在の条件へ引き継ぐ。実Provider実受入はマージ前条件ではない。

**追加のマージ前安全条件の旧記録（2026-11-23決定で範囲調整）**：本人の明示同意なしにOpenCode／Providerへ送信しないこと、認証・費用・権限・保持が未確認の操作は安全に停止すること、通常チューターが正式評価やLevel 2合格判定へ混入しないことを、実装経路と拒否テストで確認する。現在もfail-closed処理と拒否テストは維持する。一方、実OpenCode／Providerの接続、認証、料金、保持／削除の実受入および正式AI評価の利用開始はPR #199のマージ前条件から除外する。これらの実利用は承認されておらず、拒否テストPASSを実Provider受入へ読み替えない。

**2026-11-22 review finding（履歴）**: 独立read-only reviewではTutorが公開価格を確認した後、Provider auth/availabilityと権威あるretention policyの検証なしに`opencode run`へ進む経路、およびTutor excerpt/public fileの親directory symlink raceを確認した。したがって外部AI安全条件は当時未達だった。実Provider送信は行わず、retention根拠がない限り送信をfail closedにする。path raceはroot-anchored no-follow処理と決定的contract testの候補修正を行った。今回の修正結果は下記チェックポイントに記録する。

### 2026-11-23 #210後CI修正・独立レビューのチェックポイント（本人決定前の履歴）

- GitHub上のPR #199はOPEN、remote HEAD `fbc8e551a01882b5e6d8c846edc23f3beea96660`、main `b8beb9f05db93acd509ca4c35741a7dbab1b4ccd`。作業ブランチはPR head、upstreamも同ブランチ。候補変更は未commit／未pushであり、このSHAのCI結果ではない。
- PR固有の認可失効・last-admin・在庫境界・stale Cartテストを#210後の実装契約へ更新。supported-behaviorsでは行番号だけでなく#210による意味差を照合し、source originと正式Case未受入状態を維持した。
- Tutor／正式評価のProvider保持根拠が未取得であるため、新しい外部送信・評価開始はfail-closed。Tutorの対象ファイル読取をroot-anchored no-followにし、symlink差替え・FIFO・過大入力を拒否する契約を加えた。実Provider認証・課金・保持の受入には換算しない。
- 最終候補のfocused testsはLinux ext4上で、distribution + M07 2 files / 91 tests PASS（Prettier PASS、27.25秒）、supported-behaviors 62/62 PASS、Tutor／assessment resume／last-admin／inventory／actor-revocation 5 files / 30 tests PASS。これらは全Contracts、E2E、Build、verify、最終HEAD CIの代替ではない。
- 独立reviewerは当該diff digestを再確認し、修正済みP3以外にP0–P2なし。7.2マージ前移管レビューでは、CaseをPASSへ変更していないこと、#210修正済み動作と現行FAIL候補、後続12条件、公開・Provider制限を確認。全正式Caseの独立実行結果レビューは後続のまま。
- main所有`e2e/web/cross-role-lifecycle.spec.ts`の曖昧な`getByRole("status")`は対象差分外。失敗通知とLoading領域が同じroleに一致するため、製品テスト保守PRで通知内容に限定したLocatorへ修正する案を引継ぐ。本PRでは編集も新PR作成もしない。
- 当時のゲート：1.2は候補HEADのBuild Artifact未走査、1.3は固定Skill権利者の一次許諾待ち、1.4は商品画像9件・生成JS依存閉包等の権利根拠不足で未受入だった。外部Providerは認証・費用・保持／削除の一次根拠と本人実行が未確認で、8.3は新HEAD CI待ちだった。現行判定は冒頭の2026-11-23本人決定後の表を参照する。
- B案のマージ前7条件は、7.1と7.2マージ前部分を独立レビュー範囲で確認済み。その他の受入を代替しない。後続12条件と本人受入6条件はそのまま維持する。

### 2026-11-23 ローカル全体検証のチェックポイント

- 検証対象は候補差分（PR base HEAD `fbc8e551a01882b5e6d8c846edc23f3beea96660`、main `b8beb9f05db93acd509ca4c35741a7dbab1b4ccd`）。現候補は未commit／未pushであり、上記GitHub Actions結果は旧HEADに限る。
- 独立validation runの結果：`test:integration` 16 files / 197 tests PASS、`test:repository` 150 PASS / 1 skip、`test:component` Web 127・Native 92 PASS、`test:hooks` 4 files / 174 tests PASS、`build:web`・`build:spec` PASS。
- Contracts全体は2 files failed / 123 passed、68 failed / 1,383 passed / 7 skipped。66件の`official-artifact-chain.test.ts`と2件の`spec-agentic-qa.test.ts`が同じ`EISDIR` (`scripts/agentic-qa/benchmark-revision.ts:60`) で失敗した。検証用ext4 checkoutではroot `node_modules` がsymlinkで、`.gitignore`の`node_modules/`に無視されず`?? node_modules`としてstatusへ出る。revision列挙は除外判定前に全status pathを`readFileSync`し、symlink先directoryを通常fileとしてhashしようとする。CIの通常のignored directoryとは異なる一時検証配置が原因とみられる。ソースは変更せず、real directoryを使うext4 checkoutで再検証中。現失敗の正確なpathはroot `node_modules`。
- `test:e2e:cross-role`（33 browser launch failures）と`test:e2e:chromium`（71 browser launch failures）はChromiumの`libnspr4.so`不足でtest assertion前に起動できず。アプリのE2E結果とは扱わない。
- `verify`は`typecheck:native-tests`でIntegrationテストのTS18048（`expected.users` / `expected.sessions` optional table snapshot）により失敗。PR専用test helperの型でusers/sessionsを必須化する型修正を実施し、対象Integration 2/2と`pnpm run typecheck:native-tests`を再実行してPASS。`verify`は修正後の最終candidateで再実行待ち。
- 依存関係は変更していない。先行ext4 snapshotは`expo-router@57.0.30`でlockfile指定`57.0.31`と不一致だったため、依存version差をWeb Build PASSの根拠に混同しない。
- 以上のローカル結果で1.2実Artifact検査や8.3を完了扱いしない。最終HEADのCI／Artifact、1.3／1.4の一次権利根拠、実Provider契約、本人実受入は未確認またはBLOCKEDのまま。8.4はマージ不可。

#### 04:11 JST 追記：正規ext4配置での再検証

- `node_modules`を実directoryとして配置した新しいext4 snapshotで`pnpm run test:contracts`がPASS（125 files、1,451 passed、7 skipped、exit 0）。前回68件の`EISDIR`は、symlinkの`node_modules`がuntracked pathとしてGit statusへ現れた検証環境配置に起因すると確認できた。benchmark revision生成script自体は変更していない。
- 同じsnapshotで`pnpm run verify`もPASS。format／Markdown／text lint、curriculum／AI validation、全typecheck、Contracts、全Buildを含む。ESLintは93 warnings、0 errors。Focused Integration 2/2および`typecheck:native-tests`も型だけの修正後にPASS。
- `test:e2e:cross-role`と`test:e2e:chromium`は初回ローカル試行でChromium `libnspr4.so`不足によりブラウザ起動前に停止。修正後にローカルE2Eを再実行していない。E2E成功は主張せず、最終HEADのCI証拠で判定する。
- 独立reviewerは最新tracked candidate digest `97e4774a5080850550dd5df1c9f16019e7ed9e8f5086a2f274d0d41844520be7`を読み取り確認。従前レビューdigest `439dad5c…`から追加の実装変更はIntegration testのTableSnapshot型宣言・戻り値注釈だけで、実行時処理に問題なし。Plan／Runは証拠追記。1.2の最新Artifact走査、1.3／1.4一次権利根拠、最終HEAD CIと8.4は未完了／マージ不可。

#### 04:35 JST 追記：最終candidateのverify

- 最新Plan／TASKS／evaluationを含むtracked candidate digest `dd8bf9d54168d7e998f1fb321d4a7fa86c610791354ed61e95a89100ac024186`を新しいLinux ext4 snapshotで`pnpm run verify`し、exit 0。125 Contracts filesで1,451 passed / 7 skipped、Integration 197、Repository 150/1 skipped、Component Web 127 / Native 92、unit 66。全typecheck、format／Markdown／text lint、skill/spec/curriculum/AI validation、security、Web export/docs BuildとSpec Build 22 pagesがPASS。ESLint 93 warnings / 0 errors。
- これはlocal candidateの検証であり、branch HEAD `fbc8e551...`のGitHub Actions結果ではない。PR #199の最終commit後にWeb/Mobile CIを確認する。1.2最終Artifact、1.3/1.4権利、8.4のマージ判定は未完了。

#### 04:50 JST 追記

- 04:35 JSTの記録・TASKS完了チェックを含むcandidate digest `e66adde670ea0f5120c6f9f7e605992b10b889f18fbb1e41f129a19853038060`で`pnpm run verify`を再度実行し、Linux ext4上でexit 0。結果は上記と同じく全suite・全typecheck・Web/Spec Build PASS、Contracts 1,451 passed / 7 skipped、ESLint 93 warnings / 0 errors。新しい失敗なし。
- 検証後に追加したのはこのRun／Planの実行結果記録のみ。ソースは変更していない。GitHub Actionsはローカルcommit後の最新HEADで別途確認する。

#### 2026-11-23 Web/Mobile CI・配布Artifactの調査（コードHEAD `49af44d72a4fcbd14e393e56b3e07c2346b0cd03`、当時の履歴）

- PR #199はOPEN、base `main`、HEAD `49af44d72a4fcbd14e393e56b3e07c2346b0cd03`。#210を含むmainは`b8beb9f05db93acd509ca4c35741a7dbab1b4ccd`。このPlan／Run更新後に記録用commitを作成する場合、新しい最終HEADのCIを別途確認する。
- [Web CI #45063620677](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/45063620677) と [Mobile App CI #45063620660](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/45063620660) は同一HEADでSUCCESS。Web Integration 197 PASS、Contracts 1,452 PASS / 6 skipped（125 files）、Windows PowerShell Run-root contract 7 PASS / 12 platform skips、required Chromium 71 PASS、PR専用cross-role 33 PASS。Mobile Native Static、Expo Doctor、Android/iOS Build、Android Maestro、`native-ci / verify`もSUCCESS。条件付きMobile Chromiumと成功時failure-only uploadはskip。
- Cross-roleの33 PASSには`test.fail()`による期待済みの2つのSUT失敗が含まれる。管理商品選択のclearとmany-products filter/page resetは失敗を再現し未受入を維持。surviving Sessionを持つ停止operatorのForbidden loopもCase evidenceで`productAcceptance=FAIL`。stale Cartは`/cart`へ戻り、23 DB table不変を確認した。CaseをPASSへ昇格しない。
- 同一runのBuild/検証ArtifactはWeb production `14770088637`（ZIP SHA-256 `dc6eaf3c…`）、Automation `14770687052`（`9fd3f229…`）、Spec `14770501644`（`405eded…`）、course distribution evidence `14770806464`、course run evidence `14770443312`、cross-role DB digest `14769908244`／visual `14769958159`、Android production APK `14771290788`、iOS production app `14771073123`等。
- Web production／automation各320件、Spec 116件、course evidence 7件のZIPはCRC正常。重複・unsafe path・symlink・禁止名・既知GitHub/OpenAI/Anthropic/AWS/Google/Slack/GitLab token・秘密鍵・主要個人メールpatternは0件。course manifestはHEAD一致、567配布file（Shop 320／local 142／external Skill 105）、同期前後hash一覧568行一致、manifest path重複・unsafe/forbidden pathは0件。別Build間ではShop 318/320のパスとSHAが一致し、hashed JS pathが1件欠落、`index.html`のSHAが不一致。完全な同一生成物比較とは扱わない。
- course artifactはlearner template本体ではなくmanifest／hash一覧／knowledge graph evidenceのみ。画像118件のpixel/metadata確認は未実施。WSLからの再生成はcheckout外のLinux依存package pathがtargetへ混入してpath guardで停止し、CI Web ZIPをshopBuildとして使う再生成も`raw.githubusercontent.com`のDNS `EAI_AGAIN`により固定Skill取得で停止した。したがって1.2は部分走査のみで未受入。
- Tutor／正式評価のfail-closed契約は当時のContractsでPASS。Provider認証・料金・保持／削除条件の一次根拠と本人確認は未確認だったが、2026-11-23本人決定により実Provider受入はPR #199のマージ前対象から除外した。固定Skillの1.3は本人決定でPASSへ更新し、生成商品画像9件を第三者権利未確認対象から除いた。1.4の現行未解決対象は冒頭の表に限定して記載する。7.1/7.2のマージ前review scopeはPASS、全正式Case独立結果reviewは後続。8.3はこのコードHEADでPASS、8.4は当時未受入だった。

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

## 元の受入条件（旧詳細・後続移管の履歴）

以下は元の28条件と当時の受入時点を保存した記録であり、現行のマージ前条件を定める表ではない。1.2の受入時点、1.3の固定Skill判断、1.4の対象、実Provider受入の範囲については冒頭の2026-11-23本人決定を優先する。B案の現行マージ可否も冒頭の表を正本とする。

- [ ] **1. 公開・配布成果物の非公開情報除外と第三者権利を受け入れる**（旧行137、178、226）
  - 同じ最終HEADの実Web Build、Template、配布manifest、CI Artifactを照合し、`assessment/reference-solutions/**`、`scoring-tests/**`、`completed-states/**`、完成spec・正式workflow・旧教材・個人成績、`.env`・認証情報・個人データの混入を検査する。既存の禁止パス・負例テストを再利用する。ファイルの存在を確認できない場合は安全と判定しない。
  - 当時は固定`qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324`等の許諾が未確認と記録した。固定13 Skillは2026-11-23の本人決定で本人著作物・learner MIT対象・配布意思ありと確定し、現在の1.3はPASS。第三者由来と示す具体的ファイルが確認された場合だけ個別に扱う。JS・フォント・Expo Router／React Navigation既存画像の第三者素材は1.4として別に扱う。不存在を侵害・許諾いずれかの証明としない。
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

2026-11-23本人決定後の受入時点：1.2の未完了な配布物検査は[Issue #228](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/228)で継続し、Issueの完了はPASSへ自動換算しないが、**受入時点をPRマージ前からPublic Template等の外部配布前へ移す**。Issueで必要な実体検査と受入が済むまで未監査のTemplate・ZIP等を公開しない。1.3の固定13 Skillは本人決定と既存MITで受入済み。1.4の第三者素材確認は冒頭の表にある具体的な未解決対象に限って継続する。実OpenCode／Provider接続、認証、料金、保持／削除の実受入はPR #199のマージ前条件・実施範囲から除外し、未承認送信を拒否するfail-closed処理と拒否テストを維持する。後続12条件と本人受入6条件は別状態のまま保持し、今回の決定でPASSにしない。

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
