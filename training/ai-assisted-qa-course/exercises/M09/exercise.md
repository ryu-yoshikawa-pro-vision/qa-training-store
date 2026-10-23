# M09 実技：CI workflow案の修正と証拠の読解

## 入力

workspace/M09/public-sample/handoff.mdの合成branch/commit/PR履歴か、契約を満たす本人のM08成果物、安全な完成見本、未完成のworkspace案、workspace/M09/failure-cases.mdの合成ログを使います。合成handoffと合成ログは実際のGitHub/CI実行証拠ではありません。前工程成果物がないときに、公開handoffをM08修了の証明として扱いません。

## 手順

1. 本人のM08成果物を使うか、合成handoffを前工程契約の代替入力として使うかを記録します。`TRAINING-*`を実在IDや修了記録と読み替えません。
2. course/templates/phase3/course-e2e.workflow.yml.disabledを読み、Trigger、権限、PR HEAD、Build、Browser、Test、Artifactを特定します。
3. workspace/M09/course-e2e.workflow.yml.disabledを完成見本と比較します。github.shaによるcheckoutがPR HEADを保証しないこと、Browser導入と対象SHA/結果Artifactの対応が欠けていることを説明します。
4. workspace内の案を修正し、PRのhead SHAをcheckout・記録し、必要なBrowserと新課程専用specを実行し、同じRunの証拠をArtifactにします。
5. permissions: contents: readを基本にし、Secret不要、deployなし、対象spec限定の理由を記録します。
6. 修正後のworkflow案は.disabledを保ち、.github/workflows/へ移動・有効化しません。Templateにも自動配置しません。
7. PR HEAD、Run、Check、Artifact、Artifact内のtarget-sha.txtを対応付けます。未実行ならその証拠は未確認と記録します。
8. 合成ログのBuild失敗、Test失敗、Artifact未生成を区別し、最初に調べるstepを選びます。Runner条件・料金の未確認事項も分けます。

## 提出物

workspace/M09/submission.mdにworkflowの読解、最小権限、証拠対応、ログ分類、未確認事項を記録します。修正した.disabled workflow案はworkspace/M09/course-e2e.workflow.yml.disabledに残し、M10への独立した成果物として引き継ぎます。実際にRunがないときは、Run/Check/Artifactを実行済みと報告しません。
