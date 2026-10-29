# M09 実技：CI workflow案の修正と証拠の読解

## 入力

workspace/M09/public-sample/handoff.mdの合成branch/commit/PR履歴か、契約を満たす本人のM08成果物、安全な完成見本、未完成のworkspace案、workspace/M09/failure-cases.mdの合成ログを使います。合成handoffと合成ログは実際のGitHub/CI実行証拠ではありません。前工程成果物がないときに、公開handoffをM08修了の証明として扱いません。

## 手順

1. 本人のM08成果物を使うか、合成handoffを前工程契約の代替入力として使うかを記録します。`TRAINING-*`を実在IDや修了記録と読み替えません。
2. course/templates/phase3/course-e2e.workflow.yml.disabledを読み、Trigger、権限、PR HEAD、事前ビルド済みShopのServe、Browser、Test、Artifactを特定します。
3. workspace/M09/course-e2e.workflow.yml.disabledを完成見本と比較します。github.shaによるcheckoutがPR HEADを保証しないこと、Browser導入と対象SHA/結果Artifactの対応が欠けていることを説明します。受講者workflowに`build:web`を追加しないことも確認します。
4. workspace内の案を修正し、PRのhead SHAをcheckout・記録し、必要なBrowserと`PLAYWRIGHT_TEST_ROOT: workspace/M07`の新課程専用specを実行し、同じRunの証拠をArtifactにします。
5. permissions: contents: readを基本にし、Secret不要、deployなし、対象spec限定の理由を記録します。
6. 修正後のworkflow案は.disabledを保ち、.github/workflows/へ移動・有効化しません。Templateにも自動配置しません。
7. PR HEAD、Run、Check、Artifact、Artifact内のtarget-sha.txtを対応付けます。未実行ならその証拠は未確認と記録します。
8. 合成ログのBuild失敗、Test失敗、Artifact未生成を区別し、最初に調べるstepを選びます。Runner条件・料金の未確認事項も分けます。
9. 本人の非公開repoを想定し、PR更新の回数、選択するRunner、対象spec、利用枠の確認先を記録します。手動triggerへ変更した場合の費用と未検証期間を比較し、失敗時に停止または再実行する条件を説明します。
10. 提案されたworkflowに書込権限やSecretがある場合、それぞれの必要性を確認して不要な権限を除きます。別のCIを同時に起動する変更条件でも、対象と権限を再確認します。

## 提出物

workspace/M09/submission.mdにworkflowの読解、最小権限、証拠対応、ログ分類、未確認事項を記録します。修正した.disabled workflow案はworkspace/M09/course-e2e.workflow.yml.disabledに残し、M10への独立した成果物として引き継ぎます。実際にRunがないときは、Run/Check/Artifactを実行済みと報告しません。

## 理解ノード別の確認

既存のworkflow設計・実Runの証拠を利用して次の能力を個別に確認し、本人が未実行の場合は未確認として記録してください。

- **K-M09-06**：event・job・step・Runnerと対象specの関係を読み、workflowを修正できる
- **K-M09-07**：trigger頻度、検証範囲、費用、未検証期間の関係から安全な実行方針を選べる

## 反復実践 P01〜P06：CIの設計条件を変える

既定の無効化workflowを安全な作業領域で比較・修正します。M09では実行せず、合成ログを本物のCI結果とみなしません。

1. **P01** `workflow-starter.yml.disabled`のtrigger・job・step・runner・権限を読解し、足りない設定を完成見本と比較する（M09-01）。
2. **P02** PR head SHAのcheckoutとArtifactの`target-sha.txt`を対応付け、別SHAの成功を現在の確認と呼ばない（M09-02）。
3. **P03** `failure-cases.md`からBuild、Browser準備、Test、Artifact保存の各段階を分類し、最初に調べるstepを選ぶ（M09-03）。
4. **P04** pushごとに実行する案と手動起動案を、検証頻度・実行対象・利用枠・未検証期間で比較する（M09-04）。
5. **P05** 書込み権限やSecretを追加するAI案を、必要な操作と照合して採否する。無関係なworkflowやdeployは含めない（M09-05）。
6. **P06** 対象specが増える場合、Runnerが変わる場合、料金条件が不明になる場合に、起動条件と停止条件をそれぞれ設計し直す（M09-01〜05）。

各課題で判断前後のworkflow差分・理由・条件を`submission.md`へ残します。完成案は引き続き`.disabled`を維持してM10へ渡します。
