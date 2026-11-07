# PR #199：M08〜M10学習目標・知識ノード意味的レビュー（2026-11-03）

## 対象・判定

基準HEAD：`0933b001629513e0d36dec01e40a292e473ebe1a`。M08の4学習目標・5知識ノード、M09の5目標・7ノード、M10の5目標・7ノードを対象に`knowledge-graph.json`の`level2`・`can_do`、11モジュール内の該当README、実技`exercise.md`、提出テンプレート、`scoring-tests/{M08,M09,M10}.json`を比較。**新規静的照合14目標・19ノード**。

**結果**：当該14目標と19ノードについて、教材・新条件P01〜P06・採点基準の意味上の対応を確認した。直接の相互矛盾や完全な評価経路の欠落は見つからなかった。ただし実GitHub PR・Actions、Codespaces、AIモデル評価、実受講者の判断、採点コードの誤PASS防止は**未受入**である。学習目標・知識ノードを修了・承認済みにする根拠にはならない。

## M08：Git差分・ローカルcommit・PR草稿（4目標、5ノード）

| 目標・採点基準 | 本文・演習との対応 | 独立に必要な証拠 |
| --- | --- | --- |
| `M08-01` / `M08-CR-01` | READMEのworking tree/stage/commit/branch、実技の`git status --short --untracked-files=all`、練習branch、2回のcommit。P01/P04で変更前後の状態を観測 | `K-M08-01/05`。ローカルcommitとpush/PR/CIを区別し、未実施の共有操作を完了としない |
| `M08-02` / `M08-CR-02` | READMEの`git diff`・`git diff --cached`・`.gitignore`。P01〜P03で候補ファイルのみstageし、別メモ・合成ログ・Secretを除外 | `K-M08-02`。未追跡ファイルに通常の`git diff`が出ない制約を考慮し、stage後のcached diffを本人が検査する |
| `M08-03` / `M08-CR-03` | READMEのPR説明、P06で**2つ目のcommitだけ**（`HEAD^→HEAD`）のdiffを用いて草稿を作り、実PRのbase/head全差分と区別。M09へのhandoff契約も記録 | `K-M08-03`。仕様/Case・変更path・実test・Run/未実行・SHA・未確認を一対一で示し、作成していないPRを報告しない |
| `M08-04` / `M08-CR-04` | READMEのAIレビュー採否、P05で虚偽CI報告・正しい証拠リンク・不要Factoryの提案を条件別に採否 | `K-M08-04`。現状重複なしと実際の重複/変更負担ありを分け、根拠のない抽象化を追加しない |

**ノード別確認**：`K-M08-01`＝Gitの四領域、`02`＝stage/ignore/秘匿情報、`03`＝仕様・差分・テストのPR説明、`04`＝AI指摘の妥当性、`05`＝ローカルcommitとRemote/PR/CIの別判定。全ノードの`can_do`に実技と少なくとも1採点基準の対応がある。

## M09：workflow設計・証拠読解・費用/権限（5目標、7ノード）

| 目標・採点基準 | 本文・演習との対応 | 独立に必要な証拠 |
| --- | --- | --- |
| `M09-01` / `M09-CR-01` | READMEのevent/job/step/runner、未完成workflowと基準`.disabled`案。P01で`workflow_dispatch`へ切替えた別案、P06で基準案に戻す | `K-M09-01/06`。手動起動ではPRイベントの`pull_request.head.sha`がないため、triggerだけを変更して同じSHA照合を正しいとしない |
| `M09-02` / `M09-CR-02` | READMEのSHA/Run/Check/Artifact、P02で`github.sha`・PR head・merge SHA・checkout後HEAD・target-sha.txtを分離 | `K-M09-02`。旧HEADのRun、別attemptのArtifact、Test失敗後のArtifactを現HEADの成功根拠にしない |
| `M09-03` / `M09-CR-03` | READMEのstep別失敗、P03の合成A/B/Cと追加X/Y/ZでBrowser導入/Assertion/Artifact・別SHAを区別 | `K-M09-03`。最初の失敗stepと実行されたかどうかを特定し、合成ログは実CI証拠にしない |
| `M09-04` / `M09-CR-04` | READMEの標準Runner・費用・品質ゲート、P04のPR更新頻度A/B×自動/手動の4条件比較 | `K-M09-04/07`。Run回数だけで料金を確定しない。OS/対象spec・時間・Artifact容量・利用枠/支払者・未検証期間と安全な停止条件を確認 |
| `M09-05` / `M09-CR-05` | READMEの最小権限、P05の`write-all`/deploy Secret案と`pull_request_target`外部PRコード実行案の拒否、P06の他CI/Secret境界 | `K-M09-05`。`contents: read`・`persist-credentials: false`でも外部通信/依存コードの安全は保証されない。書込み・外部PR・料金/権限未確認なら有効化しない |

**ノード別確認**：`K-M09-01`＝workflowのevent/job/step/runner、`02`＝RunとSHA、`03`＝CI失敗段階、`04`＝実行費用と検査、`05`＝最小permissions/Secret、`06`＝YAML変更・対象spec、`07`＝頻度/費用/未検証期間。各`can_do`をREADMEとP01〜P06・採点基準へ追跡。**M09は設計学習であり、`.disabled`案をM10で有効化した実CIの代わりにしない。**

## M10：実PR HEAD・CI・Artifact・停止判断（5目標、7ノード）

| 目標・採点基準 | 本文・演習との対応 | 独立に必要な証拠 |
| --- | --- | --- |
| `M10-01` / `M10-CR-01` | READMEの差分保護・Secret除外、P01でM07追加testと専用workflow/依存の公開範囲を選ぶ | `K-M10-01`。本人repoに取り込むspecと依存、除外対象、許可/権限を確認 |
| `M10-02` / `M10-CR-02` | READMEの専用workflow手動有効化と安全条件、P02で実Runnerとローカルの差、Build/Browser/Shop Serveを照合 | `K-M10-02`。**本人が許可したリポジトリでの実workflow有効化・実Runが必須**。M09の`.disabled`設計だけで合格しない |
| `M10-03` / `M10-CR-03` | READMEの同一Run証拠6点セット、`ci-run-evidence.json`、P03の実PR HEAD→Run/Check→Artifact→target-sha.txt→Playwright test数、P04の架空旧SHA不一致 | `K-M10-03/06`。GitHub APIで現在HEAD、同Run/attempt、対象spec、PASS/FAIL/SKIP、Artifactを照合。成功・スキップ・欠落を混同しない |
| `M10-04` / `M10-CR-04` | READMEの最初の失敗step・停止、P05のBrowser失敗/Assertion/Artifact欠落、P06のtrigger頻度・費用・権限変化 | `K-M10-04/07`。CI専用障害とspec/製品失敗、停止/再実行/不要trigger停止の選択理由を記録 |
| `M10-05` / `M10-CR-05` | READMEのAI案採否と未検証範囲、P06の本人による実Run結果と運用判断の報告 | `K-M10-05`。AI自己申告・合成例・旧SHAのPASSを現HEADの品質保証にしない |

**ノード別確認**：`K-M10-01`＝公開資産、`02`＝実CI再現環境、`03`＝現行PR HEAD、`04`＝失敗原因、`05`＝AI判断/残リスク、`06`＝同一RunのArtifact完全性、`07`＝trigger停止/再実行。各知識にREADMEと実技・採点基準の対応あり。

## 未受入条件と誤PASSを拒否する条件

1. **M08**：ローカル練習branchで2回commitできても、pushやPRを作ったとは報告しない。PR草稿は実PRのbase/head全差分を証明しない。`M08-03`は草稿の説明能力、実PRは後続段階として扱う。
2. **M09**：手動起動のSHA取得とPRイベント時のSHA取得は異なる。`pull_request_target`や外部Action/依存コードの権限を緩めず、元の正式Web/Mobile CIは変更しない。`.disabled`の成果物を「CI成功」としない。
3. **M09-04**：費用モデルにRun回数、job分数、artifact保存、OS、支払者・無料枠、未実行期間を含める。PR頻度の架空条件は実料金/実利用の測定ではない。
4. **M10-02/03**：実CIの安全な実施は本人の非公開repository・課金/権限確認の後に行う。旧SHA成功や別Run/attempt、Artifact内target-sha.txtの違い、欠落するPlaywright JSONを拒否する。
5. **M10-04/05**：Retry、Timeout増加、権限拡大、Artifactだけの成功から原因修正・製品適合を断定しない。triggerを増やす追加要望は本人の費用・影響確認と別判断が必要。
6. **横断**：11モジュールの静的参照整合は、モデル採点/学習者実技/固定Skill/コード差分/実Web・Native/最終HEAD必須CIを置き換えない。全82知識ノードの`status`変更は未実施。

## 参照・変更禁止範囲

`docs/curriculum/ai-assisted-qa/knowledge-graph.json`、`docs/curriculum/ai-assisted-qa/modules/{M08,M09,M10}/README.md`、`training/ai-assisted-qa-course/exercises/{M08,M09,M10}/exercise.md`と`submission-template.md`、`training/ai-assisted-qa-course/assessment/scoring-tests/{M08,M09,M10}.json`を確認した。今回の変更は本レビュー文書のみ。製品SUT・正式仕様・Seed/Reset・既存製品テスト/workflow、教材/演習/採点コード、共通分析Plan/台帳は変更していない。
