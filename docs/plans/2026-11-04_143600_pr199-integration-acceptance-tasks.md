# PR #199 統合・横断受入の残タスク

対象：[PR #199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。子PR #213〜#219は統合済み。以降は**未達の受入条件だけ**対応する。既に完了した実装、208動作の基本分析、11教材・クイズ生成、全量同期をやり直さない。

## 現在の対象

| 区分 | 元の44受入条件 | 扱い |
| --- | ---: | --- |
| 完了済み | 10 | 追加作業なし。既存証拠を再利用 |
| マージ前の未完了 | 28 | 下記8つの作業へ集約 |
| マージ後の本人受入 | 6 | マージ判定には含めず後続工程で実施 |
| 合計 | 44 | 条件は削除・無条件で完了扱いにしない |

**8作業は、重複する検証をまとめた実行単位である。** 28条件分の受入責任と各条件の必要証拠は維持する。作業8つのチェックをすべて付けるには、対応する元の条件がすべて成立している必要がある。

[整理前の44条件と詳細な実施履歴（固定commit）](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/c608e6c211b40ae7890b64d96d1ebd0755b78d6f/docs/plans/2026-11-04_143600_pr199-integration-acceptance-tasks.md)を過去記録として参照する。以下の「旧行」はこの固定commitの行番号であり、完了済み条件や古い作業ログを再登録しない。

## マージ前の残タスク

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

## マージ後の本人受入（現在の8作業の完了数に含めない）

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
